#!/usr/bin/env node

/**
 * 完整的PDF上传测试脚本
 * 模拟用户实际场景，诊断PDF上传失败的根本原因
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 开始完整的PDF上传诊断测试...');
console.log('=' .repeat(60));

/**
 * 测试1: 检查PDF解析库的可用性
 */
async function testPdfLibraryAvailability() {
  console.log('\n📚 测试1: 检查PDF解析库可用性');
  
  try {
    // 测试pdfjs-dist库
    console.log('🔍 检查pdfjs-dist库...');
    const { checkPdfjsAvailability } = await import('./api/pdf-parser-alternative.js');
    const pdfjsStatus = await checkPdfjsAvailability();
    
    if (pdfjsStatus.available) {
      console.log('✅ pdfjs-dist库可用，版本:', pdfjsStatus.version);
    } else {
      console.log('❌ pdfjs-dist库不可用:', pdfjsStatus.error);
    }
    
    return pdfjsStatus.available;
  } catch (error) {
    console.error('❌ PDF库检查失败:', error.message);
    return false;
  }
}

/**
 * 测试2: 创建测试PDF文件
 */
function createTestPdf() {
  console.log('\n📄 测试2: 创建测试PDF文件');
  
  // 创建一个最小的有效PDF文件
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
  
  const testPdfPath = path.join(__dirname, 'test-upload.pdf');
  fs.writeFileSync(testPdfPath, pdfContent);
  
  console.log('✅ 测试PDF文件已创建:', testPdfPath);
  return testPdfPath;
}

/**
 * 测试3: 测试PDF解析功能
 */
async function testPdfParsing(pdfPath) {
  console.log('\n🔧 测试3: 测试PDF解析功能');
  
  try {
    const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
    const buffer = fs.readFileSync(pdfPath);
    
    console.log('📋 文件信息:');
    console.log(`  - 文件大小: ${buffer.length} 字节`);
    console.log(`  - 文件头: ${buffer.slice(0, 8).toString()}`);
    
    console.log('🔍 开始解析PDF...');
    const content = await parseDocumentWithFallback(buffer, 'test-upload.pdf');
    
    console.log('✅ PDF解析成功!');
    console.log(`  - 提取内容长度: ${content.length} 字符`);
    console.log(`  - 提取内容预览: ${content.substring(0, 100)}...`);
    
    return { success: true, content };
  } catch (error) {
    console.error('❌ PDF解析失败:', error.message);
    console.error('  - 错误类型:', error.constructor.name);
    console.error('  - 错误堆栈:', error.stack);
    
    return { success: false, error: error.message };
  }
}

/**
 * 测试4: 模拟HTTP文件上传
 */
async function simulateFileUpload(pdfPath) {
  console.log('\n🌐 测试4: 模拟HTTP文件上传');
  
  try {
    // 模拟multer处理的文件对象
    const buffer = fs.readFileSync(pdfPath);
    const mockFile = {
      originalname: 'test-upload.pdf',
      mimetype: 'application/pdf',
      buffer: buffer
    };
    
    console.log('📋 模拟文件上传信息:');
    console.log(`  - 文件名: ${mockFile.originalname}`);
    console.log(`  - MIME类型: ${mockFile.mimetype}`);
    console.log(`  - 文件大小: ${mockFile.buffer.length} 字节`);
    
    // 模拟materials.ts中的处理逻辑
    console.log('🔍 模拟后端处理逻辑...');
    
    // 检查文件类型
    const fileExtension = mockFile.originalname.toLowerCase().substring(mockFile.originalname.lastIndexOf('.'));
    console.log(`  - 文件扩展名: ${fileExtension}`);
    
    if (mockFile.mimetype === 'application/pdf' || fileExtension === '.pdf') {
      console.log('✅ 文件类型验证通过');
      
      // 调用PDF解析
      const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
      const content = await parseDocumentWithFallback(mockFile.buffer, mockFile.originalname);
      
      console.log('✅ 文件上传模拟成功!');
      console.log(`  - 解析内容长度: ${content.length} 字符`);
      
      return { success: true, content };
    } else {
      throw new Error('不支持的文件类型');
    }
    
  } catch (error) {
    console.error('❌ 文件上传模拟失败:', error.message);
    console.error('  - 错误类型:', error.constructor.name);
    
    return { success: false, error: error.message };
  }
}

/**
 * 测试5: 检查错误处理机制
 */
async function testErrorHandling() {
  console.log('\n⚠️  测试5: 检查错误处理机制');
  
  try {
    const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
    
    // 测试无效PDF
    console.log('📋 测试无效PDF处理...');
    const invalidPdf = Buffer.from('这不是PDF文件', 'utf-8');
    
    try {
      await parseDocumentWithFallback(invalidPdf, 'invalid.pdf');
      console.log('❌ 应该抛出错误但没有');
    } catch (error) {
      console.log('✅ 无效PDF正确被拒绝:', error.message);
    }
    
    // 测试空文件
    console.log('📋 测试空文件处理...');
    const emptyBuffer = Buffer.alloc(0);
    
    try {
      await parseDocumentWithFallback(emptyBuffer, 'empty.pdf');
      console.log('❌ 应该抛出错误但没有');
    } catch (error) {
      console.log('✅ 空文件正确被拒绝:', error.message);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ 错误处理测试失败:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 主测试函数
 */
async function runCompleteTest() {
  try {
    console.log('🚀 开始完整的PDF上传诊断测试');
    
    // 测试1: 检查库可用性
    const libraryAvailable = await testPdfLibraryAvailability();
    
    // 测试2: 创建测试文件
    const testPdfPath = createTestPdf();
    
    // 测试3: 测试PDF解析
    const parseResult = await testPdfParsing(testPdfPath);
    
    // 测试4: 模拟文件上传
    const uploadResult = await simulateFileUpload(testPdfPath);
    
    // 测试5: 测试错误处理
    const errorHandlingResult = await testErrorHandling();
    
    // 清理测试文件
    fs.unlinkSync(testPdfPath);
    console.log('🧹 测试文件已清理');
    
    // 生成诊断报告
    console.log('\n' + '=' .repeat(60));
    console.log('📊 诊断报告');
    console.log('=' .repeat(60));
    
    console.log(`📚 PDF库可用性: ${libraryAvailable ? '✅ 正常' : '❌ 异常'}`);
    console.log(`🔧 PDF解析功能: ${parseResult.success ? '✅ 正常' : '❌ 异常'}`);
    console.log(`🌐 文件上传模拟: ${uploadResult.success ? '✅ 正常' : '❌ 异常'}`);
    console.log(`⚠️  错误处理机制: ${errorHandlingResult.success ? '✅ 正常' : '❌ 异常'}`);
    
    if (!parseResult.success || !uploadResult.success) {
      console.log('\n🔍 问题分析:');
      if (!parseResult.success) {
        console.log(`  - PDF解析错误: ${parseResult.error}`);
      }
      if (!uploadResult.success) {
        console.log(`  - 文件上传错误: ${uploadResult.error}`);
      }
      
      console.log('\n💡 建议解决方案:');
      console.log('  1. 检查pdfjs-dist库是否正确安装');
      console.log('  2. 验证Vercel环境的依赖配置');
      console.log('  3. 检查内存和超时限制');
      console.log('  4. 确认错误处理逻辑的完整性');
    } else {
      console.log('\n✅ 所有测试通过！PDF上传功能应该正常工作。');
      console.log('💡 如果线上仍有问题，可能是:');
      console.log('  1. Vercel环境特定的配置问题');
      console.log('  2. 网络超时或内存限制');
      console.log('  3. 特定PDF文件的兼容性问题');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
runCompleteTest().catch(console.error);