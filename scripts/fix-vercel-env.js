#!/usr/bin/env node

/**
 * Vercel环境变量修复脚本
 * 自动从本地.env文件读取并设置到Vercel项目
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class VercelEnvFixer {
  constructor() {
    this.projectRoot = path.dirname(__dirname);
    this.envFile = path.join(this.projectRoot, '.env');
    this.requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY', 
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET'
    ];
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

  readEnvFile() {
    if (!fs.existsSync(this.envFile)) {
      throw new Error(`环境变量文件不存在: ${this.envFile}`);
    }

    const envContent = fs.readFileSync(this.envFile, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });

    return envVars;
  }

  async checkVercelCli() {
    try {
      execSync('vercel --version', { stdio: 'pipe' });
      this.log('Vercel CLI 已安装');
      return true;
    } catch (error) {
      this.log('Vercel CLI 未安装，正在安装...', 'progress');
      try {
        execSync('npm install -g vercel', { stdio: 'inherit' });
        this.log('Vercel CLI 安装成功');
        return true;
      } catch (installError) {
        throw new Error('Vercel CLI 安装失败');
      }
    }
  }

  async setEnvironmentVariables(envVars) {
    this.log('开始设置Vercel环境变量...', 'progress');
    
    const missingVars = [];
    const setVars = [];
    
    for (const varName of this.requiredVars) {
      if (envVars[varName]) {
        try {
          // 设置生产环境变量
          const command = `vercel env add ${varName} production`;
          this.log(`设置 ${varName}...`);
          
          // 使用echo来传递环境变量值
          execSync(`echo "${envVars[varName]}" | ${command}`, { 
            stdio: ['pipe', 'inherit', 'inherit'],
            cwd: this.projectRoot 
          });
          
          setVars.push(varName);
        } catch (error) {
          // 如果变量已存在，尝试更新
          try {
            const removeCommand = `vercel env rm ${varName} production --yes`;
            execSync(removeCommand, { stdio: 'pipe', cwd: this.projectRoot });
            
            const addCommand = `vercel env add ${varName} production`;
            execSync(`echo "${envVars[varName]}" | ${addCommand}`, { 
              stdio: ['pipe', 'inherit', 'inherit'],
              cwd: this.projectRoot 
            });
            
            setVars.push(varName);
            this.log(`更新 ${varName} 成功`);
          } catch (updateError) {
            this.log(`设置 ${varName} 失败: ${updateError.message}`, 'warn');
          }
        }
      } else {
        missingVars.push(varName);
      }
    }
    
    // 设置NODE_ENV
    try {
      execSync('echo "production" | vercel env add NODE_ENV production', { 
        stdio: ['pipe', 'inherit', 'inherit'],
        cwd: this.projectRoot 
      });
      setVars.push('NODE_ENV');
    } catch (error) {
      // NODE_ENV可能已存在，忽略错误
    }
    
    return { setVars, missingVars };
  }

  async redeployProject() {
    this.log('重新部署项目以应用环境变量...', 'progress');
    
    try {
      const output = execSync('vercel --prod --yes', { 
        stdio: 'pipe',
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
      
      // 提取部署URL
      const urlMatch = output.match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        const deployUrl = urlMatch[0].trim();
        this.log(`重新部署成功: ${deployUrl}`);
        return deployUrl;
      }
      
      this.log('重新部署成功');
      return null;
    } catch (error) {
      throw new Error(`重新部署失败: ${error.message}`);
    }
  }

  async verifyEnvironment(deployUrl) {
    if (!deployUrl) {
      this.log('无部署URL，跳过验证', 'warn');
      return false;
    }
    
    this.log('验证环境变量设置...', 'progress');
    
    // 等待部署完成
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    try {
      const { default: https } = await import('https');
      
      return new Promise((resolve) => {
        const url = `${deployUrl}/api/env-check/quick`;
        const request = https.get(url, (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            if (response.statusCode === 200) {
              try {
                const result = JSON.parse(data);
                this.log(`环境变量验证成功: ${result.message || '所有变量已正确设置'}`);
                resolve(true);
              } catch (parseError) {
                this.log('环境变量验证响应解析失败', 'warn');
                resolve(false);
              }
            } else {
              this.log(`环境变量验证失败: HTTP ${response.statusCode}`, 'warn');
              resolve(false);
            }
          });
        });
        
        request.on('error', (error) => {
          this.log(`环境变量验证请求失败: ${error.message}`, 'warn');
          resolve(false);
        });
        
        request.setTimeout(15000, () => {
          request.destroy();
          this.log('环境变量验证请求超时', 'warn');
          resolve(false);
        });
      });
    } catch (error) {
      this.log(`环境变量验证失败: ${error.message}`, 'warn');
      return false;
    }
  }

  async run() {
    console.log('🔧 开始修复Vercel环境变量\n');
    
    try {
      // 1. 检查Vercel CLI
      await this.checkVercelCli();
      
      // 2. 读取本地环境变量
      this.log('读取本地环境变量...', 'progress');
      const envVars = this.readEnvFile();
      this.log(`读取到 ${Object.keys(envVars).length} 个环境变量`);
      
      // 3. 设置Vercel环境变量
      const { setVars, missingVars } = await this.setEnvironmentVariables(envVars);
      
      // 4. 重新部署
      const deployUrl = await this.redeployProject();
      
      // 5. 验证环境变量
      const verifySuccess = await this.verifyEnvironment(deployUrl);
      
      // 6. 生成报告
      console.log('\n' + '='.repeat(60));
      console.log('🔧 环境变量修复报告');
      console.log('='.repeat(60));
      console.log(`✅ 成功设置变量: ${setVars.length} 个`);
      if (setVars.length > 0) {
        console.log(`   - ${setVars.join(', ')}`);
      }
      
      if (missingVars.length > 0) {
        console.log(`⚠️  缺失变量: ${missingVars.length} 个`);
        console.log(`   - ${missingVars.join(', ')}`);
      }
      
      console.log(`🌐 部署URL: ${deployUrl || '未获取到'}`);
      console.log(`✅ 环境验证: ${verifySuccess ? '成功' : '失败'}`);
      console.log('='.repeat(60));
      
      if (setVars.length > 0 && verifySuccess) {
        this.log('🎉 环境变量修复完成!', 'info');
        process.exit(0);
      } else {
        this.log('⚠️  修复完成但可能存在问题', 'warn');
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`💥 修复失败: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new VercelEnvFixer();
  fixer.run().catch(console.error);
}

export default VercelEnvFixer;