/**
 * 测试实际的文档上传API调用（带认证）
 * 模拟前端发送请求到后端API的完整流程
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://localhost:5173/api';
const TEST_PDF_PATH = './test-files/test.pdf';

// 测试用户凭据
const TEST_USER = {
  email: 'zhaodab@ke.com',
  password: '123456'
};

// 创建测试PDF文件
function createTestPDF() {
  const testDir = './test-files';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // 创建一个简单的PDF内容（Base64编码的最小PDF）
  const minimalPDF = Buffer.from(
    'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgNCAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCAyOAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKEhlbGxvIFdvcmxkKSBUagpFVApzdHJlYW0KZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDIwNCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDUKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjI4MgolJUVPRg==',
    'base64'
  );
  
  fs.writeFileSync(TEST_PDF_PATH, minimalPDF);
  console.log('✅ 测试PDF文件创建成功');
}

// 用户登录获取token
async function loginUser() {
  try {
    console.log('🔐 用户登录获取token...');
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    console.log(`📡 登录响应状态: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ 登录成功');
      console.log('🔍 登录响应:', JSON.stringify(result, null, 2));
      const token = result.access_token || result.token;
      console.log('🔑 获取到token:', token ? '是' : '否');
      return token;
    } else {
      const errorText = await response.text();
      console.log('❌ 登录失败:', errorText);
      return null;
    }
  } catch (error) {
    console.log('❌ 登录异常:', error.message);
    return null;
  }
}

// 测试API连接（带认证）
async function testAPIConnection(token) {
  try {
    console.log('🔍 测试API连接（带认证）...');
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/materials`, {
      method: 'GET',
      headers
    });
    
    console.log(`📡 API响应状态: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ API连接正常');
      const result = await response.json();
      console.log('📊 获取到教材数量:', result.data ? result.data.length : 0);
      return true;
    } else {
      console.log('❌ API连接失败');
      const errorText = await response.text();
      console.log('错误信息:', errorText);
      return false;
    }
  } catch (error) {
    console.log('❌ API连接异常:', error.message);
    return false;
  }
}

// 测试文档上传（带认证）
async function testDocumentUpload(token) {
  try {
    console.log('📄 测试文档上传（带认证）...');
    
    // 创建FormData
    const formData = new FormData();
    const fileStream = fs.createReadStream(TEST_PDF_PATH);
    formData.append('file', fileStream, {
      filename: 'test-upload.pdf',
      contentType: 'application/pdf'
    });
    formData.append('title', '测试教材文档');
    formData.append('type', 'file');
    
    console.log('📤 发送上传请求...');
    
    const headers = {
      ...formData.getHeaders()
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/materials/upload`, {
      method: 'POST',
      body: formData,
      headers
    });
    
    console.log(`📡 上传响应状态: ${response.status}`);
    
    const responseText = await response.text();
    console.log('📝 响应内容:', responseText);
    
    if (response.ok) {
      console.log('✅ 文档上传成功');
      try {
        const result = JSON.parse(responseText);
        console.log('📊 上传结果:', result);
      } catch (e) {
        console.log('⚠️  响应不是JSON格式');
      }
      return true;
    } else {
      console.log('❌ 文档上传失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 上传异常:', error.message);
    console.log('🔍 错误详情:', error);
    return false;
  }
}

// 测试无认证上传（验证错误处理）
async function testUploadWithoutAuth() {
  try {
    console.log('🔍 测试无认证上传（验证错误处理）...');
    
    const formData = new FormData();
    const fileStream = fs.createReadStream(TEST_PDF_PATH);
    formData.append('file', fileStream, {
      filename: 'test-upload.pdf',
      contentType: 'application/pdf'
    });
    formData.append('title', '测试教材文档');
    
    const response = await fetch(`${API_BASE_URL}/materials/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log(`📡 无认证上传响应状态: ${response.status}`);
    const responseText = await response.text();
    console.log('📝 无认证响应:', responseText);
    
    if (response.status === 401) {
      console.log('✅ 认证验证正常工作');
      return true;
    } else {
      console.log('⚠️  认证验证可能存在问题');
      return false;
    }
  } catch (error) {
    console.log('❌ 无认证测试异常:', error.message);
    return false;
  }
}

// 主测试函数
async function runAPITests() {
  console.log('🚀 开始带认证的API上传测试...');
  console.log('============================================================');
  
  // 创建测试文件
  createTestPDF();
  
  // 首先测试无认证上传
  await testUploadWithoutAuth();
  
  // 用户登录获取token
  const token = await loginUser();
  if (!token) {
    console.log('❌ 无法获取认证token，无法继续测试');
    return;
  }
  
  // 测试API连接
  const apiConnected = await testAPIConnection(token);
  if (!apiConnected) {
    console.log('❌ API连接失败，但继续测试上传');
  }
  
  // 测试文档上传
  const uploadSuccess = await testDocumentUpload(token);
  
  console.log('============================================================');
  console.log('🎯 API测试完成');
  console.log(`📊 测试结果: 登录${token ? '✅' : '❌'} | API连接${apiConnected ? '✅' : '❌'} | 上传${uploadSuccess ? '✅' : '❌'}`);
  
  // 清理测试文件
  try {
    fs.unlinkSync(TEST_PDF_PATH);
    fs.rmdirSync('./test-files');
    console.log('🧹 测试文件清理完成');
  } catch (error) {
    console.log('⚠️  测试文件清理失败:', error.message);
  }
}

// 运行测试
runAPITests().catch(console.error);