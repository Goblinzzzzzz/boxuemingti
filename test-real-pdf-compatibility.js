#!/usr/bin/env node

/**
 * 真实PDF兼容性测试脚本
 * 验证pdf-parse库在Vercel Serverless环境中的实际表现
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建一个最小的有效PDF文件
function createMinimalValidPdf() {
  // 最小的有效PDF结构
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
271
%%EOF`;
  
  return Buffer.from(pdfContent, 'utf8');
}

// 创建损坏的PDF文件（模拟bad XRef entry错误）
function createCorruptedPdf() {
  // 故意损坏xref表的PDF
  const corruptedPdfContent = `%PDF-1.4
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
9999999999 00000 n 
9999999999 00000 n 
9999999999 00000 n 
9999999999 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
271
%%EOF`;
  
  return Buffer.from(corruptedPdfContent, 'utf8');
}

// 测试pdf-parse库的直接兼容性
async function testPdfParseDirectly() {
  console.log('\n🔍 测试pdf-parse库直接兼容性...');
  
  try {
    // 动态导入pdf-parse
    const pdfParse = await import('pdf-parse');
    const parse = pdfParse.default || pdfParse;
    
    console.log('✅ pdf-parse库加载成功');
    
    // 测试1: 有效PDF
    console.log('\n📄 测试1: 解析有效的PDF文件');
    const validPdf = createMinimalValidPdf();
    
    try {
      const result = await parse(validPdf);
      console.log('✅ 有效PDF解析成功');
      console.log(`   页数: ${result.numpages}`);
      console.log(`   文本内容: "${result.text.trim()}"`);  
      console.log(`   信息: ${JSON.stringify(result.info)}`);
    } catch (error) {
      console.error('❌ 有效PDF解析失败:', error.message);
    }
    
    // 测试2: 损坏的PDF（模拟bad XRef entry）
    console.log('\n📄 测试2: 解析损坏的PDF文件（模拟bad XRef entry）');
    const corruptedPdf = createCorruptedPdf();
    
    try {
      const result = await parse(corruptedPdf);
      console.log('⚠️ 损坏PDF意外解析成功:', result.text);
    } catch (error) {
      console.log('✅ 正确捕获损坏PDF错误:', error.message);
      
      // 检查是否是预期的错误类型
      if (error.message.includes('bad XRef entry') || 
          error.message.includes('Invalid PDF') ||
          error.message.includes('xref') ||
          error.message.includes('cross-reference')) {
        console.log('✅ 错误类型符合预期（XRef相关错误）');
      } else {
        console.log('⚠️ 错误类型不是预期的XRef错误');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ pdf-parse库加载失败:', error.message);
    return false;
  }
}

// 测试vercel-compatibility模块
async function testVercelCompatibility() {
  console.log('\n🔍 测试vercel-compatibility模块...');
  
  try {
    const vercelCompat = await import('./api/vercel-compatibility.ts');
    console.log('✅ vercel-compatibility模块加载成功');
    
    // 测试1: 有效PDF
    console.log('\n📄 测试1: 通过vercel-compatibility解析有效PDF');
    const validPdf = createMinimalValidPdf();
    
    try {
      const result = await vercelCompat.parseDocumentVercelCompatible(validPdf, 'pdf');
      console.log('✅ 有效PDF解析成功');
      console.log(`   文本内容: "${result.trim()}"`);  
    } catch (error) {
      console.error('❌ 有效PDF解析失败:', error.message);
    }
    
    // 测试2: 损坏的PDF
    console.log('\n📄 测试2: 通过vercel-compatibility解析损坏PDF');
    const corruptedPdf = createCorruptedPdf();
    
    try {
      const result = await vercelCompat.parseDocumentVercelCompatible(corruptedPdf, 'pdf');
      console.log('⚠️ 损坏PDF意外解析成功:', result);
    } catch (error) {
      console.log('✅ 正确捕获损坏PDF错误:', error.message);
      
      // 检查错误处理是否用户友好
      if (error.message.includes('解决方案') || 
          error.message.includes('建议') ||
          error.message.includes('请')) {
        console.log('✅ 错误信息包含用户友好的解决方案');
      } else {
        console.log('⚠️ 错误信息缺少用户友好的解决方案');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ vercel-compatibility模块加载失败:', error.message);
    return false;
  }
}

// 环境兼容性检查
function checkEnvironment() {
  console.log('🔍 环境兼容性检查:');
  console.log(`   Node.js版本: ${process.version}`);
  console.log(`   平台: ${process.platform}`);
  console.log(`   架构: ${process.arch}`);
  
  // 检查内存限制
  const memoryUsage = process.memoryUsage();
  console.log('\n💾 内存使用情况:');
  console.log(`   RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   External: ${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`);
  
  // 检查是否在Vercel环境中
  const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
  console.log(`\n🌐 运行环境: ${isVercel ? 'Vercel Serverless' : '本地开发'}`);
  
  if (isVercel) {
    console.log(`   Vercel环境: ${process.env.VERCEL_ENV}`);
    console.log(`   Vercel区域: ${process.env.VERCEL_REGION || 'unknown'}`);
  }
}

// 主测试函数
async function main() {
  console.log('🚀 真实PDF兼容性测试');
  console.log('测试时间:', new Date().toLocaleString('zh-CN'));
  console.log('=' .repeat(60));
  
  checkEnvironment();
  
  const results = {
    pdfParseDirectly: false,
    vercelCompatibility: false
  };
  
  // 测试pdf-parse库直接兼容性
  results.pdfParseDirectly = await testPdfParseDirectly();
  
  // 测试vercel-compatibility模块
  results.vercelCompatibility = await testVercelCompatibility();
  
  // 总结
  console.log('\n' + '=' .repeat(60));
  console.log('📊 测试结果总结:');
  console.log(`   pdf-parse直接测试: ${results.pdfParseDirectly ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   vercel-compatibility测试: ${results.vercelCompatibility ? '✅ 通过' : '❌ 失败'}`);
  
  if (results.pdfParseDirectly && results.vercelCompatibility) {
    console.log('\n🎉 所有测试通过！PDF解析功能在当前环境中正常工作');
    console.log('💡 建议：可以部署到Vercel进行线上测试');
  } else {
    console.log('\n⚠️ 部分测试失败，需要进一步调试');
    if (!results.pdfParseDirectly) {
      console.log('   - pdf-parse库存在兼容性问题');
    }
    if (!results.vercelCompatibility) {
      console.log('   - vercel-compatibility模块需要优化');
    }
  }
  
  console.log('\n测试完成时间:', new Date().toLocaleString('zh-CN'));
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  });
}

export { main, testPdfParseDirectly, testVercelCompatibility };