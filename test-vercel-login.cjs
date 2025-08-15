/**
 * 测试Vercel部署环境的登录功能
 * 验证修复后的认证服务是否正常工作
 */

const https = require('https');

// Vercel部署URL
const VERCEL_URL = 'https://traemingtivtvj-sz9giabgq-kehrs-projects-ef0ee98f.vercel.app';

// 测试账户信息
const TEST_CREDENTIALS = {
  email: 'zhaodab@ke.com',
  password: '123456'
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testLogin() {
  console.log('🧪 开始测试Vercel部署环境的登录功能...');
  console.log(`📍 测试URL: ${VERCEL_URL}`);
  console.log(`👤 测试账户: ${TEST_CREDENTIALS.email}`);
  console.log('=' * 50);
  
  try {
    const url = new URL(`${VERCEL_URL}/api/auth/login`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Vercel-Login-Test/1.0'
      }
    };
    
    console.log('📤 发送登录请求...');
    const startTime = Date.now();
    
    const response = await makeRequest(options, TEST_CREDENTIALS);
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  请求耗时: ${duration}ms`);
    console.log(`📊 响应状态码: ${response.statusCode}`);
    console.log('📋 响应头信息:');
    Object.entries(response.headers).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('📄 响应内容:');
    console.log(JSON.stringify(response.body, null, 2));
    
    // 分析结果
    if (response.statusCode === 200) {
      if (response.body.success && response.body.access_token) {
        console.log('\n✅ 登录测试成功！');
        console.log(`🔑 获得访问令牌: ${response.body.access_token.substring(0, 20)}...`);
        console.log(`👤 用户信息: ${response.body.user?.name || response.body.user?.email}`);
        return true;
      } else {
        console.log('\n❌ 登录失败：响应格式异常');
        return false;
      }
    } else if (response.statusCode === 401) {
      console.log('\n❌ 登录失败：认证错误（401）');
      console.log('可能原因：用户名或密码错误');
      return false;
    } else if (response.statusCode === 500) {
      console.log('\n❌ 登录失败：服务器内部错误（500）');
      console.log('可能原因：服务器配置问题或代码错误');
      return false;
    } else {
      console.log(`\n❌ 登录失败：未预期的状态码（${response.statusCode}）`);
      return false;
    }
    
  } catch (error) {
    console.log('\n💥 测试过程中发生错误:');
    console.error(error);
    return false;
  }
}

async function testHealthCheck() {
  console.log('\n🏥 测试健康检查端点...');
  
  try {
    const url = new URL(`${VERCEL_URL}/api/health`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Vercel-Health-Test/1.0'
      }
    };
    
    const response = await makeRequest(options);
    
    console.log(`📊 健康检查状态码: ${response.statusCode}`);
    console.log('📄 健康检查响应:');
    console.log(JSON.stringify(response.body, null, 2));
    
    return response.statusCode === 200;
  } catch (error) {
    console.log('💥 健康检查失败:');
    console.error(error);
    return false;
  }
}

async function main() {
  console.log('🚀 Vercel部署环境登录功能测试');
  console.log('=' * 60);
  
  // 先测试健康检查
  const healthOk = await testHealthCheck();
  
  if (!healthOk) {
    console.log('\n⚠️  健康检查失败，但继续进行登录测试...');
  }
  
  // 测试登录功能
  const loginOk = await testLogin();
  
  console.log('\n' + '=' * 60);
  console.log('📊 测试结果总结:');
  console.log(`   健康检查: ${healthOk ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   登录功能: ${loginOk ? '✅ 通过' : '❌ 失败'}`);
  
  if (loginOk) {
    console.log('\n🎉 Vercel部署环境登录功能正常！');
    process.exit(0);
  } else {
    console.log('\n🚨 Vercel部署环境登录功能仍有问题，需要进一步调试。');
    process.exit(1);
  }
}

// 运行测试
main().catch(console.error);