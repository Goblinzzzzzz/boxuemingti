#!/usr/bin/env node

/**
 * 测试成功的PDF上传场景
 * 创建一个包含实际文本内容的PDF进行测试
 */

import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// 创建一个包含文本内容的简单PDF
function createTextPdf() {
  // 这是一个包含实际文本内容的最小PDF
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
(这是一个测试PDF文档，包含中文内容。) Tj
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
0000000284 00000 n 
0000000379 00000 n 

trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
456
%%EOF`;
  
  return Buffer.from(pdfContent, 'utf8');
}

// 创建一个包含更多文本的PDF
function createRichTextPdf() {
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
/Length 200
>>
stream
BT
/F1 12 Tf
100 700 Td
(教学材料管理系统测试文档) Tj
0 -20 Td
(这是一个包含丰富文本内容的PDF文档) Tj
0 -20 Td
(用于测试文档上传和解析功能) Tj
0 -20 Td
(包含足够的文本内容以通过验证) Tj
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
0000000284 00000 n 
0000000535 00000 n 

trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
612
%%EOF`;
  
  return Buffer.from(pdfContent, 'utf8');
}

async function testSuccessfulUpload() {
  console.log('🚀 开始测试成功的PDF上传场景...');
  
  try {
    // 1. 登录获取token
    console.log('\n1. 用户登录...');
    const loginResponse = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'zhaodan@ke.com',
        password: 'password'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('登录响应状态:', loginResponse.status);
    console.log('登录响应数据:', JSON.stringify(loginData, null, 2));
    
    if (!loginData.success) {
      throw new Error(`登录失败: ${loginData.error || loginData.message || '未知错误'}`);
    }
    
    const token = loginData.access_token;
    console.log('✅ 登录成功');
    
    // 2. 测试包含文本的PDF上传
    console.log('\n2. 测试包含文本内容的PDF上传...');
    const richPdfBuffer = createRichTextPdf();
    
    const formData = new FormData();
    formData.append('file', richPdfBuffer, {
      filename: 'test-rich-content.pdf',
      contentType: 'application/pdf'
    });
    formData.append('title', '测试PDF文档-包含丰富文本');
    formData.append('description', '这是一个包含丰富文本内容的测试PDF文档');
    formData.append('subject', '计算机科学');
    formData.append('grade', '大学');
    formData.append('difficulty', 'medium');
    
    console.log(`📄 上传PDF文件: test-rich-content.pdf (${richPdfBuffer.length} 字节)`);
    
    const uploadResponse = await fetch('http://localhost:3003/api/materials/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    const uploadResult = await uploadResponse.json();
    
    console.log(`\n📊 上传结果:`);
    console.log(`状态: ${uploadResponse.status}`);
    console.log(`响应:`, JSON.stringify(uploadResult, null, 2));
    
    if (uploadResponse.status === 200 && uploadResult.success) {
      console.log('\n✅ PDF上传成功！');
      console.log(`📄 文档ID: ${uploadResult.data.id}`);
      console.log(`📝 标题: ${uploadResult.data.title}`);
      console.log(`📊 内容长度: ${uploadResult.data.content?.length || 0} 字符`);
      
      // 验证内容是否正确提取
      if (uploadResult.data.content && uploadResult.data.content.length > 50) {
        console.log('✅ 文本内容提取成功');
        console.log(`📝 提取的内容预览: ${uploadResult.data.content.substring(0, 100)}...`);
      } else {
        console.log('⚠️ 文本内容提取不完整');
      }
      
    } else {
      console.log('❌ PDF上传失败');
      console.log(`错误详情: ${uploadResult.error || uploadResult.message}`);
    }
    
    // 3. 测试简单PDF上传
    console.log('\n3. 测试简单PDF上传...');
    const simplePdfBuffer = createTextPdf();
    
    const simpleFormData = new FormData();
    simpleFormData.append('file', simplePdfBuffer, {
      filename: 'test-simple.pdf',
      contentType: 'application/pdf'
    });
    simpleFormData.append('title', '测试PDF文档-简单文本');
    simpleFormData.append('description', '这是一个包含简单文本的测试PDF文档');
    simpleFormData.append('subject', '测试');
    simpleFormData.append('grade', '测试');
    simpleFormData.append('difficulty', 'easy');
    
    console.log(`📄 上传PDF文件: test-simple.pdf (${simplePdfBuffer.length} 字节)`);
    
    const simpleUploadResponse = await fetch('http://localhost:3003/api/materials/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...simpleFormData.getHeaders()
      },
      body: simpleFormData
    });
    
    const simpleUploadResult = await simpleUploadResponse.json();
    
    console.log(`\n📊 简单PDF上传结果:`);
    console.log(`状态: ${simpleUploadResponse.status}`);
    console.log(`响应:`, JSON.stringify(simpleUploadResult, null, 2));
    
    if (simpleUploadResponse.status === 200 && simpleUploadResult.success) {
      console.log('\n✅ 简单PDF上传成功！');
    } else {
      console.log('❌ 简单PDF上传失败');
      console.log(`错误详情: ${simpleUploadResult.error || simpleUploadResult.message}`);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testSuccessfulUpload().catch(console.error);