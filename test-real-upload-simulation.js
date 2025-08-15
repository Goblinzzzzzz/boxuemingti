/**
 * 实时调试脚本 - 模拟用户上传文件的完整流程
 * 诊断PDF和Word文档上传失败的具体原因
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const API_BASE_URL = 'http://localhost:5173';
const UPLOAD_ENDPOINT = '/api/materials/upload';

// 创建测试文件
function createTestFiles() {
  console.log('\n=== 创建测试文件 ===');
  
  const testDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // 创建测试PDF文件（模拟PDF结构）
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
(测试PDF内容) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000179 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
274
%%EOF`;
  
  const testPdfPath = path.join(testDir, 'test.pdf');
  fs.writeFileSync(testPdfPath, pdfContent);
  console.log('✅ 创建测试PDF文件:', testPdfPath);
  
  // 创建测试文本文件（模拟Word文档）
  const textContent = '这是一个测试文档内容\n包含中文和英文\nTest content for document parsing.';
  const testTxtPath = path.join(testDir, 'test.txt');
  fs.writeFileSync(testTxtPath, textContent, 'utf-8');
  console.log('✅ 创建测试文本文件:', testTxtPath);
  
  // 创建空文件
  const emptyPath = path.join(testDir, 'empty.pdf');
  fs.writeFileSync(emptyPath, '');
  console.log('✅ 创建空文件:', emptyPath);
  
  // 创建损坏的PDF文件
  const corruptedPdfPath = path.join(testDir, 'corrupted.pdf');
  fs.writeFileSync(corruptedPdfPath, 'This is not a PDF file');
  console.log('✅ 创建损坏的PDF文件:', corruptedPdfPath);
  
  return {
    validPdf: testPdfPath,
    textFile: testTxtPath,
    emptyFile: emptyPath,
    corruptedPdf: corruptedPdfPath
  };
}

// 检查后端服务状态
async function checkBackendStatus() {
  console.log('\n=== 检查后端服务状态 ===');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 后端服务正常:', data);
      return true;
    } else {
      console.log('❌ 后端服务响应异常:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ 无法连接到后端服务:', error.message);
    console.log('请确保后端服务正在运行在', API_BASE_URL);
    return false;
  }
}

// 模拟文件上传
async function simulateFileUpload(filePath, filename, expectedType = 'application/pdf') {
  console.log(`\n📤 模拟上传文件: ${filename}`);
  console.log(`文件路径: ${filePath}`);
  
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    console.log(`文件大小: ${stats.size} 字节`);
    
    // 读取文件内容
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`读取到 ${fileBuffer.length} 字节数据`);
    
    // 创建FormData
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: filename,
      contentType: expectedType
    });
    formData.append('title', `测试文档 - ${filename}`);
    formData.append('description', `通过调试脚本上传的测试文档`);
    
    console.log('📡 发送上传请求...');
    
    // 发送请求
    const response = await fetch(`${API_BASE_URL}${UPLOAD_ENDPOINT}`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log(`响应状态: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log('响应内容:', responseText);
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('✅ 上传成功:', result);
        return { success: true, data: result };
      } catch (parseError) {
        console.log('✅ 上传成功，但响应不是JSON格式');
        return { success: true, data: responseText };
      }
    } else {
      try {
        const errorResult = JSON.parse(responseText);
        console.log('❌ 上传失败:', errorResult);
        return { success: false, error: errorResult };
      } catch (parseError) {
        console.log('❌ 上传失败，响应:', responseText);
        return { success: false, error: responseText };
      }
    }
    
  } catch (error) {
    console.log('❌ 上传过程中发生错误:', error.message);
    return { success: false, error: error.message };
  }
}

// 测试直接调用后端解析函数
async function testDirectParsing() {
  console.log('\n=== 测试直接调用后端解析函数 ===');
  
  try {
    // 动态导入后端模块
    const { parseDocumentWithFallback } = await import('./api/utils/pdf-parser-alternative.js');
    
    const testFiles = createTestFiles();
    
    // 测试PDF解析
    console.log('\n📄 直接测试PDF解析:');
    try {
      const pdfBuffer = fs.readFileSync(testFiles.validPdf);
      const pdfResult = await parseDocumentWithFallback(pdfBuffer, 'test.pdf');
      console.log('✅ PDF解析成功:', pdfResult.substring(0, 100));
    } catch (pdfError) {
      console.log('❌ PDF解析失败:', pdfError.message);
    }
    
    // 测试文本文件解析
    console.log('\n📄 直接测试文本文件解析:');
    try {
      const textBuffer = fs.readFileSync(testFiles.textFile);
      const textResult = await parseDocumentWithFallback(textBuffer, 'test.txt');
      console.log('✅ 文本解析成功:', textResult.substring(0, 100));
    } catch (textError) {
      console.log('❌ 文本解析失败:', textError.message);
    }
    
  } catch (importError) {
    console.log('❌ 无法导入后端解析模块:', importError.message);
    console.log('这可能是因为模块路径问题或ES模块兼容性问题');
  }
}

// 主测试函数
async function main() {
  console.log('🔍 开始实时文件上传调试');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('API地址:', API_BASE_URL);
  
  // 1. 检查后端服务
  const backendOk = await checkBackendStatus();
  if (!backendOk) {
    console.log('\n❌ 后端服务不可用，无法进行上传测试');
    console.log('请先启动后端服务: npm run dev');
    return;
  }
  
  // 2. 创建测试文件
  const testFiles = createTestFiles();
  
  // 3. 测试文件上传
  console.log('\n=== 开始文件上传测试 ===');
  
  const uploadTests = [
    {
      name: '有效PDF文件',
      file: testFiles.validPdf,
      filename: 'test.pdf',
      type: 'application/pdf'
    },
    {
      name: '文本文件（作为Word）',
      file: testFiles.textFile,
      filename: 'test.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    },
    {
      name: '空文件',
      file: testFiles.emptyFile,
      filename: 'empty.pdf',
      type: 'application/pdf'
    },
    {
      name: '损坏的PDF文件',
      file: testFiles.corruptedPdf,
      filename: 'corrupted.pdf',
      type: 'application/pdf'
    }
  ];
  
  const results = [];
  
  for (const test of uploadTests) {
    const result = await simulateFileUpload(test.file, test.filename, test.type);
    results.push({
      name: test.name,
      filename: test.filename,
      ...result
    });
    
    // 等待一秒避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 4. 测试直接解析
  await testDirectParsing();
  
  // 5. 总结结果
  console.log('\n============================================================');
  console.log('📊 上传测试结果总结:');
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.name} (${result.filename})`);
    if (result.success) {
      console.log('   ✅ 成功');
    } else {
      console.log('   ❌ 失败:', result.error);
    }
  });
  
  console.log('\n测试完成时间:', new Date().toLocaleString());
  
  // 6. 提供诊断建议
  console.log('\n🔧 诊断建议:');
  const failedTests = results.filter(r => !r.success);
  
  if (failedTests.length === 0) {
    console.log('✅ 所有测试都通过了！文件上传功能正常工作。');
  } else {
    console.log('❌ 发现以下问题:');
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.error}`);
    });
    
    console.log('\n建议检查:');
    console.log('1. 后端错误处理逻辑是否正确捕获所有异常');
    console.log('2. PDF和Word解析库是否在当前环境下正常工作');
    console.log('3. 文件大小和格式验证是否过于严格');
    console.log('4. 错误信息是否准确传递给前端');
  }
}

// 运行测试
main().catch(console.error);