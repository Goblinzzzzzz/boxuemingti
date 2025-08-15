const fs = require('fs');
const FormData = require('form-data');
const { default: fetch } = require('node-fetch');

// 测试有效文档的解析
async function testValidDocs() {
  console.log('🧪 开始测试有效文档解析...');
  
  const baseUrl = 'http://localhost:3003';
  const uploadUrl = `${baseUrl}/api/materials/upload`;
  
  // 测试文本文件
  console.log('\n📄 测试文本文件: valid-test.txt');
  await testFileUpload('valid-test.txt', uploadUrl);
  
  // 测试PDF文件
  console.log('\n📄 测试PDF文件: valid-test.pdf');
  await testFileUpload('valid-test.pdf', uploadUrl);
  
  console.log('\n🏁 有效文档测试完成');
}

async function testFileUpload(filename, uploadUrl) {
  try {
    if (!fs.existsSync(filename)) {
      console.log(`❌ 文件不存在: ${filename}`);
      return;
    }
    
    const fileBuffer = fs.readFileSync(filename);
    console.log(`📊 文件大小: ${fileBuffer.length} 字节`);
    
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: filename,
      contentType: getContentType(filename)
    });
    formData.append('title', `测试文档-${filename}`);
    formData.append('description', `自动化测试上传的文档: ${filename}`);
    
    console.log('📤 发送上传请求...');
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    console.log(`📥 响应状态: ${response.status} ${response.statusText}`);
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ 上传成功');
      console.log(`📋 教材ID: ${result.id}`);
      if (result.extractedContent) {
        console.log(`📝 提取内容长度: ${result.extractedContent.length} 字符`);
        console.log(`📖 内容预览: ${result.extractedContent.substring(0, 100)}${result.extractedContent.length > 100 ? '...' : ''}`);
      }
    } else {
      console.log('❌ 上传失败');
      console.log('📄 错误响应:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(`💥 测试失败 (${filename}):`, error.message);
  }
}

function getContentType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'txt': return 'text/plain';
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
}

// 运行测试
testValidDocs().catch(error => {
  console.error('💥 测试执行失败:', error);
});