const fs = require('fs');
const path = require('path');

// 创建一个包含实际内容的测试PDF
function createRealTestPdf() {
  // 创建一个更完整的PDF内容
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
/Length 120
>>
stream
BT
/F1 12 Tf
100 700 Td
(这是一个测试PDF文档) Tj
0 -20 Td
(包含中文和English内容) Tj
0 -20 Td
(用于验证PDF解析功能) Tj
0 -20 Td
(测试用户: zhaodan@ke.com) Tj
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
0000000414 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
484
%%EOF`;
  
  // 确保内容超过1024字节
  const padding = '\n% PDF padding to ensure minimum size\n' + ' '.repeat(Math.max(0, 1200 - pdfContent.length));
  return pdfContent + padding;
}

async function testPdfParsingDirect() {
  console.log('🔍 直接测试PDF解析功能...');
  
  let testPdfPath;
  
  try {
    // 1. 检查pdf-parse库是否可用
    console.log('\n📦 检查pdf-parse库...');
    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
      console.log('✅ pdf-parse库加载成功');
    } catch (error) {
      console.error('❌ pdf-parse库加载失败:', error.message);
      return;
    }
    
    // 2. 创建测试PDF文件
    console.log('\n📄 创建测试PDF文件...');
    const pdfContent = createRealTestPdf();
    testPdfPath = path.join(__dirname, 'test-parsing.pdf');
    
    fs.writeFileSync(testPdfPath, pdfContent);
    
    const stats = fs.statSync(testPdfPath);
    console.log(`📊 文件大小: ${stats.size} 字节`);
    
    // 3. 读取文件为Buffer
    console.log('\n🔍 读取文件为Buffer...');
    const buffer = fs.readFileSync(testPdfPath);
    console.log(`Buffer长度: ${buffer.length} 字节`);
    console.log(`文件头: ${buffer.slice(0, 32).toString('ascii')}`);
    
    // 4. 直接测试pdf-parse
    console.log('\n⚙️ 直接测试pdf-parse解析...');
    try {
      const parseOptions = {
        max: 50,
        version: 'v1.10.100',
        normalizeWhitespace: false,
        disableCombineTextItems: false
      };
      
      console.log('📋 解析配置:', parseOptions);
      
      const startTime = Date.now();
      const data = await pdfParse(buffer, parseOptions);
      const parseTime = Date.now() - startTime;
      
      console.log('✅ PDF解析成功!');
      console.log(`📄 页数: ${data.numpages}`);
      console.log(`📝 原始文本长度: ${data.text.length}`);
      console.log(`⏱️ 解析时间: ${parseTime}ms`);
      console.log(`📖 提取的文本内容:`);
      console.log('---开始---');
      console.log(data.text);
      console.log('---结束---');
      
      // 5. 测试文本清理
      console.log('\n🧹 测试文本清理...');
      let cleanedText = data.text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/^\s+|\s+$/gm, '')
        .trim();
      
      console.log(`🔧 清理后文本长度: ${cleanedText.length}`);
      console.log(`📖 清理后文本内容:`);
      console.log('---开始---');
      console.log(cleanedText);
      console.log('---结束---');
      
      if (cleanedText.length >= 10) {
        console.log('✅ 文本内容有效');
      } else {
        console.log('❌ 文本内容过短，可能解析失败');
      }
      
    } catch (parseError) {
      console.error('❌ PDF解析失败:', parseError);
      console.error('错误详情:', {
        message: parseError.message,
        stack: parseError.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    // 清理测试文件
    if (testPdfPath && fs.existsSync(testPdfPath)) {
      fs.unlinkSync(testPdfPath);
      console.log('\n🧹 测试文件已清理');
    }
  }
}

// 运行测试
testPdfParsingDirect().then(() => {
  console.log('\n✅ PDF解析直接测试完成');
}).catch(error => {
  console.error('\n❌ 测试异常:', error);
});