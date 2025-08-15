const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

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

// 获取认证token
async function getAuthToken() {
  try {
    await initFetch();
    
    const loginData = {
      email: 'test@example.com',
      password: 'test123456'
    };
    
    const response = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });
    
    if (response.ok) {
      const result = await response.json();
      return result.access_token;
    }
    return null;
  } catch (error) {
    console.error('获取token失败:', error.message);
    return null;
  }
}

// 创建测试PDF内容（简单的PDF结构）
function createTestPDF() {
  // 创建一个最简单的PDF文件内容
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
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(测试PDF文档内容) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF`;
  
  const filePath = '/tmp/test-document.pdf';
  fs.writeFileSync(filePath, pdfContent, 'binary');
  console.log('✅ 创建测试PDF文档:', filePath);
  return filePath;
}

// 创建测试文本文件
function createTestTXT() {
  const content = '这是一个测试文本文档\n\n包含中文内容用于测试解析功能。\n\n测试要点：\n1. 文本编码处理\n2. 中文字符支持\n3. 换行符处理\n4. 特殊字符：@#$%^&*()\n\n结束测试内容。';
  const filePath = '/tmp/test-document.txt';
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ 创建测试TXT文档:', filePath);
  return filePath;
}

// 创建测试DOCX文件（简化的ZIP结构）
function createTestDOCX() {
  // 这里创建一个简单的文本文件，模拟DOCX（实际DOCX是复杂的ZIP格式）
  const content = '这是一个模拟的DOCX文档内容\n\n用于测试Word文档解析功能。\n\n包含：\n- 中文文本\n- 格式化内容\n- 多段落结构';
  const filePath = '/tmp/test-document.docx';
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ 创建测试DOCX文档（模拟）:', filePath);
  return filePath;
}

// 测试单个文档上传
async function testDocumentUpload(filePath, expectedType, token) {
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(fileName);
  
  console.log(`\n📄 测试 ${fileExtension.toUpperCase()} 文档上传: ${fileName}`);
  
  try {
    await initFetch();
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.log(`❌ 文件不存在: ${filePath}`);
      return false;
    }
    
    const stats = fs.statSync(filePath);
    console.log(`📊 文件大小: ${stats.size} 字节`);
    
    // 创建FormData
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('title', `测试${fileExtension.toUpperCase()}文档`);
    
    console.log('📤 发送上传请求...');
    const response = await fetch('http://localhost:3003/api/materials/upload', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`📥 响应状态: ${response.status} ${response.statusText}`);
    
    const result = await response.text();
    
    if (response.ok) {
      try {
        const jsonResult = JSON.parse(result);
        console.log('✅ 上传成功');
        console.log(`📋 教材ID: ${jsonResult.data?.id || '未知'}`);
        console.log(`📝 提取内容长度: ${jsonResult.data?.content?.length || 0} 字符`);
        
        // 显示提取内容的前100个字符
        if (jsonResult.data?.content) {
          const preview = jsonResult.data.content.substring(0, 100);
          console.log(`📖 内容预览: ${preview}${jsonResult.data.content.length > 100 ? '...' : ''}`);
        }
        
        return true;
      } catch (parseError) {
        console.log('✅ 上传成功（响应格式异常）');
        console.log('📄 原始响应:', result.substring(0, 200));
        return true;
      }
    } else {
      console.log('❌ 上传失败');
      console.log('📄 错误响应:', result);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ 上传过程中出现错误: ${error.message}`);
    return false;
  }
}

// 清理测试文件
function cleanupTestFiles(filePaths) {
  console.log('\n🧹 清理测试文件...');
  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ 删除: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.warn(`⚠️ 删除失败: ${path.basename(filePath)} - ${error.message}`);
    }
  });
}

// 运行文档格式测试
async function runDocumentFormatTests() {
  console.log('🚀 开始运行不同格式文档解析测试...');
  
  // 获取认证token
  console.log('🔐 获取认证token...');
  const token = await getAuthToken();
  
  if (!token) {
    console.log('❌ 无法获取认证token，使用已知token进行测试');
    // 这里可以手动设置一个已知的有效token进行测试
    console.log('💡 请确保已经登录并获取有效token');
    return;
  }
  
  console.log('✅ 获取token成功');
  
  // 创建测试文档
  console.log('\n📝 创建测试文档...');
  const testFiles = [];
  
  try {
    testFiles.push(createTestTXT());
    testFiles.push(createTestPDF());
    testFiles.push(createTestDOCX());
  } catch (error) {
    console.error('❌ 创建测试文档失败:', error.message);
    return;
  }
  
  // 测试结果统计
  const results = {
    total: testFiles.length,
    success: 0,
    failed: 0
  };
  
  // 逐个测试文档上传
  for (const filePath of testFiles) {
    const success = await testDocumentUpload(filePath, null, token);
    if (success) {
      results.success++;
    } else {
      results.failed++;
    }
    
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 清理测试文件
  cleanupTestFiles(testFiles);
  
  // 输出测试结果
  console.log('\n📊 测试结果统计:');
  console.log(`📈 总计: ${results.total} 个文档`);
  console.log(`✅ 成功: ${results.success} 个`);
  console.log(`❌ 失败: ${results.failed} 个`);
  console.log(`📊 成功率: ${((results.success / results.total) * 100).toFixed(1)}%`);
  
  if (results.success === results.total) {
    console.log('🎉 所有文档格式测试通过！');
  } else if (results.success > 0) {
    console.log('⚠️ 部分文档格式测试通过，需要检查失败的格式');
  } else {
    console.log('❌ 所有文档格式测试失败，需要检查文档解析功能');
  }
  
  console.log('🏁 文档格式测试完成');
}

// 检查依赖并运行测试
try {
  require('form-data');
  console.log('✅ 测试依赖检查通过');
  runDocumentFormatTests().catch(console.error);
} catch (error) {
  console.error('❌ 缺少测试依赖:', error.message);
  console.log('💡 请运行: npm install form-data node-fetch');
}