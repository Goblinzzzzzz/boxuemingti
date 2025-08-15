const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// 动态导入fetch
let fetch;

// 初始化fetch
async function initFetch() {
  if (!fetch) {
    const { default: nodeFetch } = await import('node-fetch');
    fetch = nodeFetch;
  }
  return fetch;
}

// 配置
const API_BASE = 'http://localhost:5173/api';
const TEST_USER = {
  email: 'zhaodan@ke.com',
  password: '123456'
};

// 创建真实的测试文件
function createRealTestFiles() {
  console.log('📝 创建真实测试文件...');
  
  // 创建一个更完整的PDF内容
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 120
>>
stream
BT
/F1 12 Tf
72 720 Td
(这是一个测试PDF文档) Tj
0 -20 Td
(包含中文和English内容) Tj
0 -20 Td
(用于验证PDF解析功能) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000290 00000 n 
0000000460 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
540
%%EOF`;
  
  // 创建一个简单的DOCX文件（ZIP格式）
  const docxContent = Buffer.from([
    0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, // ZIP header
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x13, 0x00, 0x00, 0x00, 0x5B, 0x43, 0x6F, 0x6E,
    0x74, 0x65, 0x6E, 0x74, 0x5F, 0x54, 0x79, 0x70, 0x65, 0x73,
    0x5D, 0x2E, 0x78, 0x6D, 0x6C // [Content_Types].xml
  ]);
  
  // 创建文本文件
  const txtContent = '这是一个真实的测试文本文件\n包含中文和English混合内容\n用于验证文本解析功能\n测试用户：zhaodan@ke.com';
  
  // 写入测试文件
  fs.writeFileSync('./test-real.pdf', pdfContent);
  fs.writeFileSync('./test-real.docx', docxContent);
  fs.writeFileSync('./test-real.txt', txtContent);
  
  console.log('✅ 真实测试文件创建完成');
  console.log(`📄 PDF文件大小: ${fs.statSync('./test-real.pdf').size} bytes`);
  console.log(`📄 DOCX文件大小: ${fs.statSync('./test-real.docx').size} bytes`);
  console.log(`📄 TXT文件大小: ${fs.statSync('./test-real.txt').size} bytes`);
}

// API健康检查
async function checkApiHealth() {
  try {
    console.log('🏥 检查API健康状态...');
    const response = await fetch(`${API_BASE}/health`);
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ API健康检查通过:', result.message);
      return true;
    } else {
      console.error('❌ API健康检查失败:', result);
      return false;
    }
  } catch (error) {
    console.error('🚨 API健康检查错误:', error.message);
    return false;
  }
}

// 用户登录
async function loginUser() {
  try {
    console.log('🔐 用户登录...');
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const result = await response.json();
    
    console.log('🔍 登录响应调试:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success && result.access_token) {
      console.log('✅ 用户登录成功');
      console.log('👤 用户信息:', result.user?.name || '未知', result.user?.email || '未知');
      return result.access_token;
    } else {
      console.error('❌ 用户登录失败:', result);
      console.error('🔍 响应状态:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('🚨 用户登录错误:', error.message);
    return null;
  }
}

// 上传文件
async function uploadFile(token, filePath, fileName, mimeType) {
  try {
    console.log(`📤 上传文件: ${fileName}...`);
    
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: mimeType
    });
    formData.append('title', `测试文档-${fileName}`);
    formData.append('description', `通过自动化测试上传的${fileName}文件`);
    
    const response = await fetch(`${API_BASE}/materials/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ ${fileName} 上传成功`);
      console.log(`📊 提取内容长度: ${result.data.content?.length || 0} 字符`);
      if (result.data.content) {
        console.log(`📝 内容预览: ${result.data.content.substring(0, 100)}...`);
      }
      return { success: true, data: result.data };
    } else {
      console.error(`❌ ${fileName} 上传失败:`, result.message || result.error);
      return { success: false, error: result.message || result.error };
    }
  } catch (error) {
    console.error(`🚨 ${fileName} 上传错误:`, error.message);
    return { success: false, error: error.message };
  }
}

// 主测试函数
async function main() {
  console.log('🚀 开始真实用户上传测试');
  
  // 初始化fetch
  await initFetch();
  console.log('='.repeat(60));
  console.log(`👤 测试用户: ${TEST_USER.email}`);
  console.log(`🌐 API地址: ${API_BASE}`);
  console.log('='.repeat(60));
  
  // 创建测试文件
  createRealTestFiles();
  
  // 检查API健康状态
  const apiHealthy = await checkApiHealth();
  if (!apiHealthy) {
    console.log('🛑 API不可用，测试终止');
    return;
  }
  
  // 用户登录
  const token = await loginUser();
  if (!token) {
    console.log('🛑 用户登录失败，测试终止');
    return;
  }
  
  console.log('\n📤 开始文件上传测试...');
  
  // 测试文件列表
  const testFiles = [
    {
      path: './test-real.txt',
      name: 'test-real.txt',
      mimeType: 'text/plain'
    },
    {
      path: './test-real.pdf',
      name: 'test-real.pdf',
      mimeType: 'application/pdf'
    },
    {
      path: './test-real.docx',
      name: 'test-real.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
  ];
  
  const results = [];
  
  // 逐个上传文件
  for (const file of testFiles) {
    console.log(`\n${'='.repeat(40)}`);
    const result = await uploadFile(token, file.path, file.name, file.mimeType);
    results.push({ file: file.name, ...result });
    
    // 等待一秒，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 统计结果
  console.log('\n📊 测试结果统计:');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    const error = result.error ? ` - ${result.error}` : '';
    console.log(`${status} ${result.file}${error}`);
  });
  
  console.log(`\n📈 总体成功率: ${successCount}/${totalCount} (${(successCount/totalCount*100).toFixed(1)}%)`);
  
  // 清理测试文件
  try {
    fs.unlinkSync('./test-real.pdf');
    fs.unlinkSync('./test-real.docx');
    fs.unlinkSync('./test-real.txt');
    console.log('\n🧹 测试文件清理完成');
  } catch (error) {
    console.log('⚠️ 清理测试文件时出错:', error.message);
  }
  
  console.log('\n✅ 真实用户上传测试完成');
  
  // 如果有失败的上传，提供诊断信息
  if (successCount < totalCount) {
    console.log('\n🔍 失败诊断建议:');
    console.log('1. 检查开发服务器日志中的详细错误信息');
    console.log('2. 验证文档解析库的安装状态');
    console.log('3. 检查文件大小和格式限制');
    console.log('4. 确认用户权限和认证状态');
  }
}

// 运行测试
main().catch(console.error);