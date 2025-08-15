const fs = require('fs');

// 创建一个最简单的有效PDF文件
function createSimplePDF() {
  console.log('📄 创建简单的PDF文件...');
  
  // 最基本的PDF结构
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
(Hello World PDF Test) Tj
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
447
%%EOF`;
  
  fs.writeFileSync('./simple-test.pdf', pdfContent);
  console.log('✅ 简单PDF文件创建完成: simple-test.pdf');
  
  // 创建一个更好的文本文件
  const textContent = `这是一个测试文档

内容包括：
1. 中文文本测试
2. 英文文本测试 - English text test
3. 数字和符号：123456 !@#$%^&*()
4. 多行文本测试

这个文档用于验证文本解析功能是否正常工作。
This document is used to verify that text parsing functionality works correctly.`;
  
  fs.writeFileSync('./better-test.txt', textContent, 'utf8');
  console.log('✅ 更好的文本文件创建完成: better-test.txt');
}

createSimplePDF();