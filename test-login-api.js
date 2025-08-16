/**
 * 测试生产环境登录API的token功能
 * 包括：登录token生成和用户信息token验证
 */

import https from 'https';
import http from 'http';

// 配置
const PRODUCTION_URL = 'https://exam.kehr.work';
const TEST_CREDENTIALS = {
  email: 'zhaodan@ke.com',
  password: '123456'
};

// HTTP请求工具函数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// 测试登录API
async function testLoginAPI() {
  console.log('🔐 测试登录API...');
  console.log(`URL: ${PRODUCTION_URL}/api/login`);
  console.log(`测试账户: ${TEST_CREDENTIALS.email}`);
  
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/login`, {
      method: 'POST',
      body: TEST_CREDENTIALS
    });
    
    console.log(`状态码: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ 登录成功!');
      console.log('返回数据:', JSON.stringify(response.data, null, 2));
      
      // 检查token (实际字段是access_token)
      const token = response.data.data?.access_token || response.data.token;
      if (token) {
        console.log('✅ Token已生成');
        console.log(`Token长度: ${token.length}`);
        
        // 简单验证JWT格式 (header.payload.signature)
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          console.log('✅ Token格式正确 (JWT)');
          
          // 解码payload (不验证签名)
          try {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            console.log('Token payload:', JSON.stringify(payload, null, 2));
            
            // 检查过期时间
            if (payload.exp) {
              const expDate = new Date(payload.exp * 1000);
              console.log(`Token过期时间: ${expDate.toISOString()}`);
              
              if (expDate > new Date()) {
                console.log('✅ Token未过期');
              } else {
                console.log('❌ Token已过期');
              }
            }
          } catch (e) {
            console.log('❌ 无法解码token payload:', e.message);
          }
        } else {
          console.log('❌ Token格式不正确');
        }
        
        return token;
      } else {
        console.log('❌ 响应中没有token');
        return null;
      }
    } else {
      console.log('❌ 登录失败');
      console.log('错误信息:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ 登录API请求失败:', error.message);
    return null;
  }
}

// 测试用户信息API
async function testUserProfileAPI(token) {
  if (!token) {
    console.log('❌ 没有token，跳过用户信息API测试');
    return;
  }
  
  console.log('\n👤 测试用户信息API...');
  console.log(`URL: ${PRODUCTION_URL}/api/users/profile`);
  
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`状态码: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ 用户信息获取成功!');
      console.log('用户数据:', JSON.stringify(response.data, null, 2));
      
      // 检查必要字段 (数据在data字段中)
      const userData = response.data.data || response.data;
      const requiredFields = ['id', 'email'];
      const missingFields = requiredFields.filter(field => !userData[field]);
      
      // 检查角色信息 (可能在roles数组中)
      if (!userData.role && (!userData.roles || userData.roles.length === 0)) {
        missingFields.push('role/roles');
      }
      
      if (missingFields.length === 0) {
        console.log('✅ 所有必要字段都存在');
      } else {
        console.log(`❌ 缺少字段: ${missingFields.join(', ')}`);
      }
    } else {
      console.log('❌ 用户信息获取失败');
      console.log('错误信息:', response.data);
    }
  } catch (error) {
    console.log('❌ 用户信息API请求失败:', error.message);
  }
}

// 测试无效token
async function testInvalidToken() {
  console.log('\n🚫 测试无效token...');
  
  const invalidToken = 'invalid.token.here';
  
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${invalidToken}`
      }
    });
    
    console.log(`状态码: ${response.status}`);
    
    if (response.status === 401) {
      console.log('✅ 正确拒绝了无效token');
    } else {
      console.log('❌ 应该拒绝无效token但没有');
    }
    
    console.log('响应:', response.data);
  } catch (error) {
    console.log('❌ 无效token测试失败:', error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试生产环境登录API token功能\n');
  console.log('=' .repeat(50));
  
  // 1. 测试登录API
  const token = await testLoginAPI();
  
  // 2. 测试用户信息API
  await testUserProfileAPI(token);
  
  // 3. 测试无效token
  await testInvalidToken();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 测试完成!');
}

// 运行测试
runTests().catch(console.error);

export {
  testLoginAPI,
  testUserProfileAPI,
  testInvalidToken,
  runTests
};