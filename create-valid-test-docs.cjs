const fs = require('fs');
const path = require('path');

// 创建有效的测试文档
async function createValidTestDocs() {
  console.log('📝 创建有效的测试文档...');
  
  // 创建一个简单的文本文件
  const textContent = `测试文档内容

这是一个用于测试文档解析功能的示例文档。

包含以下内容：
1. 中文文本
2. 英文文本 English text
3. 数字 123456
4. 特殊字符 @#$%^&*()

测试完成。`;
  
  fs.writeFileSync('valid-test.txt', textContent, 'utf8');
  console.log('✅ 创建文本文件: valid-test.txt');
  
  // 创建一个最小的有效PDF文件（PDF 1.4格式）
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
(测试PDF文档内容) Tj
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
  
  fs.writeFileSync('valid-test.pdf', pdfContent, 'utf8');
  console.log('✅ 创建PDF文件: valid-test.pdf');
  
  // 创建一个最小的有效DOCX文件结构
  // 注意：这里创建的是一个简化的DOCX结构，实际的DOCX是ZIP格式
  console.log('⚠️ DOCX文件需要特殊的ZIP结构，跳过创建');
  console.log('💡 建议使用真实的Word文档进行测试');
  
  console.log('\n📊 创建的测试文件:');
  console.log('- valid-test.txt:', fs.statSync('valid-test.txt').size, '字节');
  console.log('- valid-test.pdf:', fs.statSync('valid-test.pdf').size, '字节');
}

// 运行创建函数
createValidTestDocs().then(() => {
  console.log('🏁 测试文档创建完成');
}).catch(error => {
  console.error('💥 创建失败:', error);
});