#!/usr/bin/env node

/**
 * PDF解析诊断脚本
 * 用于测试和识别Vercel环境中PDF解析失败的具体原因
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 模拟一个简单的PDF文件头
const createTestPdfBuffer = () => {
  const pdfHeader = '%PDF-1.4\n';
  const pdfContent = `
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
274
%%EOF`;
  
  return Buffer.from(pdfHeader + pdfContent);
};

// 主诊断函数
async function runDiagnostics() {
  console.log('🔍 开始PDF解析诊断...');
  console.log('=' .repeat(50));
  
  // 1. 检查环境信息
  console.log('📊 环境信息:');
  console.log(`- Node.js版本: ${process.version}`);
  console.log(`- 平台: ${process.platform}`);
  console.log(`- 架构: ${process.arch}`);
  console.log(`- 内存限制: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`);
  console.log(`- Vercel环境: ${process.env.VERCEL ? '是' : '否'}`);
  console.log('');
  
  // 2. 测试pdf-parse库可用性
  console.log('📚 测试pdf-parse库可用性:');
  let pdfParseAvailable = false;
  let pdfParseError = null;
  
  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    console.log('✅ pdf-parse库加载成功');
    pdfParseAvailable = true;
    
    // 测试基本功能
    const testBuffer = createTestPdfBuffer();
    console.log(`📄 测试PDF缓冲区大小: ${testBuffer.length} bytes`);
    
    try {
      const result = await pdfParse(testBuffer, {
        max: 10,
        version: 'v1.10.100'
      });
      console.log('✅ PDF解析测试成功');
      console.log(`- 提取文本: "${result.text.trim()}"`); 
      console.log(`- 页数: ${result.numpages}`);
    } catch (parseError) {
      console.error('❌ PDF解析测试失败:', parseError.message);
      pdfParseError = parseError;
    }
    
  } catch (error) {
    console.error('❌ pdf-parse库不可用:', error.message);
    pdfParseError = error;
  }
  console.log('');
  
  // 3. 测试文件头检测
  console.log('🔍 测试PDF文件头检测:');
  const testBuffer = createTestPdfBuffer();
  const header = testBuffer.slice(0, 4).toString();
  console.log(`- 文件头: "${header}"`);
  console.log(`- 是否有效PDF: ${header === '%PDF' ? '是' : '否'}`);
  console.log('');
  
  // 4. 测试内存使用
  console.log('🧠 内存使用情况:');
  const memUsage = process.memoryUsage();
  console.log(`- RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
  console.log(`- Heap总计: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  console.log(`- Heap使用: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  console.log(`- 外部内存: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
  console.log('');
  
  // 5. 测试超时处理
  console.log('⏱️ 测试超时处理:');
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('测试超时')), 1000);
    });
    
    const quickPromise = new Promise((resolve) => {
      setTimeout(() => resolve('快速完成'), 500);
    });
    
    const result = await Promise.race([quickPromise, timeoutPromise]);
    console.log(`✅ 超时处理测试: ${result}`);
  } catch (error) {
    console.error('❌ 超时处理测试失败:', error.message);
  }
  console.log('');
  
  // 6. 生成诊断报告
  console.log('📋 诊断报告:');
  console.log('=' .repeat(50));
  
  if (pdfParseAvailable && !pdfParseError) {
    console.log('✅ PDF解析功能正常');
    console.log('建议: 检查具体的PDF文件是否损坏或格式异常');
  } else {
    console.log('❌ PDF解析功能异常');
    console.log('问题分析:');
    
    if (!pdfParseAvailable) {
      console.log('- pdf-parse库无法加载');
      console.log('- 可能原因: 依赖包缺失或版本不兼容');
      console.log('- 解决方案: 重新安装pdf-parse或使用替代方案');
    }
    
    if (pdfParseError) {
      console.log(`- 具体错误: ${pdfParseError.message}`);
      
      if (pdfParseError.message.includes('Cannot find module')) {
        console.log('- 解决方案: npm install pdf-parse');
      } else if (pdfParseError.message.includes('out of memory')) {
        console.log('- 解决方案: 减少文件大小或增加内存限制');
      } else if (pdfParseError.message.includes('timeout')) {
        console.log('- 解决方案: 增加超时时间或优化解析逻辑');
      } else {
        console.log('- 解决方案: 检查PDF文件格式或使用其他解析方法');
      }
    }
  }
  
  console.log('');
  console.log('🔧 推荐的修复措施:');
  console.log('1. 确保pdf-parse依赖正确安装');
  console.log('2. 限制PDF文件大小(建议<10MB)');
  console.log('3. 设置合理的超时时间(30秒)');
  console.log('4. 添加详细的错误日志记录');
  console.log('5. 提供用户友好的错误提示');
  console.log('6. 考虑使用外部PDF解析服务作为备选方案');
}

// 运行诊断
runDiagnostics().catch(error => {
  console.error('🚨 诊断脚本执行失败:', error);
  process.exit(1);
});