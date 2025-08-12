import * as mammoth from 'mammoth';
import fs from 'fs';

async function testMammoth() {
  try {
    console.log('开始测试mammoth库...');
    
    // 读取Word文档
    const buffer = fs.readFileSync('test-word-document.docx');
    console.log('文件读取成功，大小:', buffer.length, '字节');
    
    // 使用mammoth解析
    const result = await mammoth.extractRawText({ buffer });
    console.log('解析成功！');
    console.log('提取的文本长度:', result.value.length);
    console.log('提取的文本内容:', result.value.substring(0, 200) + '...');
    
    if (result.messages && result.messages.length > 0) {
      console.log('警告信息:', result.messages);
    }
  } catch (error) {
    console.error('测试失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testMammoth();
