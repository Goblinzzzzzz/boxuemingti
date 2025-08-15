/**
 * 真实PDF文件上传测试脚本
 * 模拟用户zhaodan@ke.com的PDF上传场景
 * 测试完整的上传流程和错误处理
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

// 测试配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3003',
  testUser: {
    email: 'zhaodan@ke.com',
    password: '123456'
  },
  testFiles: {
    validPdf: './test-files/sample.pdf',
    invalidPdf: './test-files/invalid.pdf',
    largePdf: './test-files/large.pdf'
  }
};

// 创建测试PDF文件
function createTestPdfFiles() {
  const testDir = './test-files';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 创建一个最小的有效PDF文件
  const validPdfContent = Buffer.from([
    '%PDF-1.4\n',
    '1 0 obj\n',
    '<<\n',
    '/Type /Catalog\n',
    '/Pages 2 0 R\n',
    '>>\n',
    'endobj\n',
    '2 0 obj\n',
    '<<\n',
    '/Type /Pages\n',
    '/Kids [3 0 R]\n',
    '/Count 1\n',
    '>>\n',
    'endobj\n',
    '3 0 obj\n',
    '<<\n',
    '/Type /Page\n',
    '/Parent 2 0 R\n',
    '/MediaBox [0 0 612 792]\n',
    '/Contents 4 0 R\n',
    '>>\n',
    'endobj\n',
    '4 0 obj\n',
    '<<\n',
    '/Length 44\n',
    '>>\n',
    'stream\n',
    'BT\n',
    '/F1 12 Tf\n',
    '100 700 Td\n',
    '(Hello World) Tj\n',
    'ET\n',
    'endstream\n',
    'endobj\n',
    'xref\n',
    '0 5\n',
    '0000000000 65535 f \n',
    '0000000009 65535 n \n',
    '0000000074 65535 n \n',
    '0000000120 65535 n \n',
    '0000000179 65535 n \n',
    'trailer\n',
    '<<\n',
    '/Size 5\n',
    '/Root 1 0 R\n',
    '>>\n',
    'startxref\n',
    '274\n',
    '%%EOF\n'
  ].join(''));

  fs.writeFileSync(TEST_CONFIG.testFiles.validPdf, validPdfContent);

  // 创建无效PDF文件
  const invalidPdfContent = Buffer.from('This is not a PDF file');
  fs.writeFileSync(TEST_CONFIG.testFiles.invalidPdf, invalidPdfContent);

  console.log('✅ 测试PDF文件创建完成');
}

// 用户登录
async function loginUser() {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CONFIG.testUser)
    });

    if (!response.ok) {
      throw new Error(`登录失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ 用户登录成功:', TEST_CONFIG.testUser.email);
    return data.token || data.access_token;
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    throw error;
  }
}

// 上传PDF文件
async function uploadPdfFile(token, filePath, fileName) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'application/pdf'
    });
    formData.append('title', `测试教材-${fileName}`);
    formData.append('description', '这是一个测试上传的PDF教材');

    console.log(`📤 开始上传文件: ${fileName} (${fileBuffer.length} bytes)`);

    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/materials/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    const responseText = await response.text();
    console.log(`📥 服务器响应状态: ${response.status}`);
    console.log(`📥 服务器响应内容: ${responseText}`);

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status} ${response.statusText}\n响应内容: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('✅ 文件上传成功:', {
      fileName,
      materialId: data.id,
      contentLength: data.content?.length || 0
    });
    return data;
  } catch (error) {
    console.error(`❌ 文件上传失败 (${fileName}):`, error.message);
    return { error: error.message, fileName };
  }
}

// 主测试函数
async function runPdfUploadTest() {
  console.log('🚀 开始PDF文件上传测试');
  console.log('=' .repeat(50));

  try {
    // 1. 创建测试文件
    console.log('\n📁 创建测试文件...');
    createTestPdfFiles();

    // 2. 用户登录
    console.log('\n🔐 用户登录...');
    const token = await loginUser();

    // 3. 测试有效PDF上传
    console.log('\n📄 测试有效PDF上传...');
    const validResult = await uploadPdfFile(
      token, 
      TEST_CONFIG.testFiles.validPdf, 
      'valid-test.pdf'
    );

    // 4. 测试无效PDF上传
    console.log('\n📄 测试无效PDF上传...');
    const invalidResult = await uploadPdfFile(
      token, 
      TEST_CONFIG.testFiles.invalidPdf, 
      'invalid-test.pdf'
    );

    // 5. 测试结果汇总
    console.log('\n📊 测试结果汇总:');
    console.log('=' .repeat(50));
    
    if (validResult.error) {
      console.log('❌ 有效PDF上传失败:', validResult.error);
    } else {
      console.log('✅ 有效PDF上传成功');
    }

    if (invalidResult.error) {
      console.log('✅ 无效PDF正确被拒绝:', invalidResult.error);
    } else {
      console.log('⚠️ 无效PDF意外通过验证');
    }

    // 6. 清理测试文件
    console.log('\n🧹 清理测试文件...');
    try {
      fs.rmSync('./test-files', { recursive: true, force: true });
      console.log('✅ 测试文件清理完成');
    } catch (error) {
      console.warn('⚠️ 清理测试文件失败:', error.message);
    }

  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 PDF上传测试完成!');
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runPdfUploadTest().catch(console.error);
}

export { runPdfUploadTest, uploadPdfFile, loginUser };