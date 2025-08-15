/**
 * 直接测试DMXAPI连接
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.DMXAPI_API_KEY;
const BASE_URL = 'https://www.dmxapi.com/v1';

async function testDMXAPI() {
  console.log('🧪 直接测试DMXAPI连接...');
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : '未配置'}`);
  console.log(`Base URL: ${BASE_URL}`);
  
  if (!API_KEY) {
    console.error('❌ DMXAPI API密钥未配置');
    return;
  }

  // 测试模型列表
  const models = ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-pro'];
  
  for (const model of models) {
    console.log(`\n🔍 测试模型: ${model}`);
    
    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: '你好，请回复"测试成功"'
            }
          ],
          max_tokens: 50
        })
      });

      console.log(`状态码: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${model} 测试成功`);
        console.log(`响应: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
      } else {
        const errorText = await response.text();
        console.log(`❌ ${model} 测试失败: ${response.status} ${response.statusText}`);
        console.log(`错误详情: ${errorText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`❌ ${model} 请求失败:`, error.message);
    }
  }
}

testDMXAPI().catch(console.error);