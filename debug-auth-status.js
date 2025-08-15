/**
 * 调试前端认证状态
 * 检查用户登录状态和token有效性
 */
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3003/api';

// 测试用户登录
async function testLogin() {
  console.log('🔐 测试用户登录...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'zhaodan@ke.com',
        password: 'admin123456'
      })
    });
    
    const result = await response.json();
    console.log('登录响应:', {
      status: response.status,
      success: result.success,
      hasToken: !!result.access_token,
      hasUser: !!result.user
    });
    
    if (result.success && result.access_token) {
      console.log('✅ 登录成功，获得token');
      return result.access_token;
    } else {
      console.log('❌ 登录失败:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 登录请求失败:', error.message);
    return null;
  }
}

// 测试教材API
async function testMaterialsAPI(token) {
  console.log('\n📚 测试教材API...');
  
  if (!token) {
    console.log('❌ 没有token，跳过API测试');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/materials`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('教材API响应:', {
      status: response.status,
      statusText: response.statusText
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 教材API调用成功:', {
        success: result.success,
        dataCount: result.data?.length || 0
      });
    } else {
      const errorText = await response.text();
      console.log('❌ 教材API调用失败:', errorText);
    }
  } catch (error) {
    console.error('❌ 教材API请求失败:', error.message);
  }
}

// 主函数
async function main() {
  console.log('🚀 开始认证状态调试...');
  console.log('=' .repeat(50));
  
  const token = await testLogin();
  await testMaterialsAPI(token);
  
  console.log('\n🏁 调试完成');
}

main().catch(console.error);