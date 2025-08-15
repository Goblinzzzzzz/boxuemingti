const fs = require('fs');
const FormData = require('form-data');

// 使用动态导入来处理 node-fetch
let fetch;

async function initFetch() {
  if (!fetch) {
    try {
      const nodeFetch = await import('node-fetch');
      fetch = nodeFetch.default;
    } catch (error) {
      console.error('❌ 无法导入 node-fetch:', error.message);
      throw error;
    }
  }
  return fetch;
}

// 测试用户登录并获取token
async function testLogin() {
  console.log('🔐 测试用户登录...');
  
  try {
    await initFetch();
    
    // 使用测试用户凭据
    const loginData = {
      email: 'test@example.com',
      password: 'test123456'
    };
    
    console.log('📤 发送登录请求...');
    const response = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });
    
    console.log('📥 登录响应状态:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 登录成功');
      console.log('🎫 获取到token:', result.access_token ? '是' : '否');
      if (result.access_token) {
        console.log('🔑 Token类型: JWT');
        console.log('👤 用户信息:', result.user ? `${result.user.name} (${result.user.email})` : '未知');
      }
      return result.access_token;
    } else {
      const errorResult = await response.text();
      console.log('❌ 登录失败:', errorResult);
      return null;
    }
  } catch (error) {
    console.error('❌ 登录过程中出现错误:', error.message);
    return null;
  }
}

// 测试用户注册
async function testRegister() {
  console.log('📝 测试用户注册...');
  
  try {
    await initFetch();
    
    // 使用测试用户数据
    const registerData = {
      email: 'test@example.com',
      password: 'test123456',
      name: '测试用户',
      organization: '测试机构'
    };
    
    console.log('📤 发送注册请求...');
    const response = await fetch('http://localhost:3003/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData)
    });
    
    console.log('📥 注册响应状态:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 注册成功');
      return true;
    } else {
      const errorResult = await response.text();
      console.log('⚠️ 注册失败（可能用户已存在）:', errorResult);
      return false;
    }
  } catch (error) {
    console.error('❌ 注册过程中出现错误:', error.message);
    return false;
  }
}

// 创建测试文档
function createTestDocument() {
  const testContent = '这是一个测试文档\n\n包含一些中文内容用于测试文档解析功能。\n\n测试内容：\n1. 第一行测试\n2. 第二行测试\n3. 第三行测试';
  
  // 创建测试文本文件
  fs.writeFileSync('/tmp/test-document.txt', testContent, 'utf8');
  console.log('✅ 创建测试文档: /tmp/test-document.txt');
  
  return '/tmp/test-document.txt';
}

// 测试带认证的文件上传
async function testAuthenticatedFileUpload(token) {
  console.log('🧪 开始测试带认证的文件上传功能...');
  
  try {
    // 创建测试文档
    const testFilePath = createTestDocument();
    
    // 创建 FormData
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('title', '测试教材文档');
    
    console.log('📤 发送带认证的上传请求到 http://localhost:3003/api/materials/upload');
    
    await initFetch();
    // 发送上传请求
    const response = await fetch('http://localhost:3003/api/materials/upload', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📥 响应状态:', response.status, response.statusText);
    
    const result = await response.text();
    console.log('📄 响应内容:', result);
    
    if (response.ok) {
      console.log('✅ 带认证的文件上传测试成功');
      
      // 尝试解析响应为JSON以获取更多信息
      try {
        const jsonResult = JSON.parse(result);
        if (jsonResult.data && jsonResult.data.id) {
          console.log('📋 上传的教材ID:', jsonResult.data.id);
        }
      } catch (parseError) {
        console.log('⚠️ 响应不是JSON格式，但上传成功');
      }
    } else {
      console.log('❌ 带认证的文件上传测试失败');
    }
    
  } catch (error) {
    console.error('❌ 上传测试过程中出现错误:', error.message);
    console.error('错误详情:', error.stack);
  } finally {
    // 清理测试文件
    try {
      fs.unlinkSync('/tmp/test-document.txt');
      console.log('🧹 清理测试文件');
    } catch (cleanupError) {
      console.warn('⚠️ 清理测试文件失败:', cleanupError.message);
    }
  }
}

// 运行完整的认证和上传测试
async function runAuthenticatedTests() {
  console.log('🚀 开始运行完整的认证和文档上传测试...');
  
  // 首先尝试登录
  let token = await testLogin();
  
  // 如果登录失败，尝试注册
  if (!token) {
    console.log('🔄 登录失败，尝试注册新用户...');
    const registerSuccess = await testRegister();
    
    if (registerSuccess) {
      // 注册成功后再次尝试登录
      console.log('🔄 注册成功，重新尝试登录...');
      token = await testLogin();
    }
  }
  
  // 如果有token，测试文件上传
  if (token) {
    await testAuthenticatedFileUpload(token);
  } else {
    console.log('❌ 无法获取有效的认证token，跳过文件上传测试');
    console.log('💡 请检查用户认证系统是否正常工作');
  }
  
  console.log('🏁 认证和上传测试完成');
}

// 检查依赖并运行测试
try {
  require('form-data');
  console.log('✅ 测试依赖检查通过');
  runAuthenticatedTests().catch(console.error);
} catch (error) {
  console.error('❌ 缺少测试依赖:', error.message);
  console.log('💡 请运行: npm install form-data node-fetch');
}