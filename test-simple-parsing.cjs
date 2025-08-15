const fs = require('fs');
const path = require('path');

// 测试简单的文档解析功能
async function testSimpleParsing() {
  console.log('🧪 开始简单解析测试...');
  
  try {
    // 导入解析模块
    const { parseDocumentWithFallback } = require('./api/vercel-compatibility.ts');
    
    // 创建一个简单的文本文件进行测试
    const testContent = '这是一个简单的测试文档\n用于验证解析功能是否正常工作。';
    const testFile = 'simple-test.txt';
    
    fs.writeFileSync(testFile, testContent, 'utf8');
    console.log('📝 创建测试文件:', testFile);
    
    // 读取文件内容
    const fileBuffer = fs.readFileSync(testFile);
    console.log('📊 文件大小:', fileBuffer.length, '字节');
    
    // 测试解析
    console.log('🔍 开始解析测试...');
    const result = await parseDocumentWithFallback(
      fileBuffer,
      'text/plain',
      testFile
    );
    
    console.log('✅ 解析成功!');
    console.log('📖 提取内容:', result.substring(0, 100));
    
    // 清理测试文件
    fs.unlinkSync(testFile);
    console.log('🧹 清理完成');
    
  } catch (error) {
    console.error('❌ 解析测试失败:', error.message);
    console.error('📋 错误堆栈:', error.stack);
  }
}

// 运行测试
testSimpleParsing().then(() => {
  console.log('🏁 简单解析测试完成');
}).catch(error => {
  console.error('💥 测试执行失败:', error);
});