const axios = require('axios');

async function testAIStatus() {
  try {
    // 登录获取token
    console.log('🔐 登录获取token...');
    const loginResponse = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'zhaodab@ke.com',
      password: '123456'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ 登录成功');
    
    // 检查AI状态
    console.log('\n📊 检查AI状态...');
    const statusResponse = await axios.get('http://localhost:5173/api/ai/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('AI状态API完整响应:');
    console.log(JSON.stringify(statusResponse.data, null, 2));
    
    // 测试模型切换
    console.log('\n🔄 测试模型切换...');
    const switchResponse = await axios.post('http://localhost:5173/api/ai/switch', {
      provider: 'dmxapi',
      model: 'gpt-5-mini'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('模型切换响应:');
    console.log(JSON.stringify(switchResponse.data, null, 2));
    
    // 再次检查状态
    console.log('\n📊 切换后再次检查AI状态...');
    const statusResponse2 = await axios.get('http://localhost:5173/api/ai/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('切换后AI状态:');
    console.log(JSON.stringify(statusResponse2.data, null, 2));
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testAIStatus();