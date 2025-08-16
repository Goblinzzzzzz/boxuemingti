#!/usr/bin/env node

/**
 * 生产环境登录测试脚本
 * 测试 https://exam.kehr.work 的登录功能
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

// 测试配置
const PRODUCTION_BASE_URL = 'https://exam.kehr.work';
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
        'User-Agent': 'Production-Login-Test/1.0',
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
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            rawData: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            rawData: data,
            parseError: e.message
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

// 测试函数
async function testProductionLogin() {
  console.log('🚀 开始生产环境登录测试');
  console.log('📍 测试环境:', PRODUCTION_BASE_URL);
  console.log('👤 测试账号:', TEST_CREDENTIALS.email);
  console.log('=' .repeat(60));
  
  try {
    // 1. 测试基础连接
    console.log('\n1️⃣ 测试基础连接...');
    const healthCheck = await makeRequest(`${PRODUCTION_BASE_URL}/`);
    console.log(`   状态码: ${healthCheck.status}`);
    console.log(`   响应长度: ${healthCheck.rawData.length} 字符`);
    
    if (healthCheck.status !== 200) {
      console.log('❌ 基础连接失败');
      return;
    }
    console.log('✅ 基础连接正常');
    
    // 2. 测试登录API端点
    console.log('\n2️⃣ 测试登录API端点...');
    const loginUrl = `${PRODUCTION_BASE_URL}/api/login`;
    console.log(`   请求URL: ${loginUrl}`);
    console.log(`   请求数据:`, TEST_CREDENTIALS);
    
    const loginResponse = await makeRequest(loginUrl, {
      method: 'POST',
      body: TEST_CREDENTIALS
    });
    
    console.log(`   响应状态码: ${loginResponse.status}`);
    console.log(`   响应头:`, JSON.stringify(loginResponse.headers, null, 2));
    
    if (loginResponse.parseError) {
      console.log('❌ 响应解析错误:', loginResponse.parseError);
      console.log('   原始响应:', loginResponse.rawData);
      return;
    }
    
    console.log(`   响应数据:`, JSON.stringify(loginResponse.data, null, 2));
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
      console.log('✅ 登录成功!');
      
      const { access_token: accessToken, refresh_token: refreshToken, user } = loginResponse.data.data;
      console.log(`   访问令牌: ${accessToken ? accessToken.substring(0, 50) + '...' : '无'}`);
      console.log(`   刷新令牌: ${refreshToken ? refreshToken.substring(0, 50) + '...' : '无'}`);
      console.log(`   用户信息: ${user ? user.email : '无'}`);
      
      // 3. 测试用户信息获取
      if (accessToken) {
        console.log('\n3️⃣ 测试用户信息获取...');
        const profileUrl = `${PRODUCTION_BASE_URL}/api/users/profile`;
        
        const profileResponse = await makeRequest(profileUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        console.log(`   用户信息API状态码: ${profileResponse.status}`);
        console.log(`   用户信息响应:`, JSON.stringify(profileResponse.data, null, 2));
        
        if (profileResponse.status === 200) {
          console.log('✅ 用户信息获取成功!');
        } else {
          console.log('❌ 用户信息获取失败');
        }
      }
      
      // 4. 测试令牌刷新
      if (refreshToken) {
        console.log('\n4️⃣ 测试令牌刷新...');
        const refreshUrl = `${PRODUCTION_BASE_URL}/api/refresh`;
        
        const refreshResponse = await makeRequest(refreshUrl, {
          method: 'POST',
          body: { refreshToken }
        });
        
        console.log(`   令牌刷新API状态码: ${refreshResponse.status}`);
        console.log(`   令牌刷新响应:`, JSON.stringify(refreshResponse.data, null, 2));
        
        if (refreshResponse.status === 200) {
          console.log('✅ 令牌刷新成功!');
        } else {
          console.log('❌ 令牌刷新失败');
        }
      }
      
    } else {
      console.log('❌ 登录失败!');
      console.log('   错误信息:', loginResponse.data.message || '未知错误');
      
      // 分析可能的错误原因
      console.log('\n🔍 错误分析:');
      if (loginResponse.status === 404) {
        console.log('   - API端点不存在或路由配置错误');
      } else if (loginResponse.status === 401) {
        console.log('   - 认证失败，可能是密码错误或用户不存在');
      } else if (loginResponse.status === 500) {
        console.log('   - 服务器内部错误，可能是数据库连接或代码问题');
      } else if (loginResponse.status === 405) {
        console.log('   - 方法不允许，可能是API路由配置问题');
      }
    }
    
  } catch (error) {
    console.log('❌ 测试过程中发生错误:', error.message);
    console.log('   错误详情:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 测试完成');
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testProductionLogin();
}

export { testProductionLogin };