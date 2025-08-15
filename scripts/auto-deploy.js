#!/usr/bin/env node

/**
 * 自动化Vercel部署脚本
 * 包含构建检查、环境变量验证、部署执行和功能验证
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AutoDeployer {
  constructor() {
    this.projectRoot = process.cwd();
    this.deploymentUrl = null;
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '✅',
      warn: '⚠️',
      error: '❌',
      progress: '🔄'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async checkPrerequisites() {
    this.log('检查部署前置条件...', 'progress');
    
    // 检查Vercel CLI
    try {
      execSync('vercel --version', { stdio: 'pipe' });
      this.log('Vercel CLI 已安装');
    } catch (error) {
      this.errors.push('Vercel CLI 未安装，请运行: npm install -g vercel');
      return false;
    }

    // 检查项目配置文件
    const requiredFiles = ['package.json', 'vercel.json', '.env'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(this.projectRoot, file))) {
        this.errors.push(`缺少必要文件: ${file}`);
      }
    }

    // 检查环境变量
    if (!process.env.VERCEL_TOKEN && !fs.existsSync(path.join(process.env.HOME || process.env.USERPROFILE, '.vercel'))) {
      this.warnings.push('未检测到Vercel认证，可能需要运行: vercel login');
    }

    return this.errors.length === 0;
  }

  async runBuildCheck() {
    this.log('执行构建检查...', 'progress');
    
    try {
      // 安装依赖
      this.log('安装项目依赖...');
      execSync('npm install', { stdio: 'inherit', cwd: this.projectRoot });
      
      // 运行类型检查
      this.log('执行TypeScript类型检查...');
      try {
        execSync('npm run check', { stdio: 'pipe', cwd: this.projectRoot });
        this.log('类型检查通过');
      } catch (error) {
        this.log('类型检查发现问题，但继续部署...', 'warn');
        this.warnings.push('TypeScript类型检查失败');
      }
      
      // 测试构建
      this.log('测试项目构建...');
      execSync('npm run build', { stdio: 'inherit', cwd: this.projectRoot });
      this.log('构建测试成功');
      
      return true;
    } catch (error) {
      this.errors.push(`构建失败: ${error.message}`);
      return false;
    }
  }

  async validateEnvironment() {
    this.log('验证环境变量配置...', 'progress');
    
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET'
    ];

    // 检查本地环境变量
    const envFile = path.join(this.projectRoot, '.env');
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      const missingVars = requiredEnvVars.filter(varName => 
        !envContent.includes(`${varName}=`)
      );
      
      if (missingVars.length > 0) {
        this.warnings.push(`本地环境变量缺失: ${missingVars.join(', ')}`);
      } else {
        this.log('本地环境变量配置完整');
      }
    }

    return true;
  }

  async deployToVercel() {
    this.log('开始部署到Vercel...', 'progress');
    
    return new Promise((resolve, reject) => {
      const deployProcess = spawn('vercel', ['--prod', '--yes'], {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      deployProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        // 实时显示部署进度
        if (text.includes('Deploying')) {
          this.log('正在部署项目...');
        } else if (text.includes('Building')) {
          this.log('正在构建项目...');
        } else if (text.includes('https://')) {
          const urlMatch = text.match(/https:\/\/[^\s]+/);
          if (urlMatch) {
            this.deploymentUrl = urlMatch[0].trim();
            this.log(`部署成功! URL: ${this.deploymentUrl}`);
          }
        }
      });

      deployProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      deployProcess.on('close', (code) => {
        if (code === 0) {
          // 从输出中提取部署URL
          if (!this.deploymentUrl) {
            const urlMatch = output.match(/https:\/\/[^\s]+/);
            if (urlMatch) {
              this.deploymentUrl = urlMatch[0].trim();
            }
          }
          resolve(true);
        } else {
          this.errors.push(`部署失败 (退出码: ${code}): ${errorOutput}`);
          reject(new Error(`部署失败: ${errorOutput}`));
        }
      });

      deployProcess.on('error', (error) => {
        this.errors.push(`部署进程错误: ${error.message}`);
        reject(error);
      });
    });
  }

  async verifyDeployment() {
    if (!this.deploymentUrl) {
      this.warnings.push('无法获取部署URL，跳过验证');
      return true;
    }

    this.log('验证部署功能...', 'progress');
    
    const testEndpoints = [
      { path: '/api/health', name: '健康检查' },
      { path: '/api/env-check/quick', name: '环境变量快速检查' },
      { path: '/api/debug', name: '调试接口' }
    ];

    for (const endpoint of testEndpoints) {
      try {
        await this.testEndpoint(`${this.deploymentUrl}${endpoint.path}`, endpoint.name);
      } catch (error) {
        this.warnings.push(`${endpoint.name}验证失败: ${error.message}`);
      }
    }

    return true;
  }

  testEndpoint(url, name) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode === 200) {
            this.log(`${name} - 状态正常 (${response.statusCode})`);
            resolve(data);
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${data}`));
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('请求超时'));
      });
    });
  }

  async generateReport() {
    this.log('生成部署报告...', 'progress');
    
    const report = {
      timestamp: new Date().toISOString(),
      deploymentUrl: this.deploymentUrl,
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        deploymentStatus: this.deploymentUrl ? '成功' : '失败'
      }
    };

    // 保存报告到文件
    const reportPath = path.join(this.projectRoot, 'deployment-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // 显示摘要
    console.log('\n' + '='.repeat(60));
    console.log('📋 部署报告摘要');
    console.log('='.repeat(60));
    console.log(`🕐 部署时间: ${report.timestamp}`);
    console.log(`🌐 部署URL: ${report.deploymentUrl || '未获取到'}`);
    console.log(`✅ 部署状态: ${report.summary.deploymentStatus}`);
    console.log(`❌ 错误数量: ${report.summary.totalErrors}`);
    console.log(`⚠️  警告数量: ${report.summary.totalWarnings}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ 错误详情:');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告详情:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }
    
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
    console.log('='.repeat(60));
    
    return report;
  }

  async run() {
    console.log('🚀 开始自动化Vercel部署流程\n');
    
    try {
      // 1. 检查前置条件
      if (!(await this.checkPrerequisites())) {
        throw new Error('前置条件检查失败');
      }
      
      // 2. 构建检查
      if (!(await this.runBuildCheck())) {
        throw new Error('构建检查失败');
      }
      
      // 3. 环境变量验证
      await this.validateEnvironment();
      
      // 4. 执行部署
      await this.deployToVercel();
      
      // 5. 验证部署
      await this.verifyDeployment();
      
      // 6. 生成报告
      const report = await this.generateReport();
      
      if (report.success) {
        this.log('🎉 自动化部署完成!', 'info');
        process.exit(0);
      } else {
        this.log('⚠️  部署完成但存在问题，请查看报告', 'warn');
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`💥 部署失败: ${error.message}`, 'error');
      await this.generateReport();
      process.exit(1);
    }
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployer = new AutoDeployer();
  deployer.run().catch(console.error);
}

export default AutoDeployer;