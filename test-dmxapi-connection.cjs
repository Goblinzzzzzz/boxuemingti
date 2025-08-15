// 使用axios替代fetch
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 从环境变量读取API密钥
require('dotenv').config();

const DMXAPI_KEY = process.env.DMXAPI_API_KEY;
const BASE_URL = 'https://www.dmxapi.cn/v1';

// DMXAPI模型列表
const DMXAPI_MODELS = [
  'gpt-5-mini',
  'gpt-4.1-mini', 
  'claude-3-sonnet',
  'gemini-2.5-pro'
];

/**
 * 测试DMXAPI连接和模型可用性
 */
async function testDMXAPIConnection() {
  console.log('🔍 开始测试DMXAPI连接...');
  console.log(`API密钥: ${DMXAPI_KEY ? DMXAPI_KEY.substring(0, 10) + '...' : '未配置'}`);
  console.log(`API地址: ${BASE_URL}`);
  console.log('');

  if (!DMXAPI_KEY) {
    console.log('❌ 错误: 未找到DMXAPI_API_KEY环境变量');
    console.log('请在.env文件中配置DMXAPI_API_KEY');
    return;
  }

  const results = [];

  for (const model of DMXAPI_MODELS) {
    console.log(`\n📋 测试模型: ${model}`);
    console.log('=' .repeat(50));
    
    try {
      // 构建测试请求
      const requestData = {
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个测试助手，请简单回复。'
          },
          {
            role: 'user', 
            content: '请回复"测试成功"'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      };

      console.log(`📤 发送请求到: ${BASE_URL}/chat/completions`);
      console.log(`📋 请求模型: ${model}`);
      
      const startTime = Date.now();
      
      const response = await axios.post(`${BASE_URL}/chat/completions`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DMXAPI_KEY}`
        },
        timeout: 30000
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`📥 响应状态: ${response.status} ${response.statusText}`);
      console.log(`⏱️  响应时间: ${responseTime}ms`);
      
      const result = response.data;
      console.log(`📄 响应数据结构:`);
      console.log(`- choices数组长度: ${result.choices?.length || 0}`);
      console.log(`- usage信息: ${result.usage ? 'present' : 'missing'}`);
      
      if (result.choices && result.choices.length > 0) {
        const content = result.choices[0]?.message?.content;
        console.log(`📝 AI回复内容: "${content || '空内容'}"}`);
        console.log(`📊 内容长度: ${content?.length || 0} 字符`);
        
        if (content && content.trim().length > 0) {
          console.log(`✅ 模型 ${model} 测试成功`);
          results.push({
            model,
            status: 'success',
            content: content.trim(),
            responseTime,
            usage: result.usage
          });
        } else {
          console.log(`❌ 模型 ${model} 返回空内容`);
          results.push({
            model,
            status: 'failed',
            error: 'AI响应内容为空',
            responseTime,
            rawResponse: result
          });
        }
      } else {
        console.log(`❌ 模型 ${model} 响应格式异常`);
        console.log('完整响应:', JSON.stringify(result, null, 2));
        results.push({
          model,
          status: 'failed',
          error: '响应格式异常，缺少choices数组',
          responseTime,
          rawResponse: result
        });
      }
      
    } catch (error) {
      console.log(`❌ 模型 ${model} 连接失败:`);
      console.log(`错误类型: ${error.name}`);
      console.log(`错误信息: ${error.message}`);
      
      // 处理axios错误
      if (error.response) {
        console.log(`HTTP状态: ${error.response.status}`);
        console.log(`错误响应:`, error.response.data);
        results.push({
          model,
          status: 'failed',
          error: `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`,
          responseTime: 0
        });
      } else {
        results.push({
          model,
          status: 'failed',
          error: `${error.name}: ${error.message}`,
          responseTime: 0
        });
      }
    }
    
    // 避免API限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 生成测试报告
  console.log('\n' + '='.repeat(60));
  console.log('📊 DMXAPI连接测试报告');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'failed').length;
  
  console.log(`✅ 成功: ${successCount}/${DMXAPI_MODELS.length}`);
  console.log(`❌ 失败: ${failCount}/${DMXAPI_MODELS.length}`);
  console.log('');
  
  results.forEach(result => {
    const status = result.status === 'success' ? '✅' : '❌';
    console.log(`${status} ${result.model}: ${result.status}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
    if (result.content) {
      console.log(`   回复: ${result.content}`);
    }
    console.log(`   响应时间: ${result.responseTime}ms`);
    console.log('');
  });

  // 保存详细报告
  const reportPath = path.join(__dirname, 'dmxapi-connection-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    apiKey: DMXAPI_KEY ? DMXAPI_KEY.substring(0, 10) + '...' : 'missing',
    baseUrl: BASE_URL,
    totalModels: DMXAPI_MODELS.length,
    successCount,
    failCount,
    results
  }, null, 2));
  
  console.log(`📄 详细报告已保存到: ${reportPath}`);
  
  // 诊断建议
  console.log('\n🔧 诊断建议:');
  if (failCount === DMXAPI_MODELS.length) {
    console.log('❌ 所有模型都无法使用，可能的原因:');
    console.log('   1. API密钥已过期或无效');
    console.log('   2. API地址配置错误');
    console.log('   3. 网络连接问题');
    console.log('   4. DMXAPI服务异常');
    console.log('');
    console.log('🔧 建议解决方案:');
    console.log('   1. 访问 https://www.dmxapi.cn 获取新的API密钥');
    console.log('   2. 检查.env文件中的DMXAPI_API_KEY配置');
    console.log('   3. 确认API地址为 https://www.dmxapi.cn/v1');
  } else if (failCount > 0) {
    console.log(`⚠️  部分模型无法使用 (${failCount}/${DMXAPI_MODELS.length})`);
    console.log('   建议使用可用的模型，或联系DMXAPI技术支持');
  } else {
    console.log('✅ 所有模型都可正常使用');
  }
}

// 运行测试
testDMXAPIConnection().catch(error => {
  console.error('❌ 测试过程中发生错误:', error);
  process.exit(1);
});