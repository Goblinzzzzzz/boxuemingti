#!/usr/bin/env node
/**
 * AI服务诊断脚本
 * 自动检测AI服务配置问题并提供解决方案
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

class AIServiceDiagnostic {
  constructor() {
    this.issues = [];
    this.recommendations = [];
  }

  /**
   * 运行完整诊断
   */
  async runDiagnostic() {
    console.log('🔍 开始AI服务诊断...');
    console.log('=' .repeat(50));

    // 检查环境变量
    this.checkEnvironmentVariables();
    
    // 检查配置文件
    this.checkConfigFiles();
    
    // 检查API服务状态
    await this.checkAPIServiceStatus();
    
    // 测试AI生成功能
    await this.testAIGeneration();
    
    // 生成报告
    this.generateReport();
  }

  /**
   * 检查环境变量配置
   */
  checkEnvironmentVariables() {
    console.log('\n📋 检查环境变量配置...');
    
    const requiredVars = {
      'AI_PROVIDER': process.env.AI_PROVIDER,
      'SUPABASE_URL': process.env.SUPABASE_URL,
      'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
      'JWT_SECRET': process.env.JWT_SECRET
    };

    // 检查基础环境变量
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value) {
        this.issues.push(`❌ 缺少环境变量: ${key}`);
        this.recommendations.push(`请在.env文件中设置 ${key}`);
      } else {
        console.log(`✅ ${key}: 已设置`);
      }
    }

    // 检查AI服务商特定配置
    const provider = process.env.AI_PROVIDER || 'doubao';
    console.log(`\n🤖 当前AI服务商: ${provider.toUpperCase()}`);
    
    const providerConfigs = {
      'doubao': ['DOUBAO_API_KEY', 'DOUBAO_MODEL'],
      'deepseek': ['DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL'],
      'dmxapi': ['DMXAPI_API_KEY', 'DMXAPI_MODEL'],
      'openai': ['OPENAI_API_KEY', 'OPENAI_MODEL']
    };

    const requiredKeys = providerConfigs[provider] || [];
    for (const key of requiredKeys) {
      const value = process.env[key];
      if (!value) {
        this.issues.push(`❌ ${provider.toUpperCase()}服务缺少配置: ${key}`);
        this.recommendations.push(`请在.env文件中设置 ${key}`);
      } else {
        console.log(`✅ ${key}: 已设置`);
      }
    }
  }

  /**
   * 检查配置文件
   */
  checkConfigFiles() {
    console.log('\n📁 检查配置文件...');
    
    const configFiles = [
      { path: '../.env', name: '环境变量文件' },
      { path: '../package.json', name: 'Package配置' },
      { path: '../nodemon.json', name: 'Nodemon配置' }
    ];

    for (const config of configFiles) {
      const fullPath = path.join(__dirname, config.path);
      if (fs.existsSync(fullPath)) {
        console.log(`✅ ${config.name}: 存在`);
      } else {
        this.issues.push(`❌ 缺少配置文件: ${config.name}`);
        this.recommendations.push(`请创建 ${config.path} 文件`);
      }
    }
  }

  /**
   * 检查API服务状态
   */
  async checkAPIServiceStatus() {
    console.log('\n🌐 检查API服务状态...');
    
    try {
      const response = await fetch('http://localhost:3003/api/health');
      if (response.ok) {
        console.log('✅ 后端API服务: 运行正常');
        
        // 检查AI状态接口
        const aiStatusResponse = await fetch('http://localhost:3003/api/generation/ai-status');
        if (aiStatusResponse.ok) {
          const aiStatus = await aiStatusResponse.json();
          console.log('✅ AI状态接口: 可访问');
          console.log(`   - 服务商: ${aiStatus.data?.provider || '未知'}`);
          console.log(`   - 模型: ${aiStatus.data?.model || '未知'}`);
          console.log(`   - 可用性: ${aiStatus.data?.available ? '可用' : '不可用'}`);
          
          if (!aiStatus.data?.available) {
            this.issues.push('❌ AI服务不可用');
            this.recommendations.push('检查API密钥配置和网络连接');
          }
        } else {
          this.issues.push('❌ AI状态接口无法访问');
          this.recommendations.push('检查后端路由配置');
        }
      } else {
        this.issues.push('❌ 后端API服务无响应');
        this.recommendations.push('启动后端服务: npm run server:dev');
      }
    } catch (error) {
      this.issues.push(`❌ API服务连接失败: ${error.message}`);
      this.recommendations.push('确保后端服务正在运行在端口3003');
    }
  }

  /**
   * 测试AI生成功能
   */
  async testAIGeneration() {
    console.log('\n🧪 测试AI生成功能...');
    
    try {
      const testData = {
        content: '测试内容：人力资源管理基础知识',
        questionType: '单选题',
        difficulty: '易'
      };

      const response = await fetch('http://localhost:3003/api/generation/test-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('✅ AI生成功能: 正常工作');
          console.log(`   - 生成题干: ${result.data.stem?.substring(0, 50)}...`);
          console.log(`   - 选项数量: ${Object.keys(result.data.options || {}).length}`);
          console.log(`   - 质量评分: ${result.data.quality_score || 'N/A'}`);
        } else {
          this.issues.push('❌ AI生成返回异常数据');
          this.recommendations.push('检查AI服务配置和API响应格式');
        }
      } else {
        const errorText = await response.text();
        this.issues.push(`❌ AI生成测试失败: HTTP ${response.status}`);
        this.recommendations.push(`检查错误信息: ${errorText}`);
      }
    } catch (error) {
      this.issues.push(`❌ AI生成测试异常: ${error.message}`);
      this.recommendations.push('检查网络连接和服务配置');
    }
  }

  /**
   * 生成诊断报告
   */
  generateReport() {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 诊断报告');
    console.log('=' .repeat(50));

    if (this.issues.length === 0) {
      console.log('\n🎉 恭喜！AI服务配置完全正常，没有发现任何问题。');
    } else {
      console.log(`\n⚠️  发现 ${this.issues.length} 个问题:`);
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });

      console.log('\n💡 建议解决方案:');
      this.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log('\n📚 更多帮助:');
    console.log('- 查看 AI服务配置说明.md');
    console.log('- 查看 DMXAPI配置说明.md');
    console.log('- 运行 npm run server:dev 启动后端服务');
    console.log('- 访问 http://localhost:5173 查看前端应用');
  }
}

// 运行诊断
const diagnostic = new AIServiceDiagnostic();
diagnostic.runDiagnostic().catch(error => {
  console.error('诊断过程中发生错误:', error);
  process.exit(1);
});