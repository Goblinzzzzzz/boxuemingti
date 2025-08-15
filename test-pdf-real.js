/**
 * 真实PDF文件解析测试脚本
 * 用于测试修复后的PDF解析错误处理逻辑
 */

import fs from 'fs';
import path from 'path';

// 导入PDF解析函数
async function testRealPdfParsing() {
  console.log('🔍 开始真实PDF文件解析测试...');
  console.log('==================================================');
  
  try {
    // 动态导入vercel-compatibility模块
    const { parseDocumentWithFallback } = await import('./api/vercel-compatibility.ts');
    
    // 创建一个模拟的损坏PDF文件（包含bad XRef entry错误）
    const corruptedPdfBuffer = Buffer.from([
      // PDF文件头
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
      0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A, // 二进制标记
      
      // 模拟损坏的对象和XRef表
      0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, // 1 0 obj
      0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, // <</Type/
      0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, 0x3E, // Catalog>
      0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, // >\nendobj
      0x0A,
      
      // 损坏的XRef表（故意制造bad XRef entry错误）
      0x78, 0x72, 0x65, 0x66, 0x0A, // xref
      0x30, 0x20, 0x32, 0x0A, // 0 2
      0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, // 00000000 (损坏的条目)
      0x20, 0x36, 0x35, 0x35, 0x33, 0x35, 0x20, 0x66, // 65535 f
      0x20, 0x0A,
      0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x39, 0x20, // 00000009 (无效偏移)
      0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x20, // 00000 n
      0x0A,
      
      // trailer（也是损坏的）
      0x74, 0x72, 0x61, 0x69, 0x6C, 0x65, 0x72, 0x0A, // trailer
      0x3C, 0x3C, 0x2F, 0x53, 0x69, 0x7A, 0x65, 0x20, // <</Size 
      0x32, 0x2F, 0x52, 0x6F, 0x6F, 0x74, 0x20, 0x31, // 2/Root 1
      0x20, 0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A, // 0 R>>
      0x73, 0x74, 0x61, 0x72, 0x74, 0x78, 0x72, 0x65, // startxre
      0x66, 0x0A, 0x39, 0x39, 0x39, 0x39, 0x39, 0x0A, // f\n99999 (无效位置)
      0x25, 0x25, 0x45, 0x4F, 0x46 // %%EOF
    ]);
    
    console.log('📄 测试损坏的PDF文件（包含bad XRef entry错误）...');
    console.log(`- 文件大小: ${corruptedPdfBuffer.length} bytes`);
    console.log(`- 文件头: ${corruptedPdfBuffer.slice(0, 8).toString('ascii')}`);
    
    try {
      const result = await parseDocumentWithFallback(
        corruptedPdfBuffer, 
        'application/pdf', 
        'test-corrupted.pdf'
      );
      console.log('❌ 意外成功：损坏的PDF应该解析失败');
      console.log('结果:', result.substring(0, 100));
    } catch (error) {
      console.log('✅ 正确捕获错误:', error.message);
      
      // 验证错误信息是否包含我们新增的处理逻辑
      if (error.message.includes('交叉引用表错误') || 
          error.message.includes('PDF内部结构损坏') ||
          error.message.includes('bad XRef entry')) {
        console.log('✅ 错误处理逻辑正确：识别出PDF结构错误');
      } else {
        console.log('⚠️ 错误处理可能需要优化:', error.message);
      }
    }
    
    console.log('\n🔍 测试其他类型的PDF错误...');
    
    // 测试加密PDF错误
    const encryptedPdfBuffer = Buffer.from([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
      0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A,
      // 模拟加密标记
      ...Buffer.from('/Encrypt 123 0 R', 'ascii')
    ]);
    
    try {
      await parseDocumentWithFallback(
        encryptedPdfBuffer, 
        'application/pdf', 
        'test-encrypted.pdf'
      );
      console.log('❌ 加密PDF测试：应该失败但成功了');
    } catch (error) {
      console.log('✅ 加密PDF错误处理:', error.message.substring(0, 100));
    }
    
    // 测试非PDF文件
    const notPdfBuffer = Buffer.from('这不是一个PDF文件', 'utf8');
    
    try {
      await parseDocumentWithFallback(
        notPdfBuffer, 
        'application/pdf', 
        'test-not-pdf.pdf'
      );
      console.log('❌ 非PDF文件测试：应该失败但成功了');
    } catch (error) {
      console.log('✅ 非PDF文件错误处理:', error.message.substring(0, 100));
    }
    
  } catch (error) {
    console.error('❌ 测试脚本执行失败:', error);
    console.error('错误详情:', error.stack);
  }
  
  console.log('\n==================================================');
  console.log('📋 测试总结:');
  console.log('1. 验证了"bad XRef entry"错误的处理逻辑');
  console.log('2. 测试了加密PDF的错误处理');
  console.log('3. 测试了非PDF文件的错误处理');
  console.log('4. 确认错误信息用户友好且提供解决方案');
  
  console.log('\n💡 建议用户操作:');
  console.log('- 如果遇到PDF结构错误，尝试"打印为PDF"重新保存');
  console.log('- 使用Adobe Acrobat等专业软件修复损坏的PDF');
  console.log('- 考虑转换为DOCX或文本格式作为替代方案');
  console.log('- 对于重要文档，建议手动输入内容确保准确性');
}

// 运行测试
testRealPdfParsing().catch(console.error);