const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = 'http://localhost:5173';
const TEST_USER = {
  email: 'zhaodab@ke.com',
  password: '123456'
};

// DMXAPI模型配置
const DMXAPI_MODELS = [
  { provider: 'dmxapi', model: 'gpt-5-mini', name: 'GPT-5 Mini' },
  { provider: 'dmxapi', model: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
  { provider: 'dmxapi', model: 'claude-opus-4-20250514-ssvip', name: 'Claude Opus 4' },
  { provider: 'dmxapi', model: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
];

let authToken = null;
let testMaterialId = null;

// 登录函数
async function login() {
  try {
    console.log('🔐 正在登录测试账号...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.data.success && response.data.access_token) {
      authToken = response.data.access_token;
      console.log('✅ 登录成功');
      console.log(`用户ID: ${response.data.user.id}`);
      console.log(`用户名: ${response.data.user.name}`);
      console.log(`角色: ${response.data.user.roles.join(', ')}`);
      return true;
    } else {
      console.error('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.response?.data || error.message);
    return false;
  }
}

// 获取测试教材ID
async function getTestMaterialId() {
  try {
    console.log('📚 获取测试教材ID...');
    const response = await axios.get(`${BASE_URL}/api/materials`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success && response.data.data.length > 0) {
      testMaterialId = response.data.data[0].id;
      console.log(`✅ 获取到教材ID: ${testMaterialId}`);
      console.log(`教材名称: ${response.data.data[0].title}`);
      return testMaterialId;
    } else {
      console.error('❌ 未找到测试教材');
      return null;
    }
  } catch (error) {
    console.error('❌ 获取教材失败:', error.response?.data || error.message);
    return null;
  }
}

// 检查AI服务状态
async function checkAIServiceStatus() {
  try {
    console.log('\n🔍 检查AI服务状态...');
    const response = await axios.get(`${BASE_URL}/api/ai/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const status = response.data;
    console.log('✅ AI服务状态:');
    console.log(`  当前提供商: ${status.provider || 'unknown'}`);
    console.log(`  当前模型: ${status.model || 'unknown'}`);
    console.log(`  服务可用: ${status.available ? '是' : '否'}`);
    console.log(`  API密钥: ${status.hasApiKey ? '已配置' : '未配置'}`);
    console.log(`  状态信息: ${status.message || 'none'}`);
    
    // 检查服务是否可用
    if (!status.available) {
      console.warn('⚠️ AI服务当前不可用:', status.message);
    }
    
    return status;
  } catch (error) {
    console.error('❌ AI服务状态检查失败:', error.response?.data || error.message);
    return null;
  }
}

// 切换AI模型
async function switchAIModel(provider, model) {
  try {
    console.log(`\n🔄 切换到模型: ${provider}/${model}`);
    const response = await axios.post(`${BASE_URL}/api/ai/switch`, {
      provider,
      model
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log(`✅ 模型切换成功`);
      console.log(`  响应信息: ${response.data.message || 'success'}`);
      return true;
    } else {
      console.error(`❌ 模型切换失败:`, response.data.error);
      return false;
    }
  } catch (error) {
    console.error(`❌ 模型切换请求失败:`, error.response?.data || error.message);
    return false;
  }
}

// 测试AI生成功能
async function testAIGeneration(modelName) {
  try {
    console.log(`\n🧪 测试 ${modelName} 生成功能...`);
    const response = await axios.post(`${BASE_URL}/api/generation/test-generate`, {
      content: '数学是研究数量、结构、变化、空间以及信息等概念的一门学科。数学的基本概念包括数、量、形、空间等。数学可以分为纯粹数学和应用数学两大类。纯粹数学研究数学本身的内在规律，包括代数、几何、分析等分支。应用数学则将数学理论应用于解决实际问题，如统计学、运筹学、计算数学等。数学在科学技术、工程、经济、社会等各个领域都有广泛的应用，是现代科学技术发展的重要基础。学习数学不仅能培养逻辑思维能力，还能提高分析问题和解决问题的能力。',
      questionType: '单选题',
      difficulty: '中',
      knowledgePoint: '数学基础知识'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success && response.data.question) {
      const question = response.data.question;
      console.log(`✅ ${modelName} 生成测试成功`);
      console.log(`  题目: ${question.stem?.substring(0, 50)}...`);
      console.log(`  选项数量: ${question.options?.length || 0}`);
      console.log(`  正确答案: ${question.correct_answer}`);
      console.log(`  质量分数: ${question.quality_score}`);
      return { success: true, question };
    } else {
      console.error(`❌ ${modelName} 生成测试失败:`, response.data.error);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    console.error(`❌ ${modelName} 生成测试请求失败:`, error.response?.data?.message || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

// 创建生成任务
async function createGenerationTask(modelName, questionCount = 3) {
  try {
    console.log(`\n📝 创建 ${modelName} 生成任务 (${questionCount}道题)...`);
    const response = await axios.post(`${BASE_URL}/api/generation/tasks`, {
      materialId: testMaterialId,
      questionCount,
      questionTypes: ['单选题', '多选题', '判断题'],
      difficulty: '中',
      knowledgePoints: []
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success && response.data.data.id) {
      const taskId = response.data.data.id;
      console.log(`✅ ${modelName} 任务创建成功，任务ID: ${taskId}`);
      return { success: true, taskId };
    } else {
      console.error(`❌ ${modelName} 任务创建失败:`, response.data.error);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    console.error(`❌ ${modelName} 任务创建请求失败:`, error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// 监控任务状态
async function monitorTask(taskId, modelName, maxWaitTime = 60000) {
  const startTime = Date.now();
  const checkInterval = 3000; // 3秒检查一次
  
  console.log(`\n⏱️  监控 ${modelName} 任务状态 (最大等待${maxWaitTime/1000}秒)...`);
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await axios.get(`${BASE_URL}/api/generation/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (response.data.success && response.data.data) {
        const task = response.data.data;
        const progress = task.parameters?.progress || 0;
        
        console.log(`  状态: ${task.status}, 进度: ${progress}%`);
        
        if (task.status === 'completed') {
          console.log(`✅ ${modelName} 任务完成`);
          console.log(`  生成数量: ${task.result?.generated_count || 0}`);
          console.log(`  成功率: ${task.result?.success_rate || 0}%`);
          return { success: true, task };
        } else if (task.status === 'failed') {
          console.error(`❌ ${modelName} 任务失败:`, task.result?.error);
          return { success: false, error: task.result?.error };
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      console.error(`❌ 检查任务状态失败:`, error.response?.data || error.message);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
  
  console.error(`❌ ${modelName} 任务超时`);
  return { success: false, error: '任务超时' };
}

// 测试单个模型
async function testSingleModel(modelConfig) {
  const { provider, model, name } = modelConfig;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 测试模型: ${name} (${provider}/${model})`);
  console.log(`${'='.repeat(60)}`);
  
  const result = {
    model: name,
    provider,
    modelId: model,
    switchSuccess: false,
    generateSuccess: false,
    taskSuccess: false,
    errors: []
  };
  
  // 1. 切换模型
  const switchResult = await switchAIModel(provider, model);
  result.switchSuccess = switchResult;
  if (!switchResult) {
    result.errors.push('模型切换失败');
    return result;
  }
  
  // 2. 测试生成功能
  const generateResult = await testAIGeneration(name);
  result.generateSuccess = generateResult.success;
  if (!generateResult.success) {
    result.errors.push(`生成测试失败: ${generateResult.error}`);
  }
  
  // 3. 创建并监控任务
  const taskResult = await createGenerationTask(name, 3);
  if (taskResult.success) {
    const monitorResult = await monitorTask(taskResult.taskId, name, 90000); // 90秒超时
    result.taskSuccess = monitorResult.success;
    if (!monitorResult.success) {
      result.errors.push(`任务失败: ${monitorResult.error}`);
    }
  } else {
    result.errors.push(`任务创建失败: ${taskResult.error}`);
  }
  
  return result;
}

// 生成测试报告
function generateReport(results) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 DMXAPI模型测试报告');
  console.log(`${'='.repeat(80)}`);
  
  const summary = {
    total: results.length,
    switchSuccess: 0,
    generateSuccess: 0,
    taskSuccess: 0,
    fullyWorking: 0
  };
  
  results.forEach(result => {
    console.log(`\n🔸 ${result.model} (${result.provider}/${result.modelId})`);
    console.log(`  模型切换: ${result.switchSuccess ? '✅ 成功' : '❌ 失败'}`);
    console.log(`  生成测试: ${result.generateSuccess ? '✅ 成功' : '❌ 失败'}`);
    console.log(`  任务完成: ${result.taskSuccess ? '✅ 成功' : '❌ 失败'}`);
    
    if (result.errors.length > 0) {
      console.log(`  错误信息:`);
      result.errors.forEach(error => console.log(`    - ${error}`));
    }
    
    if (result.switchSuccess) summary.switchSuccess++;
    if (result.generateSuccess) summary.generateSuccess++;
    if (result.taskSuccess) summary.taskSuccess++;
    if (result.switchSuccess && result.generateSuccess && result.taskSuccess) {
      summary.fullyWorking++;
    }
  });
  
  console.log(`\n📈 统计摘要:`);
  console.log(`  总测试模型: ${summary.total}`);
  console.log(`  模型切换成功: ${summary.switchSuccess}/${summary.total}`);
  console.log(`  生成测试成功: ${summary.generateSuccess}/${summary.total}`);
  console.log(`  任务完成成功: ${summary.taskSuccess}/${summary.total}`);
  console.log(`  完全可用模型: ${summary.fullyWorking}/${summary.total}`);
  
  // 保存报告到文件
  const reportData = {
    timestamp: new Date().toISOString(),
    summary,
    results
  };
  
  const reportPath = path.join(__dirname, 'dmxapi-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n💾 详细报告已保存到: ${reportPath}`);
  
  return summary;
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 开始DMXAPI模型全面测试');
  console.log(`测试时间: ${new Date().toLocaleString()}`);
  
  // 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ 登录失败，测试终止');
    return;
  }
  
  // 获取教材ID
  const materialId = await getTestMaterialId();
  if (!materialId) {
    console.error('❌ 获取教材失败，测试终止');
    return;
  }
  
  // 检查AI服务状态
  await checkAIServiceStatus();
  
  // 测试所有模型
  const results = [];
  for (const modelConfig of DMXAPI_MODELS) {
    const result = await testSingleModel(modelConfig);
    results.push(result);
    
    // 每个模型测试后等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 生成报告
  const summary = generateReport(results);
  
  console.log(`\n🏁 测试完成`);
  if (summary.fullyWorking === summary.total) {
    console.log('🎉 所有模型都正常工作！');
  } else if (summary.fullyWorking > 0) {
    console.log(`⚠️  ${summary.fullyWorking}/${summary.total} 个模型正常工作`);
  } else {
    console.log('💥 没有模型正常工作，需要检查配置');
  }
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testSingleModel,
  DMXAPI_MODELS
};