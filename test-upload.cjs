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

// 创建一个简单的测试文档
function createTestDocument() {
  const testContent = '这是一个测试文档\n\n包含一些中文内容用于测试文档解析功能。\n\n测试内容：\n1. 第一行测试\n2. 第二行测试\n3. 第三行测试';
  
  // 创建测试文本文件
  fs.writeFileSync('/tmp/test-document.txt', testContent, 'utf8');
  console.log('✅ 创建测试文档: /tmp/test-document.txt');
  
  return '/tmp/test-document.txt';
}

// 测试文件上传
async function testFileUpload() {
  console.log('🧪 开始测试文件上传功能...');
  
  try {
    // 创建测试文档
    const testFilePath = createTestDocument();
    
    // 创建 FormData
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('title', '测试教材文档');
    
    console.log('📤 发送上传请求到 http://localhost:3003/api/materials/upload');
    
    // 发送上传请求
    await initFetch();
    const response = await fetch('http://localhost:3003/api/materials/upload', {
      method: 'POST',
      body: form,
      headers: {
        // 注意：不要手动设置 Content-Type，让 FormData 自动设置
        // 'Authorization': 'Bearer test-token' // 暂时移除认证测试文件上传逻辑
      }
    });
    
    console.log('📥 响应状态:', response.status, response.statusText);
    
    const result = await response.text();
    console.log('📄 响应内容:', result);
    
    if (response.ok) {
      console.log('✅ 文件上传测试成功');
    } else {
      console.log('❌ 文件上传测试失败');
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

// 测试基本的 API 连接
async function testApiConnection() {
  console.log('🔗 测试 API 连接...');
  
  try {
    await initFetch();
    const response = await fetch('http://localhost:3003/api/health');
    console.log('🏥 健康检查响应状态:', response.status);
    
    if (response.ok) {
      const result = await response.text();
      console.log('🏥 健康检查响应:', result);
      console.log('✅ API 服务器连接正常');
      return true;
    } else {
      console.log('❌ API 服务器连接失败');
      return false;
    }
  } catch (error) {
    console.error('❌ API 连接测试失败:', error.message);
    return false;
  }
}

// 运行测试
async function runTests() {
  console.log('🚀 开始运行文档上传测试...');
  
  // 首先测试 API 连接
  const apiConnected = await testApiConnection();
  
  if (!apiConnected) {
    console.log('⚠️ API 服务器未运行或无法连接，跳过上传测试');
    console.log('💡 请确保运行了 npm run dev 启动开发服务器');
    return;
  }
  
  // 测试文件上传
  await testFileUpload();
  
  console.log('🏁 测试完成');
}

// 检查依赖
try {
  require('form-data');
  require('node-fetch');
  console.log('✅ 测试依赖检查通过');
  runTests().catch(console.error);
} catch (error) {
  console.error('❌ 缺少测试依赖:', error.message);
  console.log('💡 请运行: npm install form-data node-fetch');
}