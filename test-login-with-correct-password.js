/**
 * 测试使用正确密码登录
 */
import fetch from 'node-fetch';
import bcrypt from 'bcrypt';

const API_BASE = 'http://localhost:3003/api';

// 测试不同的密码组合
const testCredentials = [
  { email: 'zhaodan@ke.com', password: 'admin123456' },
  { email: 'zhaodan@ke.com', password: 'password123' },
  { email: 'zhaodan@ke.com', password: '123456' },
  { email: 'test@example.com', password: 'test123456' },
  { email: 'test@example.com', password: 'password123' },
  { email: 'test@example.com', password: '123456' }
];

async function testLogin() {
  console.log('=== 测试登录凭据 ===');
  
  for (const credentials of testCredentials) {
    try {
      console.log(`\n尝试登录: ${credentials.email} / ${credentials.password}`);
      
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      const result = await response.text();
      
      if (response.ok) {
        console.log('✅ 登录成功!');
        const data = JSON.parse(result);
        console.log('Token:', data.access_token?.substring(0, 20) + '...');
        
        // 使用获取到的token测试questions接口
        await testQuestionsAPI(data.access_token);
        return; // 找到有效凭据后退出
      } else {
        console.log('❌ 登录失败:', result);
      }
    } catch (error) {
      console.error('登录请求异常:', error.message);
    }
  }
  
  console.log('\n所有凭据都失败了，可能需要重置密码或创建新用户');
}

async function testQuestionsAPI(token) {
  console.log('\n=== 测试Questions API ===');
  
  try {
    const response = await fetch(`${API_BASE}/questions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.text();
    
    if (response.ok) {
      console.log('✅ Questions API调用成功!');
      const data = JSON.parse(result);
      console.log('返回数据结构:', {
        success: data.success,
        dataLength: data.data?.length || 0,
        total: data.total,
        page: data.page,
        pageSize: data.pageSize
      });
      
      if (data.data && data.data.length > 0) {
        console.log('\n试题示例:');
        console.log(JSON.stringify(data.data[0], null, 2));
      } else {
        console.log('\n⚠️ 返回的试题列表为空');
      }
    } else {
      console.log('❌ Questions API调用失败:', result);
    }
  } catch (error) {
    console.error('Questions API请求异常:', error.message);
  }
}

testLogin().catch(console.error);