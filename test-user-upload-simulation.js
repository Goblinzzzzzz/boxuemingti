/**
 * 用户上传模拟测试脚本
 * 模拟用户zhaodan@ke.com在本地端口5173的实际上传场景
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5173',
  apiUrl: 'http://localhost:3003',
  user: {
    email: 'zhaodan@ke.com',
    password: '123456'
  }
};

/**
 * 创建真实的PDF文件用于测试
 */
function createRealPDF() {
  // 创建一个真实的PDF文件内容
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
(测试PDF文档内容) Tj
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
0000000370 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
457
%%EOF`;
  
  const buffer = Buffer.from(pdfContent, 'utf8');
  console.log(`📄 创建PDF文件，大小: ${buffer.length} 字节`);
  return buffer;
}

/**
 * 创建真实的Word文档用于测试
 */
function createRealWord() {
  // 创建一个简单的Word文档（实际上是ZIP格式）
  const wordContent = Buffer.from([
    // ZIP文件头
    0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00,
    // 更多ZIP内容...
    ...Array(1000).fill(0x20) // 填充内容使文件足够大
  ]);
  
  console.log(`📄 创建Word文件，大小: ${wordContent.length} 字节`);
  return wordContent;
}

/**
 * 用户登录
 */
async function loginUser() {
  console.log('🔐 开始用户登录...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_CONFIG.user)
    });
    
    if (!response.ok) {
      throw new Error(`登录失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ 用户登录成功');
    console.log(`👤 用户ID: ${data.user?.id}`);
    console.log(`🎫 Token长度: ${data.token?.length || 0}`);
    
    return data.token;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    throw error;
  }
}

/**
 * 测试文档上传
 */
async function testDocumentUpload(token, fileBuffer, fileName, fileType) {
  console.log(`\n📤 测试上传: ${fileName}`);
  
  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: fileType
    });
    formData.append('title', `测试文档-${fileName}`);
    formData.append('description', '用户上传测试文档');
    
    const response = await fetch(`${TEST_CONFIG.apiUrl}/api/materials`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    
    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📄 响应内容: ${responseText.substring(0, 500)}...`);
    
    if (!response.ok) {
      throw new Error(`上传失败: ${response.status} - ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    console.log('✅ 文档上传成功');
    console.log(`📋 文档ID: ${data.id}`);
    console.log(`📝 提取内容长度: ${data.content?.length || 0}`);
    
    return data;
  } catch (error) {
    console.error(`❌ ${fileName} 上传失败:`, error.message);
    return { error: error.message };
  }
}

/**
 * 检查API健康状态
 */
async function checkAPIHealth() {
  console.log('🏥 检查API健康状态...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.apiUrl}/api/health`, {
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`API健康检查失败: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ API服务正常');
    console.log(`📊 服务状态: ${data.status}`);
    console.log(`⏰ 服务时间: ${data.timestamp}`);
    
    return true;
  } catch (error) {
    console.error('❌ API健康检查失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🚀 开始用户上传模拟测试');
  console.log(`👤 测试用户: ${TEST_CONFIG.user.email}`);
  console.log(`🌐 前端地址: ${TEST_CONFIG.baseUrl}`);
  console.log(`🔗 API地址: ${TEST_CONFIG.apiUrl}`);
  console.log('=' .repeat(60));
  
  try {
    // 1. 检查API健康状态
    const isHealthy = await checkAPIHealth();
    if (!isHealthy) {
      console.log('⚠️ API服务异常，但继续测试...');
    }
    
    // 2. 用户登录
    const token = await loginUser();
    
    // 3. 创建测试文件
    const pdfBuffer = createRealPDF();
    const wordBuffer = createRealWord();
    
    // 4. 测试PDF上传
    console.log('\n📄 测试PDF文档上传...');
    const pdfResult = await testDocumentUpload(
      token, 
      pdfBuffer, 
      'test-document.pdf', 
      'application/pdf'
    );
    
    // 5. 测试Word上传
    console.log('\n📄 测试Word文档上传...');
    const wordResult = await testDocumentUpload(
      token, 
      wordBuffer, 
      'test-document.docx', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    // 6. 测试结果总结
    console.log('\n' + '=' .repeat(60));
    console.log('📊 测试结果总结:');
    console.log(`   PDF上传: ${pdfResult.error ? '❌ 失败' : '✅ 成功'}`);
    if (pdfResult.error) {
      console.log(`   PDF错误: ${pdfResult.error}`);
    }
    
    console.log(`   Word上传: ${wordResult.error ? '❌ 失败' : '✅ 成功'}`);
    if (wordResult.error) {
      console.log(`   Word错误: ${wordResult.error}`);
    }
    
    // 7. 问题诊断
    if (pdfResult.error || wordResult.error) {
      console.log('\n🔍 问题诊断建议:');
      
      if (pdfResult.error?.includes('文件过小')) {
        console.log('   - PDF文件大小限制过于严格，需要调整验证逻辑');
      }
      
      if (wordResult.error?.includes('格式无效')) {
        console.log('   - Word文档格式检测有问题，需要改进文件头验证');
      }
      
      if (pdfResult.error?.includes('未知错误') || wordResult.error?.includes('解析失败')) {
        console.log('   - 解析库可能存在兼容性问题，建议检查依赖版本');
      }
    }
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    console.error('📋 错误堆栈:', error.stack);
  }
  
  console.log(`\n⏰ 测试完成时间: ${new Date().toLocaleString('zh-CN')}`);
}

// 运行测试
main().catch(console.error);