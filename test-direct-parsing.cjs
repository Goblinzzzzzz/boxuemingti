const fs = require('fs');
const path = require('path');

// 创建测试文件
function createTestFiles() {
  console.log('📝 创建测试文件...');
  
  // 创建简单的PDF测试内容（模拟PDF结构）
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
(Hello World) Tj
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
235
%%EOF`;
  
  // 创建简单的文本文件
  const txtContent = '这是一个测试文本文件，用于验证文本解析功能。\n包含中文和English混合内容。';
  
  // 写入测试文件
  fs.writeFileSync('./test-simple.pdf', pdfContent);
  fs.writeFileSync('./test-simple.txt', txtContent);
  
  console.log('✅ 测试文件创建完成');
}

// 直接测试解析函数
async function testDirectParsing() {
  try {
    console.log('🧪 开始直接解析测试...');
    
    // 导入解析函数
    const { parseDocumentWithFallback } = require('./api/vercel-compatibility.ts');
    
    // 测试文本文件
    console.log('\n📄 测试文本文件解析...');
    const txtBuffer = fs.readFileSync('./test-simple.txt');
    try {
      const txtResult = await parseDocumentWithFallback(txtBuffer, 'text/plain', 'test-simple.txt');
      console.log('✅ 文本解析成功:', txtResult.substring(0, 100));
    } catch (error) {
      console.error('❌ 文本解析失败:', error.message);
    }
    
    // 测试PDF文件
    console.log('\n📄 测试PDF文件解析...');
    const pdfBuffer = fs.readFileSync('./test-simple.pdf');
    try {
      const pdfResult = await parseDocumentWithFallback(pdfBuffer, 'application/pdf', 'test-simple.pdf');
      console.log('✅ PDF解析成功:', pdfResult.substring(0, 100));
    } catch (error) {
      console.error('❌ PDF解析失败:', error.message);
    }
    
    // 测试真实PDF文件（如果存在）
    const realPdfPath = './test-real.pdf';
    if (fs.existsSync(realPdfPath)) {
      console.log('\n📄 测试真实PDF文件解析...');
      const realPdfBuffer = fs.readFileSync(realPdfPath);
      try {
        const realPdfResult = await parseDocumentWithFallback(realPdfBuffer, 'application/pdf', 'test-real.pdf');
        console.log('✅ 真实PDF解析成功，字符数:', realPdfResult.length);
        console.log('前100字符:', realPdfResult.substring(0, 100));
      } catch (error) {
        console.error('❌ 真实PDF解析失败:', error.message);
      }
    }
    
    // 测试真实Word文件（如果存在）
    const realDocxPath = './test-real.docx';
    if (fs.existsSync(realDocxPath)) {
      console.log('\n📄 测试真实Word文件解析...');
      const realDocxBuffer = fs.readFileSync(realDocxPath);
      try {
        const realDocxResult = await parseDocumentWithFallback(realDocxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'test-real.docx');
        console.log('✅ 真实Word解析成功，字符数:', realDocxResult.length);
        console.log('前100字符:', realDocxResult.substring(0, 100));
      } catch (error) {
        console.error('❌ 真实Word解析失败:', error.message);
      }
    }
    
  } catch (error) {
    console.error('🚨 测试过程中发生错误:', error);
  }
}

// 测试依赖库状态
async function testDependencies() {
  console.log('\n🔍 检查依赖库状态...');
  
  // 测试pdf-parse
  try {
    const pdfParse = require('pdf-parse');
    console.log('✅ pdf-parse库可用');
  } catch (error) {
    console.error('❌ pdf-parse库不可用:', error.message);
  }
  
  // 测试mammoth
  try {
    const mammoth = require('mammoth');
    console.log('✅ mammoth库可用');
  } catch (error) {
    console.error('❌ mammoth库不可用:', error.message);
  }
  
  // 测试pdfjs-dist
  try {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    console.log('✅ pdfjs-dist库可用');
  } catch (error) {
    console.error('❌ pdfjs-dist库不可用:', error.message);
  }
}

// 主函数
async function main() {
  console.log('🚀 开始直接解析测试');
  console.log('='.repeat(50));
  
  await testDependencies();
  createTestFiles();
  await testDirectParsing();
  
  // 清理测试文件
  try {
    fs.unlinkSync('./test-simple.pdf');
    fs.unlinkSync('./test-simple.txt');
    console.log('\n🧹 测试文件清理完成');
  } catch (error) {
    console.log('⚠️ 清理测试文件时出错:', error.message);
  }
  
  console.log('\n✅ 直接解析测试完成');
}

// 运行测试
main().catch(console.error);