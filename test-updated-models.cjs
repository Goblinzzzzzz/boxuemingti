const axios = require('axios');
require('dotenv').config();

// 测试更新后的模型配置
const UPDATED_MODELS = [
  'gpt-5-mini',
  'gpt-4.1-mini',
  'claude-opus-4-20250514-ssvip',
  'gemini-2.5-pro'
];

const dmxapi = axios.create({
  baseURL: 'https://www.dmxapi.cn/v1',
  headers: {
    'Authorization': `Bearer ${process.env.DMXAPI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

async function testUpdatedModel(modelName) {
  console.log(`\n🧪 测试更新后的模型: ${modelName}`);
  console.log('=' .repeat(50));
  
  try {
    const response = await dmxapi.post('/chat/completions', {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: '请生成一道简单的数学选择题，包含题目、4个选项和正确答案。'
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    if (response.data && response.data.choices && response.data.choices[0]) {
      const content = response.data.choices[0].message.content;
      console.log(`✅ ${modelName} 测试成功`);
      console.log(`📝 生成内容长度: ${content.length} 字符`);
      console.log(`🔤 生成内容预览: ${content.substring(0, 150)}...`);
      return { model: modelName, status: 'success', content: content };
    } else {
      console.log(`❌ ${modelName} 响应格式异常`);
      return { model: modelName, status: 'error', error: '响应格式异常' };
    }
  } catch (error) {
    console.log(`❌ ${modelName} 测试失败`);
    if (error.response) {
      console.log(`HTTP状态码: ${error.response.status}`);
      console.log(`错误信息:`, error.response.data);
      return {
        model: modelName,
        status: 'error',
        error: `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
      };
    } else {
      console.log('错误:', error.message);
      return { model: modelName, status: 'error', error: error.message };
    }
  }
}

async function runUpdatedModelTests() {
  console.log('🚀 测试更新后的DMXAPI模型配置');
  console.log('='.repeat(60));
  
  if (!process.env.DMXAPI_API_KEY) {
    console.error('❌ 错误: 未找到DMXAPI_API_KEY环境变量');
    process.exit(1);
  }
  
  const results = [];
  
  for (const model of UPDATED_MODELS) {
    const result = await testUpdatedModel(model);
    results.push(result);
    
    // 添加延迟避免API限制
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n\n📊 更新后模型测试结果');
  console.log('='.repeat(60));
  
  const successModels = results.filter(r => r.status === 'success');
  const failedModels = results.filter(r => r.status === 'error');
  
  console.log(`\n✅ 可用模型 (${successModels.length}/${UPDATED_MODELS.length}):`);
  successModels.forEach(result => {
    console.log(`  ${result.model}: 正常`);
  });
  
  if (failedModels.length > 0) {
    console.log(`\n❌ 不可用模型 (${failedModels.length}/${UPDATED_MODELS.length}):`);
    failedModels.forEach(result => {
      console.log(`  ${result.model}: ${result.error}`);
    });
  }
  
  console.log('\n🎯 模型配置更新结果:');
  if (successModels.some(m => m.model.includes('claude'))) {
    console.log('✅ Claude模型已成功更新为可用版本');
  }
  if (successModels.some(m => m.model.includes('gemini'))) {
    console.log('✅ Gemini模型已成功更新为可用版本');
  }
  
  console.log('\n✅ 模型配置测试完成!');
  return results;
}

if (require.main === module) {
  runUpdatedModelTests().catch(error => {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = { runUpdatedModelTests };