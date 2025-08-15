/**
 * AI模型状态测试脚本
 * 使用测试账号zhaodan@ke.com测试所有已配置AI模型的可用状态
 */

import fetch from 'node-fetch';

// 测试配置
const TEST_CONFIG = {
  baseURL: 'http://localhost:3003',
  email: 'zhaodan@ke.com',
  password: '123456'
};

// 已配置的AI提供商和模型
const AI_PROVIDERS = {
  dmxapi: {
    name: 'DMXAPI',
    models: ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-pro']
  },
  doubao: {
    name: '豆包',
    models: ['ep-20241230140648-8xzpz']
  },
  deepseek: {
    name: 'DeepSeek',
    models: ['deepseek-chat']
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-3.5-turbo', 'gpt-4']
  }
};

// 测试用教材内容
const TEST_MATERIAL = `
人力资源管理是指运用现代管理方法，对人力资源的获取（选人）、开发（育人）、保持（留人）和利用（用人）等方面所进行的计划、组织、指挥、控制和协调等一系列活动，最终达到实现组织目标的一种管理行为。

人力资源管理的基本职能包括：
1. 人力资源规划：根据组织的战略目标，预测未来的人力资源需求
2. 招聘与选拔：通过科学的方法选择合适的人才
3. 培训与开发：提升员工的知识、技能和能力
4. 绩效管理：建立科学的绩效评价体系
5. 薪酬管理：设计合理的薪酬激励制度
6. 劳动关系管理：处理劳资关系，维护和谐的工作环境

现代人力资源管理强调以人为本，注重员工的全面发展，通过有效的人力资源管理实践，提高组织的竞争力和可持续发展能力。
`;

class AIModelTester {
  constructor() {
    this.token = null;
    this.testResults = [];
  }

  // 登录获取token
  async login() {
    console.log('🔐 正在使用测试账号登录...');
    console.log(`📧 邮箱: ${TEST_CONFIG.email}`);
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: TEST_CONFIG.email,
          password: TEST_CONFIG.password
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`登录失败: ${data.message || response.statusText}`);
      }

      if (data.access_token) {
        this.token = data.access_token;
        console.log('✅ 登录成功');
        console.log(`👤 用户: ${data.user?.email || '未知'}`);
        console.log(`🔑 Token: ${this.token.substring(0, 20)}...`);
        return true;
      } else {
        throw new Error('未获取到访问令牌');
      }
    } catch (error) {
      console.error('❌ 登录失败:', error.message);
      return false;
    }
  }

  // 获取AI服务状态
  async getAIStatus() {
    console.log('\n📊 获取AI服务状态...');
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseURL}/api/ai/status`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`获取AI状态失败: ${data.message || response.statusText}`);
      }

      console.log('✅ AI服务状态:');
      console.log(`   当前提供商: ${data.provider}`);
      console.log(`   当前模型: ${data.model}`);
      console.log(`   可用状态: ${data.available ? '✅' : '❌'}`);
      console.log(`   API密钥: ${data.hasApiKey ? '✅' : '❌'}`);
      console.log(`   状态信息: ${data.message}`);
      
      return data;
    } catch (error) {
      console.error('❌ 获取AI状态失败:', error.message);
      return null;
    }
  }

  // 获取所有AI提供商
  async getAIProviders() {
    console.log('\n🔍 获取AI提供商列表...');
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseURL}/api/ai/providers`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`获取提供商列表失败: ${data.message || response.statusText}`);
      }

      console.log('✅ 可用的AI提供商:');
      data.providers.forEach(provider => {
        console.log(`   📦 ${provider.displayName} (${provider.name})`);
        console.log(`      API地址: ${provider.baseURL}`);
        console.log(`      模型数量: ${provider.models.length}`);
        provider.models.forEach(model => {
          console.log(`        - ${model.displayName} (${model.id})`);
        });
      });
      
      return data.providers;
    } catch (error) {
      console.error('❌ 获取提供商列表失败:', error.message);
      return [];
    }
  }

  // 切换AI模型
  async switchModel(provider, model) {
    console.log(`\n🔄 切换到 ${provider} - ${model}...`);
    
    try {
      const response = await fetch(`${TEST_CONFIG.baseURL}/api/ai/switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: provider,
          model: model
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`切换模型失败: ${data.message || response.statusText}`);
      }

      if (data.success) {
        console.log(`✅ ${data.message}`);
        return true;
      } else {
        throw new Error(data.message || '切换失败');
      }
    } catch (error) {
      console.error(`❌ 切换模型失败: ${error.message}`);
      return false;
    }
  }

  // 测试试题生成
  async testQuestionGeneration(provider, model) {
    console.log(`\n🧪 测试 ${provider} - ${model} 试题生成...`);
    
    const testResult = {
      provider,
      model,
      success: false,
      error: null,
      responseTime: 0,
      questionGenerated: false
    };

    const startTime = Date.now();
    
    try {
      // 先切换到指定模型
      const switchSuccess = await this.switchModel(provider, model);
      if (!switchSuccess) {
        testResult.error = '模型切换失败';
        return testResult;
      }

      // 测试试题生成
      const response = await fetch(`${TEST_CONFIG.baseURL}/api/generation/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: TEST_MATERIAL,
          questionType: '单选题',
          difficulty: '中',
          knowledgePoint: '人力资源管理基础',
          count: 1
        })
      });

      testResult.responseTime = Date.now() - startTime;
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`生成试题失败: ${data.message || response.statusText}`);
      }

      if (data.questions && data.questions.length > 0) {
        const question = data.questions[0];
        console.log('✅ 试题生成成功:');
        console.log(`   题干: ${question.stem?.substring(0, 50)}...`);
        console.log(`   选项数量: ${Object.keys(question.options || {}).length}`);
        console.log(`   正确答案: ${question.correct_answer}`);
        console.log(`   响应时间: ${testResult.responseTime}ms`);
        
        testResult.success = true;
        testResult.questionGenerated = true;
      } else {
        throw new Error('未生成任何试题');
      }
    } catch (error) {
      console.error(`❌ 试题生成失败: ${error.message}`);
      testResult.error = error.message;
      testResult.responseTime = Date.now() - startTime;
    }

    this.testResults.push(testResult);
    return testResult;
  }

  // 运行完整测试
  async runFullTest() {
    console.log('🚀 开始AI模型状态测试\n');
    console.log('=' .repeat(60));
    
    // 1. 登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('\n❌ 测试终止：登录失败');
      return;
    }

    // 2. 获取AI状态
    await this.getAIStatus();

    // 3. 获取提供商列表
    const providers = await this.getAIProviders();

    // 4. 测试每个模型
    console.log('\n🧪 开始测试各个AI模型...');
    console.log('=' .repeat(60));
    
    for (const [providerKey, providerInfo] of Object.entries(AI_PROVIDERS)) {
      console.log(`\n📦 测试提供商: ${providerInfo.name}`);
      
      for (const model of providerInfo.models) {
        await this.testQuestionGeneration(providerKey, model);
        
        // 等待一秒避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 5. 生成测试报告
    this.generateReport();
  }

  // 生成测试报告
  generateReport() {
    console.log('\n📋 AI模型测试报告');
    console.log('=' .repeat(60));
    
    const successCount = this.testResults.filter(r => r.success).length;
    const totalCount = this.testResults.length;
    
    console.log(`\n📊 总体统计:`);
    console.log(`   总测试数: ${totalCount}`);
    console.log(`   成功数: ${successCount}`);
    console.log(`   失败数: ${totalCount - successCount}`);
    console.log(`   成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    console.log(`\n✅ 正常工作的模型:`);
    this.testResults.filter(r => r.success).forEach(result => {
      console.log(`   - ${result.provider}/${result.model} (${result.responseTime}ms)`);
    });
    
    console.log(`\n❌ 有问题的模型:`);
    this.testResults.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.provider}/${result.model}: ${result.error}`);
    });
    
    console.log(`\n🔧 建议修复措施:`);
    const failedResults = this.testResults.filter(r => !r.success);
    if (failedResults.length === 0) {
      console.log('   所有模型工作正常，无需修复。');
    } else {
      failedResults.forEach(result => {
        console.log(`   - ${result.provider}/${result.model}:`);
        if (result.error.includes('API密钥')) {
          console.log('     检查环境变量中的API密钥配置');
        } else if (result.error.includes('网络') || result.error.includes('连接')) {
          console.log('     检查网络连接和API地址配置');
        } else if (result.error.includes('模型')) {
          console.log('     验证模型名称是否正确');
        } else {
          console.log('     检查API服务状态和配置');
        }
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 测试完成');
  }
}

// 运行测试
const tester = new AIModelTester();
tester.runFullTest().catch(error => {
  console.error('💥 测试过程中发生错误:', error);
  process.exit(1);
});

export default AIModelTester;