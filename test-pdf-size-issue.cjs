const fs = require('fs');
const path = require('path');

// 创建一个简单的测试PDF内容
function createTestPdf() {
  // 最小的有效PDF内容（超过1024字节）
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
(Hello World Test PDF) Tj
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
0000000244 00000 n 
0000000338 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
408
%%EOF`;
  
  // 确保内容超过1024字节
  const padding = ' '.repeat(Math.max(0, 1100 - pdfContent.length));
  return pdfContent + padding;
}

async function testPdfSizeIssue() {
  console.log('🔍 测试PDF文件大小问题...');
  
  try {
    // 创建测试PDF文件
    const pdfContent = createTestPdf();
    const testPdfPath = path.join(__dirname, 'test-size.pdf');
    
    fs.writeFileSync(testPdfPath, pdfContent);
    
    const stats = fs.statSync(testPdfPath);
    console.log(`📄 创建测试PDF: ${testPdfPath}`);
    console.log(`📊 文件大小: ${stats.size} 字节`);
    
    // 读取文件并检查
    const buffer = fs.readFileSync(testPdfPath);
    console.log(`🔍 Buffer长度: ${buffer.length} 字节`);
    console.log(`📝 文件头: ${buffer.slice(0, 32).toString('ascii')}`);
    
    // 检查是否满足1024字节要求
    if (buffer.length >= 1024) {
      console.log('✅ 文件大小满足要求 (>= 1024字节)');
    } else {
      console.log('❌ 文件大小不满足要求 (< 1024字节)');
    }
    
    // 清理测试文件
    fs.unlinkSync(testPdfPath);
    console.log('🧹 测试文件已清理');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testPdfSizeIssue().then(() => {
  console.log('✅ PDF大小测试完成');
}).catch(error => {
  console.error('❌ 测试异常:', error);
});