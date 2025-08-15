/**
 * 测试AI工作台修复效果
 * 验证前端能否正确获取AI服务状态
 */
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3003';
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123456'
};

// 注册测试用户
async function testRegister() {
  try {
    console.log('\n📝 注册测试用户...');
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        name: 'Test User'
      }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      console.log('✅ 测试用户注册成功');
    } else {
      console.log('ℹ️  测试用户可能已存在，继续测试');
    }
  } catch (error) {
    console.log('ℹ️  注册失败，可能用户已存在，继续测试');
  }
}

// 登录获取token
async function testLogin() {
  try {
    console.log('\n🔐 用户登录...');
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER),
    });

    const data = await response.json();
    console.log('登录响应:', data);

    if (response.ok && data.success && data.access_token) {
      console.log('✅ 登录成功');
      return data.access_token;
    } else {
      console.log('❌ 登录失败:', data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.message);
    return null;
  }
}

// 测试AI状态接口（模拟前端调用）
async function testAIStatusWithAuth(token) {
  try {
    console.log('\n🤖 测试AI状态接口（带认证头）...');
    
    const timestamp = Date.now();
    const response = await fetch(`${BASE_URL}/api/generation/ai-status?t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log(`响应状态: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ AI状态接口调用成功');
      console.log('AI服务状态:', JSON.stringify(data.data, null, 2));
      
      if (data.data.available) {
        console.log('✅ AI服务可用');
        console.log(`   - 服务商: ${data.data.provider}`);
        console.log(`   - 模型: ${data.data.model}`);
        console.log(`   - API密钥: ${data.data.hasApiKey ? '已配置' : '未配置'}`);
      } else {
        console.log('⚠️  AI服务不可用');
        console.log(`   - 错误信息: ${data.data.message}`);
      }
      
      return data.data;
    } else {
      const errorData = await response.json();
      console.log('❌ AI状态接口调用失败');
      console.log('错误信息:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ AI状态接口请求失败:', error.message);
    return null;
  }
}

// 测试教材列表接口（模拟前端调用）
async function testMaterialsWithAuth(token) {
  try {
    console.log('\n📚 测试教材列表接口（带认证头）...');
    
    const response = await fetch(`${BASE_URL}/api/materials`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`响应状态: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 教材列表接口调用成功');
      console.log(`   - 教材数量: ${data.data?.length || 0}`);
      
      if (data.data && data.data.length > 0) {
        console.log('   - 教材列表:');
        data.data.forEach((material, index) => {
          console.log(`     ${index + 1}. ${material.title} (ID: ${material.id})`);
        });
      } else {
        console.log('   - 暂无教材');
      }
      
      return data.data;
    } else {
      const errorData = await response.json();
      console.log('❌ 教材列表接口调用失败');
      console.log('错误信息:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ 教材列表接口请求失败:', error.message);
    return null;
  }
}

// 主测试函数
async function main() {
  console.log('🚀 开始测试AI工作台修复效果');
  console.log('=' .repeat(60));
  
  // 1. 注册测试用户
  await testRegister();
  
  // 2. 登录获取token
  const token = await testLogin();
  if (!token) {
    console.log('\n❌ 无法获取认证token，测试终止');
    process.exit(1);
  }
  
  // 3. 测试AI状态接口
  const aiStatus = await testAIStatusWithAuth(token);
  
  // 4. 测试教材列表接口
  const materials = await testMaterialsWithAuth(token);
  
  // 5. 总结测试结果
  console.log('\n📊 测试结果总结');
  console.log('=' .repeat(60));
  
  if (aiStatus) {
    console.log('✅ AI状态接口: 正常');
    console.log(`   - AI服务状态: ${aiStatus.available ? '可用' : '不可用'}`);
  } else {
    console.log('❌ AI状态接口: 异常');
  }
  
  if (materials !== null) {
    console.log('✅ 教材列表接口: 正常');
    console.log(`   - 教材数量: ${materials.length}`);
  } else {
    console.log('❌ 教材列表接口: 异常');
  }
  
  console.log('\n🎯 修复效果:');
  if (aiStatus && materials !== null) {
    console.log('✅ AI工作台应该能正常显示AI服务状态和教材列表');
    console.log('✅ 前端认证头修复成功');
  } else {
    console.log('❌ 仍存在问题，需要进一步调试');
  }
  
  console.log('\n💡 建议:');
  console.log('1. 打开浏览器访问 http://localhost:5173');
  console.log('2. 登录后进入AI生成工作台');
  console.log('3. 检查AI服务状态是否正确显示');
  console.log('4. 检查教材列表是否正常加载');
}

// 运行测试
main().catch(console.error);