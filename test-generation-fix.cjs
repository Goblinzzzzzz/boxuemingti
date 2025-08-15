const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 测试配置
const BASE_URL = 'http://localhost:3003';
const TEST_USER = {
  email: 'zhaodab@ke.com',
  password: '123456'
};

// 测试用例配置
const TEST_CASES = [
  {
    name: 'GPT-5-Mini 生成5道单选题',
    config: {
      questionCount: 5,
      questionTypes: ['单选题'],
      difficulty: 'easy',
      knowledgePoints: ['数学基础'],
      aiModel: 'gpt-5-mini'
    }
  },
  {
    name: 'Claude Opus 生成3道多选题',
    config: {
      questionCount: 3,
      questionTypes: ['多选题'],
      difficulty: 'medium',
      knowledgePoints: ['逻辑推理'],
      aiModel: 'claude-opus-4-20250514-ssvip'
    }
  },
  {
    name: 'Gemini 2.5 Pro 生成4道判断题',
    config: {
      questionCount: 4,
      questionTypes: ['判断题'],
      difficulty: 'hard',
      knowledgePoints: ['综合应用'],
      aiModel: 'gemini-2.5-pro'
    }
  }
];

class GenerationTester {
  constructor() {
    this.authToken = null;
    this.testResults = [];
  }

  async login() {
    try {
      console.log('🔐 正在登录测试账号...');
      const response = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
      
      if (response.data.success && response.data.access_token) {
        this.authToken = response.data.access_token;
        console.log('✅ 登录成功');
        console.log(`   用户: ${response.data.user.name}`);
        console.log(`   角色: ${response.data.user.roles.join(', ')}`);
        return true;
      } else {
        console.error('❌ 登录失败:', response.data.message || '未知错误');
        if (response.data.error) {
          console.log('   错误详情:', response.data.error.message);
        }
        return false;
      }
    } catch (error) {
      console.error('❌ 登录请求失败:', error.response?.data || error.message);
      return false;
    }
  }

  async getTestMaterialId() {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/materials`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        }
      );
      
      if (response.data.success && response.data.data.length > 0) {
        const material = response.data.data[0]; // 使用第一个教材
        console.log(`📚 使用教材: ${material.title} (ID: ${material.id})`);
        return material.id;
      } else {
        console.error('❌ 未找到可用教材');
        return null;
      }
    } catch (error) {
      console.error('❌ 获取教材列表失败:', error.response?.data || error.message);
      return null;
    }
  }

  async switchAIModel(modelId) {
    try {
      console.log(`🔄 切换AI模型: ${modelId}`);
      
      const response = await axios.post(
        `${BASE_URL}/api/ai/switch`,
        { 
          provider: 'dmxapi',
          model: modelId 
        },
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        console.log('✅ 模型切换成功');
        console.log(`   当前提供商: ${response.data.currentProvider}`);
        console.log(`   当前模型: ${response.data.currentModel}`);
        return true;
      } else {
        console.log('❌ 模型切换失败:', response.data.message || response.data.error);
        return false;
      }
    } catch (error) {
      console.log('❌ 切换模型请求失败:', error.response?.data || error.message);
      return false;
    }
  }

  async createGenerationTask(config) {
    try {
      console.log(`📝 创建生成任务: ${config.questionCount}道${config.questionTypes[0]}`);
      
      // 获取测试教材ID
      const materialId = await this.getTestMaterialId();
      if (!materialId) {
        console.error('❌ 无法获取测试教材ID');
        return null;
      }
      
      const response = await axios.post(
        `${BASE_URL}/api/generation/tasks`,
        {
          materialId: materialId,
          questionCount: config.questionCount,
          questionTypes: config.questionTypes,
          difficulty: config.difficulty,
          knowledgePoints: config.knowledgePoints
        },
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success && response.data.data.id) {
        console.log(`✅ 任务创建成功，ID: ${response.data.data.id}`);
        return response.data.data.id;
      } else {
        console.error('❌ 任务创建失败:', response.data);
        return null;
      }
    } catch (error) {
      console.error('❌ 创建任务请求失败:', error.response?.data || error.message);
      return null;
    }
  }

  async monitorTask(taskId, maxWaitTime = 120000) {
    const startTime = Date.now();
    let lastProgress = -1;
    
    console.log(`⏳ 监控任务进度: ${taskId}`);
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(
          `${BASE_URL}/api/generation/tasks/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.authToken}`
            }
          }
        );
        
        if (response.data.success) {
          const task = response.data.data;
          const progress = task.parameters?.progress || 0;
          
          if (progress !== lastProgress) {
            console.log(`📊 任务进度: ${progress}%`);
            lastProgress = progress;
          }
          
          if (task.status === 'completed') {
            console.log('✅ 任务完成!');
            return {
              success: true,
              result: task.result,
              duration: Date.now() - startTime
            };
          } else if (task.status === 'failed') {
            console.log('❌ 任务失败!');
            return {
              success: false,
              error: task.result?.error || '未知错误',
              duration: Date.now() - startTime
            };
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('❌ 监控任务失败:', error.response?.data || error.message);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return {
      success: false,
      error: '任务超时',
      duration: maxWaitTime
    };
  }

  async runTestCase(testCase) {
    console.log(`\n🧪 开始测试: ${testCase.name}`);
    console.log('=' .repeat(50));
    
    const startTime = Date.now();
    
    try {
      // 切换AI模型
      const modelSwitched = await this.switchAIModel(testCase.config.aiModel);
      if (!modelSwitched) {
        return {
          testName: testCase.name,
          success: false,
          error: '模型切换失败',
          duration: Date.now() - startTime
        };
      }
      
      // 创建生成任务
      const taskId = await this.createGenerationTask(testCase.config);
      if (!taskId) {
        return {
          testName: testCase.name,
          success: false,
          error: '任务创建失败',
          duration: Date.now() - startTime
        };
      }
      
      // 监控任务完成
      const result = await this.monitorTask(taskId);
      
      if (result.success) {
        const generatedCount = result.result?.generated_count || 0;
        const expectedCount = testCase.config.questionCount;
        const successRate = result.result?.success_rate || 0;
        
        console.log(`📈 生成结果:`);
        console.log(`   期望数量: ${expectedCount}`);
        console.log(`   实际数量: ${generatedCount}`);
        console.log(`   成功率: ${successRate.toFixed(1)}%`);
        console.log(`   耗时: ${(result.duration / 1000).toFixed(1)}秒`);
        
        const isSuccess = generatedCount >= expectedCount;
        
        return {
          testName: testCase.name,
          success: isSuccess,
          expectedCount,
          generatedCount,
          successRate,
          duration: result.duration,
          error: isSuccess ? null : `生成数量不足: ${generatedCount}/${expectedCount}`
        };
      } else {
        return {
          testName: testCase.name,
          success: false,
          error: result.error,
          duration: result.duration
        };
      }
    } catch (error) {
      return {
        testName: testCase.name,
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  async runAllTests() {
    console.log('🚀 开始试题生成修复验证测试');
    console.log('=' .repeat(60));
    
    // 登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ 登录失败，测试终止');
      return;
    }
    
    // 运行所有测试用例
    for (const testCase of TEST_CASES) {
      const result = await this.runTestCase(testCase);
      this.testResults.push(result);
      
      // 测试间隔
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // 生成测试报告
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 测试报告');
    console.log('=' .repeat(60));
    
    const successfulTests = this.testResults.filter(r => r.success);
    const failedTests = this.testResults.filter(r => !r.success);
    
    console.log(`\n📈 总体统计:`);
    console.log(`   总测试数: ${this.testResults.length}`);
    console.log(`   成功数: ${successfulTests.length}`);
    console.log(`   失败数: ${failedTests.length}`);
    console.log(`   成功率: ${((successfulTests.length / this.testResults.length) * 100).toFixed(1)}%`);
    
    console.log(`\n✅ 成功的测试:`);
    successfulTests.forEach(result => {
      console.log(`   - ${result.testName}`);
      if (result.generatedCount !== undefined) {
        console.log(`     生成: ${result.generatedCount}/${result.expectedCount} (${result.successRate?.toFixed(1)}%)`);
      }
      console.log(`     耗时: ${(result.duration / 1000).toFixed(1)}秒`);
    });
    
    if (failedTests.length > 0) {
      console.log(`\n❌ 失败的测试:`);
      failedTests.forEach(result => {
        console.log(`   - ${result.testName}`);
        console.log(`     错误: ${result.error}`);
        console.log(`     耗时: ${(result.duration / 1000).toFixed(1)}秒`);
      });
    }
    
    // 修复验证结论
    console.log(`\n🎯 修复验证结论:`);
    if (failedTests.length === 0) {
      console.log('✅ 所有测试通过，试题生成功能修复成功！');
      console.log('✅ 重试机制工作正常，能够确保生成足够数量的试题');
      console.log('✅ 所有AI模型均可正常使用');
    } else {
      console.log('⚠️  部分测试失败，需要进一步检查:');
      failedTests.forEach(result => {
        console.log(`   - ${result.testName}: ${result.error}`);
      });
    }
    
    // 保存详细报告
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        successful: successfulTests.length,
        failed: failedTests.length,
        successRate: (successfulTests.length / this.testResults.length) * 100
      },
      results: this.testResults
    };
    
    const reportPath = path.join(__dirname, 'generation-fix-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  }
}

// 运行测试
if (require.main === module) {
  const tester = new GenerationTester();
  tester.runAllTests().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = GenerationTester;