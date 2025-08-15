#!/usr/bin/env node

/**
 * PDF解析功能调试脚本
 * 专门测试PDF解析库的工作状态
 */

import fs from 'fs';
import path from 'path';

// 测试pdfjs-dist库的可用性
async function testPdfjsAvailability() {
  console.log('=== 测试pdfjs-dist库可用性 ===\n');
  
  try {
    console.log('1. 尝试导入pdfjs-dist...');
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log('✅ pdfjs-dist导入成功');
    console.log(`版本: ${pdfjsLib.version || '未知版本'}`);
    
    // 设置worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = null;
    console.log('✅ Worker配置完成\n');
    
    return { success: true, pdfjsLib };
  } catch (error) {
    console.error('❌ pdfjs-dist导入失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return { success: false, error };
  }
}

// 测试PDF解析替代方案
async function testPdfParserAlternative() {
  console.log('=== 测试PDF解析替代方案 ===\n');
  
  try {
    console.log('1. 导入pdf-parser-alternative模块...');
    const { parseDocumentWithFallback, checkPdfjsAvailability } = await import('./api/pdf-parser-alternative.js');
    console.log('✅ pdf-parser-alternative模块导入成功');
    
    console.log('\n2. 检查pdfjs可用性...');
    const availability = await checkPdfjsAvailability();
    console.log('pdfjs可用性检查结果:', availability);
    
    console.log('\n3. 创建测试PDF文件...');
    // 创建一个更完整的测试PDF
    const testPdfContent = Buffer.from(
      '%PDF-1.4\n' +
      '1 0 obj\n' +
      '<<\n' +
      '/Type /Catalog\n' +
      '/Pages 2 0 R\n' +
      '>>\n' +
      'endobj\n' +
      '2 0 obj\n' +
      '<<\n' +
      '/Type /Pages\n' +
      '/Kids [3 0 R]\n' +
      '/Count 1\n' +
      '>>\n' +
      'endobj\n' +
      '3 0 obj\n' +
      '<<\n' +
      '/Type /Page\n' +
      '/Parent 2 0 R\n' +
      '/MediaBox [0 0 612 792]\n' +
      '/Contents 4 0 R\n' +
      '/Resources <<\n' +
      '  /Font <<\n' +
      '    /F1 5 0 R\n' +
      '  >>\n' +
      '>>\n' +
      '>>\n' +
      'endobj\n' +
      '4 0 obj\n' +
      '<<\n' +
      '/Length 44\n' +
      '>>\n' +
      'stream\n' +
      'BT\n' +
      '/F1 12 Tf\n' +
      '100 700 Td\n' +
      '(Hello World Test PDF) Tj\n' +
      'ET\n' +
      'endstream\n' +
      'endobj\n' +
      '5 0 obj\n' +
      '<<\n' +
      '/Type /Font\n' +
      '/Subtype /Type1\n' +
      '/BaseFont /Helvetica\n' +
      '>>\n' +
      'endobj\n' +
      'xref\n' +
      '0 6\n' +
      '0000000000 65535 f \n' +
      '0000000009 00000 n \n' +
      '0000000058 00000 n \n' +
      '0000000115 00000 n \n' +
      '0000000306 00000 n \n' +
      '0000000398 00000 n \n' +
      'trailer\n' +
      '<<\n' +
      '/Size 6\n' +
      '/Root 1 0 R\n' +
      '>>\n' +
      'startxref\n' +
      '479\n' +
      '%%EOF'
    );
    
    console.log(`✅ 测试PDF创建成功，大小: ${testPdfContent.length} 字节`);
    
    console.log('\n4. 测试PDF解析...');
    const result = await parseDocumentWithFallback(testPdfContent, 'test-debug.pdf');
    console.log('✅ PDF解析成功!');
    console.log(`提取的文本: "${result}"`);
    console.log(`文本长度: ${result.length} 字符`);
    
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ PDF解析测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return { success: false, error };
  }
}

// 测试真实PDF文件解析
async function testRealPdfFile() {
  console.log('=== 测试真实PDF文件解析 ===\n');
  
  try {
    // 检查是否有现有的PDF文件
    const testFiles = [
      './test-document.pdf',
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
      console.log('⚠️ 未找到现有的PDF测试文件，跳过真实文件测试');
      return { success: true, skipped: true };
    }
    
    console.log(`📄 找到测试文件: ${testFile}`);
    const buffer = fs.readFileSync(testFile);
    console.log(`文件大小: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
    const result = await parseDocumentWithFallback(buffer, path.basename(testFile));
    
    console.log('✅ 真实PDF文件解析成功!');
    console.log(`提取的文本长度: ${result.length} 字符`);
    console.log(`文本预览: "${result.substring(0, 100)}..."`);
    
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ 真实PDF文件解析失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return { success: false, error };
  }
}

// 测试vercel-compatibility模块
async function testVercelCompatibility() {
  console.log('=== 测试vercel-compatibility模块 ===\n');
  
  try {
    console.log('1. 导入vercel-compatibility模块...');
    const { parseDocumentWithFallback } = await import('./api/vercel-compatibility.ts');
    console.log('✅ vercel-compatibility模块导入成功');
    
    console.log('\n2. 创建测试PDF...');
    const testPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF');
    
    console.log('\n3. 测试vercel-compatibility解析...');
    const compatibility = { pdf: true, docx: true };
    const result = await parseDocumentWithFallback(testPdfContent, 'application/pdf', 'test-vercel.pdf', compatibility);
    
    console.log('✅ vercel-compatibility解析成功!');
    console.log(`提取的文本: "${result}"`);
    
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ vercel-compatibility测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return { success: false, error };
  }
}

// 主测试函数
async function runAllTests() {
  console.log('🔍 PDF解析功能全面调试测试\n');
  console.log('=' .repeat(50));
  
  const results = {};
  
  // 测试1: pdfjs-dist库可用性
  results.pdfjsAvailability = await testPdfjsAvailability();
  
  // 测试2: PDF解析替代方案
  results.pdfParserAlternative = await testPdfParserAlternative();
  
  // 测试3: 真实PDF文件解析
  results.realPdfFile = await testRealPdfFile();
  
  // 测试4: vercel-compatibility模块
  results.vercelCompatibility = await testVercelCompatibility();
  
  // 汇总结果
  console.log('\n' + '=' .repeat(50));
  console.log('🎯 测试结果汇总:\n');
  
  Object.entries(results).forEach(([testName, result]) => {
    const status = result.success ? '✅ 通过' : '❌ 失败';
    const details = result.skipped ? ' (跳过)' : '';
    console.log(`${testName}: ${status}${details}`);
    if (!result.success && result.error) {
      console.log(`  错误: ${result.error.message}`);
    }
  });
  
  console.log('\n🔧 调试建议:');
  if (!results.pdfjsAvailability.success) {
    console.log('- pdfjs-dist库导入失败，检查安装和版本兼容性');
  }
  if (!results.pdfParserAlternative.success) {
    console.log('- PDF解析替代方案失败，检查pdf-parser-alternative.js文件');
  }
  if (!results.vercelCompatibility.success) {
    console.log('- vercel-compatibility模块失败，检查TypeScript编译和导入路径');
  }
  
  console.log('\n测试完成!');
}

// 运行测试
runAllTests().catch(console.error);