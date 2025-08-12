/**
 * 测试用户认证token状态
 */
import fetch from 'node-fetch';

// 模拟浏览器中的token获取
const testAuthToken = async () => {
  console.log('=== 测试用户认证状态 ===');
  
  // 测试不带token的请求
  console.log('\n1. 测试不带token的请求:');
  try {
    const response = await fetch('http://localhost:3003/api/users/admin/list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('状态码:', response.status);
    const data = await response.json();
    console.log('响应:', data);
  } catch (error) {
    console.error('请求失败:', error.message);
  }
  
  // 测试登录获取token
  console.log('\n2. 测试登录获取token:');
  try {
    const loginResponse = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'zhaodan@ke.com',
        password: 'admin123456'
      })
    });
    
    console.log('登录状态码:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('登录响应:', loginData);
    
    if (loginData.success && loginData.access_token) {
      const token = loginData.access_token;
      console.log('\n3. 使用token测试用户列表接口:');
      
      const userListResponse = await fetch('http://localhost:3003/api/users/admin/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('用户列表状态码:', userListResponse.status);
      const userListData = await userListResponse.json();
      console.log('用户列表响应:', JSON.stringify(userListData, null, 2));
    }
  } catch (error) {
    console.error('登录测试失败:', error.message);
  }
};

testAuthToken().catch(console.error);