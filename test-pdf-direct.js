/**
 * 直接测试PDF解析功能
 * 用于诊断pdf-parser-alternative.js的问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态导入PDF解析模块
async function testPdfParsing() {
  try {
    console.log('🔍 开始测试PDF解析功能...');
    
    // 导入PDF解析模块
    const { parseDocumentWithFallback, checkPdfjsAvailability } = await import('./api/pdf-parser-alternative.js');
    
    console.log('✅ PDF解析模块导入成功');
    
    // 检查pdfjs-dist可用性
    console.log('\n📋 检查pdfjs-dist库状态...');
    const pdfjsStatus = await checkPdfjsAvailability();
    console.log('pdfjs-dist状态:', pdfjsStatus);
    
    // 创建一个简单的测试PDF内容
    console.log('\n📄 创建测试PDF内容...');
    const testPdfContent = Buffer.from([
      '%PDF-1.4',
      '1 0 obj',
      '<<',
      '/Type /Catalog',
      '/Pages 2 0 R',
      '>>',
      'endobj',
      '2 0 obj',
      '<<',
      '/Type /Pages',
      '/Kids [3 0 R]',
      '/Count 1',
      '>>',
      'endobj',
      '3 0 obj',
      '<<',
      '/Type /Page',
      '/Parent 2 0 R',
      '/MediaBox [0 0 612 792]',
      '/Contents 4 0 R',
      '>>',
      'endobj',
      '4 0 obj',
      '<<',
      '/Length 44',
      '>>',
      'stream',
      'BT',
      '/F1 12 Tf',
      '100 700 Td',
      '(Hello World) Tj',
      'ET',
      'endstream',
      'endobj',
      'xref',
      '0 5',
      '0000000000 65535 f ',
      '0000000009 00000 n ',
      '0000000074 00000 n ',
      '0000000120 00000 n ',
      '0000000179 00000 n ',
      'trailer',
      '<<',
      '/Size 5',
      '/Root 1 0 R',
      '>>',
      'startxref',
      '253',
      '%%EOF'
    ].join('\n'));
    
    console.log(`测试PDF大小: ${testPdfContent.length} 字节`);
    console.log(`PDF头部: ${testPdfContent.slice(0, 20).toString()}`);
    
    // 测试PDF解析
    console.log('\n🔧 测试PDF解析...');
    try {
      const result = await parseDocumentWithFallback(testPdfContent, 'test.pdf');
      console.log('✅ PDF解析成功!');
      console.log('提取的文本:', result);
    } catch (parseError) {
      console.error('❌ PDF解析失败:');
      console.error('错误信息:', parseError.message);
      console.error('错误堆栈:', parseError.stack);
      
      // 尝试更详细的错误分析
      if (parseError.code) {
        console.error('错误代码:', parseError.code);
      }
    }
    
    // 测试一个更小的PDF
    console.log('\n📄 测试最小PDF...');
    const minimalPdf = Buffer.from('%PDF-1.4\n%%EOF');
    try {
      const result = await parseDocumentWithFallback(minimalPdf, 'minimal.pdf');
      console.log('✅ 最小PDF解析成功:', result);
    } catch (minError) {
      console.error('❌ 最小PDF解析失败:', minError.message);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testPdfParsing().catch(console.error);