/**
 * 登录流程测试脚本
 * 用于验证前后端API配置和登录功能的完整性
 * 支持本地开发环境和Vercel生产环境测试
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

// 测试配置
const TEST_CONFIG = {
  // 测试环境配置
  environments: {
    local: {
      baseURL: 'http://localhost:5173',
      apiURL: 'http://localhost:3003/api'
    },
    production: {
      baseURL: 'https://exam.kehr.work',
      apiURL: 'https://exam.kehr.work/api'
    }
  },
  
  // 测试用户凭据
  testUser: {
    email: 'zhaodan@ke.com',
    password: '123456'
  },
  
  // 测试超时设置
  timeout: 30000
};

// 当前测试环境
const CURRENT_ENV = process.env.TEST_ENV || 'production';
const config = TEST_CONFIG.environments[CURRENT_ENV];

console.log(`🧪 开始测试登录流程 - 环境: ${CURRENT_ENV}`);
console.log(`📍 API地址: ${config.apiURL}`);

// 创建axios实例
const api = axios.create({
  baseURL: config.apiURL,
  timeout: TEST_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'LoginFlowTest/1.0'
  }
});

// 测试结果收集器
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// 测试工具函数
function logTest(testName, status, details = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${testName}: ${status}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  if (status === 'PASS') {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, details });
  }
}

// JWT解码工具
function decodeJWT(token) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    return decoded;
  } catch (error) {
    return null;
  }
}

// 验证JWT格式
function validateJWTFormat(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  try {
    // 验证每个部分都是有效的base64
    parts.forEach(part => {
      Buffer.from(part, 'base64');
    });
    return true;
  } catch {
    return false;
  }
}

// 测试1: API健康检查
async function testAPIHealth() {
  console.log('\n🔍 测试1: API健康检查');
  
  try {
    const response = await api.get('/health');
    
    if (response.status === 200) {
      logTest('API健康检查', 'PASS', `响应时间: ${response.headers['x-response-time'] || 'N/A'}`);
      return true;
    } else {
      logTest('API健康检查', 'FAIL', `状态码: ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('API健康检查', 'FAIL', `错误: ${error.message}`);
    return false;
  }
}

// 测试2: 登录API测试
async function testLogin() {
  console.log('\n🔐 测试2: 登录API测试');
  
  try {
    const loginData = {
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password
    };
    
    console.log(`   尝试登录用户: ${loginData.email}`);
    
    const response = await api.post('/login', loginData);
    
    // 检查响应状态
    if (response.status !== 200) {
      logTest('登录请求', 'FAIL', `状态码: ${response.status}`);
      return null;
    }
    
    logTest('登录请求', 'PASS', `状态码: ${response.status}`);
    
    // 检查响应结构
    const { data } = response;
    
    if (!data.success) {
      logTest('登录响应格式', 'FAIL', `登录失败: ${data.message}`);
      return null;
    }
    
    logTest('登录响应格式', 'PASS', '响应结构正确');
    
    // 检查token
    const { access_token, refresh_token, user } = data.data;
    
    if (!access_token || !refresh_token) {
      logTest('Token生成', 'FAIL', '缺少access_token或refresh_token');
      return null;
    }
    
    logTest('Token生成', 'PASS', 'access_token和refresh_token都已生成');
    
    // 验证JWT格式
    if (!validateJWTFormat(access_token)) {
      logTest('Access Token格式', 'FAIL', 'JWT格式无效');
      return null;
    }
    
    logTest('Access Token格式', 'PASS', 'JWT格式有效');
    
    if (!validateJWTFormat(refresh_token)) {
      logTest('Refresh Token格式', 'FAIL', 'JWT格式无效');
      return null;
    }
    
    logTest('Refresh Token格式', 'PASS', 'JWT格式有效');
    
    // 解码并验证token内容
    const decodedAccess = decodeJWT(access_token);
    if (decodedAccess && decodedAccess.payload) {
      const payload = decodedAccess.payload;
      if (payload.user_id && payload.email) {
        logTest('Token内容验证', 'PASS', `用户ID: ${payload.user_id}, 邮箱: ${payload.email}`);
      } else {
        logTest('Token内容验证', 'FAIL', 'Token缺少必要字段');
      }
    }
    
    // 检查用户信息
    if (user && user.id && user.email) {
      logTest('用户信息返回', 'PASS', `用户: ${user.name} (${user.email})`);
    } else {
      logTest('用户信息返回', 'FAIL', '用户信息不完整');
    }
    
    return {
      access_token,
      refresh_token,
      user
    };
    
  } catch (error) {
    logTest('登录API测试', 'FAIL', `错误: ${error.message}`);
    if (error.response) {
      console.log(`   响应状态: ${error.response.status}`);
      console.log(`   响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
}

// 测试3: Token验证测试
async function testTokenValidation(tokens) {
  console.log('\n🔑 测试3: Token验证测试');
  
  if (!tokens) {
    logTest('Token验证测试', 'SKIP', '没有可用的token');
    return false;
  }
  
  try {
    // 使用access token获取用户信息
    const response = await api.get('/users/profile', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });
    
    if (response.status === 200 && response.data.success) {
      logTest('Token认证', 'PASS', '成功获取用户信息');
      
      const userData = response.data.data || response.data.user;
      if (userData && userData.email) {
        logTest('用户数据获取', 'PASS', `用户: ${userData.name || userData.email}`);
      }
      
      return true;
    } else {
      logTest('Token认证', 'FAIL', `状态码: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    logTest('Token认证', 'FAIL', `错误: ${error.message}`);
    if (error.response) {
      console.log(`   响应状态: ${error.response.status}`);
      console.log(`   响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

// 测试4: Token刷新测试
async function testTokenRefresh(tokens) {
  console.log('\n🔄 测试4: Token刷新测试');
  
  if (!tokens || !tokens.refresh_token) {
    logTest('Token刷新测试', 'SKIP', '没有可用的refresh token');
    return false;
  }
  
  try {
    const response = await api.post('/refresh', {
      refresh_token: tokens.refresh_token
    });
    
    if (response.status === 200 && response.data.success) {
      logTest('Token刷新', 'PASS', '成功刷新token');
      
      const newAccessToken = response.data.access_token;
      if (validateJWTFormat(newAccessToken)) {
        logTest('新Token格式', 'PASS', '新access token格式有效');
        return true;
      } else {
        logTest('新Token格式', 'FAIL', '新access token格式无效');
        return false;
      }
    } else {
      logTest('Token刷新', 'FAIL', `状态码: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    logTest('Token刷新', 'FAIL', `错误: ${error.message}`);
    if (error.response) {
      console.log(`   响应状态: ${error.response.status}`);
      console.log(`   响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

// 测试5: 错误处理测试
async function testErrorHandling() {
  console.log('\n⚠️ 测试5: 错误处理测试');
  
  try {
    // 测试无效凭据
    const response = await api.post('/login', {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    });
    
    // 应该返回401错误
    logTest('无效凭据处理', 'FAIL', '应该返回401错误但没有');
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logTest('无效凭据处理', 'PASS', '正确返回401错误');
    } else {
      logTest('无效凭据处理', 'FAIL', `意外错误: ${error.message}`);
    }
  }
  
  try {
    // 测试无效token
    const response = await api.get('/users/profile', {
      headers: {
        'Authorization': 'Bearer invalid_token'
      }
    });
    
    logTest('无效Token处理', 'FAIL', '应该返回401错误但没有');
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      logTest('无效Token处理', 'PASS', '正确返回401错误');
    } else {
      logTest('无效Token处理', 'FAIL', `意外错误: ${error.message}`);
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始执行登录流程测试\n');
  console.log('=' .repeat(50));
  
  const startTime = Date.now();
  
  try {
    // 执行所有测试
    const healthOk = await testAPIHealth();
    const tokens = await testLogin();
    
    if (tokens) {
      await testTokenValidation(tokens);
      await testTokenRefresh(tokens);
    }
    
    await testErrorHandling();
    
  } catch (error) {
    console.error('\n❌ 测试执行过程中发生错误:', error.message);
    testResults.failed++;
  }
  
  // 输出测试结果
  const duration = Date.now() - startTime;
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 测试结果汇总');
  console.log('=' .repeat(50));
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`⏱️ 总耗时: ${duration}ms`);
  console.log(`🌍 测试环境: ${CURRENT_ENV}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ 失败详情:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.details}`);
    });
  }
  
  // 总体结果
  if (testResults.failed === 0) {
    console.log('\n🎉 所有测试通过！登录功能正常工作。');
    process.exit(0);
  } else {
    console.log('\n⚠️ 部分测试失败，请检查上述错误信息。');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('\n💥 测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  TEST_CONFIG,
  testAPIHealth,
  testLogin,
  testTokenValidation,
  testTokenRefresh,
  testErrorHandling
};