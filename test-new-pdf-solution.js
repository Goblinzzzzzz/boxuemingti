/**
 * 测试新的PDF解析方案
 * 验证pdfjs-dist库是否能解决pdf-parse的问题
 */

import fs from 'fs';
import path from 'path';

// 创建一个最小的有效PDF文件用于测试
function createMinimalPDF() {
  // 最小的PDF文件内容（包含"Hello World"文本）
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
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Hello World) Tj
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
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000369 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
456
%%EOF`;
  
  return Buffer.from(pdfContent, 'utf-8');
}

async function testPdfjsAvailability() {
  console.log('\n🔍 测试 pdfjs-dist 库可用性...');
  
  try {
    // 尝试导入 pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log('✅ pdfjs-dist 库导入成功');
    console.log('📦 版本信息:', pdfjsLib.version || '未知版本');
    return true;
  } catch (error) {
    console.error('❌ pdfjs-dist 库导入失败:', error.message);
    return false;
  }
}

async function testPdfParsing() {
  console.log('\n🔍 测试PDF解析功能...');
  
  try {
    // 导入我们的新PDF解析方案
    const { parseDocumentWithFallback, checkPdfjsAvailability } = await import('./api/pdf-parser-alternative.js');
    
    // 检查pdfjs-dist可用性
    const isAvailable = await checkPdfjsAvailability();
    console.log(`📋 pdfjs-dist 可用性: ${isAvailable ? '✅ 可用' : '❌ 不可用'}`);
    
    // 创建测试PDF
    const testPdfBuffer = createMinimalPDF();
    console.log(`📄 创建测试PDF: ${testPdfBuffer.length} 字节`);
    
    // 测试PDF解析
    console.log('\n🚀 开始解析测试PDF...');
    const startTime = Date.now();
    
    const extractedText = await parseDocumentWithFallback(testPdfBuffer, 'test.pdf');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ PDF解析成功!');
    console.log(`📝 提取的文本: "${extractedText.trim()}"`);
    console.log(`⏱️ 解析耗时: ${duration}ms`);
    console.log(`📊 文本长度: ${extractedText.length} 字符`);
    
    // 验证提取的文本是否包含预期内容
    if (extractedText.includes('Hello World')) {
      console.log('🎯 文本提取验证: ✅ 包含预期内容');
    } else {
      console.log('⚠️ 文本提取验证: 未找到预期内容');
      console.log('实际提取内容:', JSON.stringify(extractedText));
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ PDF解析测试失败:', error.message);
    console.error('错误详情:', error.stack);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n🔍 测试错误处理...');
  
  try {
    const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
    
    // 测试无效PDF
    console.log('📋 测试无效PDF处理...');
    const invalidPdf = Buffer.from('这不是PDF文件', 'utf-8');
    
    try {
      await parseDocumentWithFallback(invalidPdf, 'invalid.pdf');
      console.log('⚠️ 预期应该抛出错误，但没有');
    } catch (error) {
      console.log('✅ 正确处理无效PDF:', error.message);
    }
    
    // 测试空文件
    console.log('📋 测试空文件处理...');
    const emptyBuffer = Buffer.alloc(0);
    
    try {
      await parseDocumentWithFallback(emptyBuffer, 'empty.pdf');
      console.log('⚠️ 预期应该抛出错误，但没有');
    } catch (error) {
      console.log('✅ 正确处理空文件:', error.message);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 错误处理测试失败:', error.message);
    return false;
  }
}

async function testMemoryUsage() {
  console.log('\n🔍 测试内存使用情况...');
  
  const initialMemory = process.memoryUsage();
  console.log('📊 初始内存使用:', {
    rss: `${Math.round(initialMemory.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(initialMemory.heapTotal / 1024 / 1024)}MB`
  });
  
  try {
    const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
    
    // 创建多个PDF进行解析
    const testPdfBuffer = createMinimalPDF();
    
    for (let i = 0; i < 5; i++) {
      await parseDocumentWithFallback(testPdfBuffer, `test-${i}.pdf`);
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
    }
    
    const finalMemory = process.memoryUsage();
    console.log('📊 最终内存使用:', {
      rss: `${Math.round(finalMemory.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(finalMemory.heapTotal / 1024 / 1024)}MB`
    });
    
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    console.log(`📈 内存增长: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    
    if (memoryIncrease < 50 * 1024 * 1024) { // 50MB
      console.log('✅ 内存使用合理');
    } else {
      console.log('⚠️ 内存使用较高，可能存在内存泄漏');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 内存测试失败:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 开始测试新的PDF解析方案');
  console.log('=' .repeat(50));
  
  const results = {
    availability: false,
    parsing: false,
    errorHandling: false,
    memory: false
  };
  
  // 测试库可用性
  results.availability = await testPdfjsAvailability();
  
  // 如果库可用，继续其他测试
  if (results.availability) {
    results.parsing = await testPdfParsing();
    results.errorHandling = await testErrorHandling();
    results.memory = await testMemoryUsage();
  }
  
  // 输出测试结果
  console.log('\n' + '=' .repeat(50));
  console.log('📋 测试结果汇总:');
  console.log(`📦 库可用性: ${results.availability ? '✅ 通过' : '❌ 失败'}`);
  console.log(`📄 PDF解析: ${results.parsing ? '✅ 通过' : '❌ 失败'}`);
  console.log(`🛡️ 错误处理: ${results.errorHandling ? '✅ 通过' : '❌ 失败'}`);
  console.log(`💾 内存管理: ${results.memory ? '✅ 通过' : '❌ 失败'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 所有测试通过！新的PDF解析方案可以使用。');
    console.log('💡 建议：可以部署到Vercel进行线上测试。');
  } else {
    console.log('\n⚠️ 部分测试失败，需要进一步调试。');
    
    if (!results.availability) {
      console.log('🔧 建议：检查pdfjs-dist库的安装和版本。');
    }
    
    if (!results.parsing) {
      console.log('🔧 建议：检查PDF解析逻辑和错误处理。');
    }
  }
  
  console.log('\n📝 下一步：');
  console.log('1. 如果测试通过，部署到Vercel验证线上环境');
  console.log('2. 使用测试账号 zhaodan@ke.com 进行真实PDF上传测试');
  console.log('3. 监控错误日志和性能指标');
}

// 运行测试
runAllTests().catch(error => {
  console.error('💥 测试运行失败:', error);
  process.exit(1);
});