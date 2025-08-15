const fs = require('fs');
const path = require('path');

// 直接导入解析模块进行测试
async function testParsingDirect() {
  console.log('🧪 开始直接测试文档解析功能...');
  
  try {
    // 动态导入 ES 模块
    const { parseDocumentWithFallback } = await import('./api/vercel-compatibility.ts');
    
    // 测试文本文件
    console.log('\n📄 测试文本文件解析...');
    const txtBuffer = fs.readFileSync('./better-test.txt');
    const txtContent = await parseDocumentWithFallback(txtBuffer, 'text/plain', 'better-test.txt');
    console.log('✅ 文本文件解析成功');
    console.log('📝 提取内容:', txtContent.substring(0, 100) + '...');
    
    // 测试PDF文件
    console.log('\n📄 测试PDF文件解析...');
    const pdfBuffer = fs.readFileSync('./simple-test.pdf');
    const pdfContent = await parseDocumentWithFallback(pdfBuffer, 'application/pdf', 'simple-test.pdf');
    console.log('✅ PDF文件解析成功');
    console.log('📝 提取内容:', pdfContent.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('❌ 解析测试失败:', error.message);
    console.error('🔍 错误详情:', error);
  }
  
  console.log('\n🏁 直接解析测试完成');
}

testParsingDirect();