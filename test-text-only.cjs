const fs = require('fs');
const path = require('path');

// 只测试文本文件解析功能
async function testTextParsingOnly() {
  console.log('🧪 开始测试文本文件解析功能...');
  
  try {
    // 动态导入 ES 模块
    const { parseDocumentWithFallback } = await import('./api/vercel-compatibility.ts');
    
    // 测试文本文件
    console.log('\n📄 测试文本文件解析...');
    const txtBuffer = fs.readFileSync('./better-test.txt');
    console.log('📊 文件大小:', txtBuffer.length, '字节');
    
    const txtContent = await parseDocumentWithFallback(txtBuffer, 'text/plain', 'better-test.txt');
    console.log('✅ 文本文件解析成功');
    console.log('📝 提取内容长度:', txtContent.length, '字符');
    console.log('📝 提取内容预览:', txtContent.substring(0, 200));
    
    // 测试不同编码的文本文件
    console.log('\n📄 测试UTF-8文本文件解析...');
    const utf8Content = '这是UTF-8编码的中文测试内容\n包含特殊字符：©®™€£¥';
    fs.writeFileSync('./utf8-test.txt', utf8Content, 'utf8');
    
    const utf8Buffer = fs.readFileSync('./utf8-test.txt');
    const utf8ParsedContent = await parseDocumentWithFallback(utf8Buffer, 'text/plain', 'utf8-test.txt');
    console.log('✅ UTF-8文本文件解析成功');
    console.log('📝 UTF-8内容:', utf8ParsedContent);
    
  } catch (error) {
    console.error('❌ 文本解析测试失败:', error.message);
    console.error('🔍 错误详情:', error);
  }
  
  console.log('\n🏁 文本解析测试完成');
}

testTextParsingOnly();