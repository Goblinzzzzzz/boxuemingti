/**
 * PDF内容解析调试脚本
 * 模拟materials.ts的完整PDF处理流程
 * 专门诊断PDF内容解析失败问题
 */

const fs = require('fs');
const path = require('path');

// 创建测试PDF文件
function createTestPdf() {
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
  
  return Buffer.from(pdfContent);
}

// 测试vercel-compatibility模块
async function testVercelCompatibility() {
  console.log('\n🔍 测试vercel-compatibility模块...');
  
  try {
    const module = await import('./api/vercel-compatibility.ts');
    const { parseDocumentWithFallback } = module;
    console.log('✅ vercel-compatibility模块加载成功');
    
    const testPdf = createTestPdf();
    console.log(`📄 测试PDF大小: ${testPdf.length} 字节`);
    
    // 模拟materials.ts的调用方式
    const mimetype = 'application/pdf';
    const originalname = 'test.pdf';
    
    console.log('📄 开始解析PDF (模拟materials.ts调用)...');
    const content = await parseDocumentWithFallback(testPdf, mimetype, originalname);
    
    console.log(`✅ PDF解析成功: ${content.length} 字符`);
    console.log(`📝 提取内容: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);    
    
    return { success: true, content };
  } catch (error) {
    console.error('❌ vercel-compatibility测试失败:', error.message);
    console.error('📋 错误堆栈:', error.stack);
    return { success: false, error: error.message };
  }
}

// 测试pdf-parser-alternative模块
async function testPdfParserAlternative() {
  console.log('\n🔍 测试pdf-parser-alternative模块...');
  
  try {
    const { parseDocumentWithFallback } = require('./api/pdf-parser-alternative.js');
    console.log('✅ pdf-parser-alternative模块加载成功');
    
    const testPdf = createTestPdf();
    console.log(`📄 测试PDF大小: ${testPdf.length} 字节`);
    
    console.log('📄 开始解析PDF...');
    const content = await parseDocumentWithFallback(testPdf, 'test.pdf');
    
    console.log(`✅ PDF解析成功: ${content.length} 字符`);
    console.log(`📝 提取内容: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);    
    
    return { success: true, content };
  } catch (error) {
    console.error('❌ pdf-parser-alternative测试失败:', error.message);
    console.error('📋 错误堆栈:', error.stack);
    return { success: false, error: error.message };
  }
}

// 测试pdfjs-dist直接调用
async function testPdfjsDirect() {
  console.log('\n🔍 测试pdfjs-dist直接调用...');
  
  try {
    const pdfjsLib = require('pdfjs-dist');
    console.log('✅ pdfjs-dist库加载成功');
    
    // 检查worker配置
    console.log('🔧 Worker配置:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    
    const testPdf = createTestPdf();
    console.log(`📄 测试PDF大小: ${testPdf.length} 字节`);
    
    console.log('📄 开始解析PDF...');
    // 转换Buffer为Uint8Array
    const uint8Array = new Uint8Array(testPdf);
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    console.log(`📊 PDF信息: ${pdf.numPages} 页`);
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log(`✅ PDF解析成功: ${fullText.length} 字符`);
    console.log(`📝 提取内容: "${fullText.substring(0, 100)}${fullText.length > 100 ? '...' : ''}"`);    
    
    return { success: true, content: fullText };
  } catch (error) {
    console.error('❌ pdfjs-dist直接测试失败:', error.message);
    console.error('📋 错误堆栈:', error.stack);
    return { success: false, error: error.message };
  }
}

// 测试真实PDF文件
async function testRealPdfFile() {
  console.log('\n🔍 测试真实PDF文件...');
  
  const testFiles = [
    './test/data/sample.pdf',
    './test/data/test.pdf',
    './sample.pdf',
    './test.pdf'
  ];
  
  let testFile = null;
  for (const file of testFiles) {
    if (fs.existsSync(file)) {
      testFile = file;
      break;
    }
  }
  
  if (!testFile) {
    console.log('⚠️ 未找到真实PDF文件，跳过测试');
    return { success: false, error: '未找到测试文件' };
  }
  
  try {
    const module = await import('./api/vercel-compatibility.ts');
    const { parseDocumentWithFallback } = module;
    const buffer = fs.readFileSync(testFile);
    
    console.log(`📄 测试文件: ${testFile}`);
    console.log(`📄 文件大小: ${buffer.length} 字节`);
    
    const content = await parseDocumentWithFallback(buffer, 'application/pdf', path.basename(testFile));
    
    console.log(`✅ 真实PDF解析成功: ${content.length} 字符`);
    console.log(`📝 提取内容: "${content.substring(0, 200)}${content.length > 200 ? '...' : ''}"`);    
    
    return { success: true, content };
  } catch (error) {
    console.error('❌ 真实PDF测试失败:', error.message);
    console.error('📋 错误堆栈:', error.stack);
    return { success: false, error: error.message };
  }
}

// 主测试函数
async function runDiagnostics() {
  console.log('🚀 开始PDF内容解析诊断...');
  console.log('=' .repeat(60));
  
  const results = {
    vercelCompatibility: await testVercelCompatibility(),
    pdfParserAlternative: await testPdfParserAlternative(),
    pdfjsDirect: await testPdfjsDirect(),
    realPdfFile: await testRealPdfFile()
  };
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 诊断结果总结:');
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅ 通过' : '❌ 失败';
    console.log(`   ${test}: ${status}`);
    if (!result.success) {
      console.log(`      错误: ${result.error}`);
    }
  });
  
  // 分析问题
  console.log('\n🔍 问题分析:');
  
  if (!results.pdfjsDirect.success) {
    console.log('   - pdfjs-dist库配置存在问题');
  }
  
  if (!results.pdfParserAlternative.success) {
    console.log('   - pdf-parser-alternative模块存在问题');
  }
  
  if (!results.vercelCompatibility.success) {
    console.log('   - vercel-compatibility模块存在问题');
  }
  
  if (results.vercelCompatibility.success && results.pdfParserAlternative.success && results.pdfjsDirect.success) {
    console.log('   - 所有模块工作正常，问题可能在其他地方');
  }
  
  console.log(`\n测试完成时间: ${new Date().toLocaleString()}`);
}

// 运行诊断
runDiagnostics().catch(error => {
  console.error('诊断脚本执行失败:', error);
  process.exit(1);
});