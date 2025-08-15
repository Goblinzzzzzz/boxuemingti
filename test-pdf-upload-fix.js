#!/usr/bin/env node

/**
 * PDF上传修复验证脚本
 * 测试修复后的PDF上传功能是否正常工作
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试PDF解析函数导入
async function testPdfParsingImport() {
  console.log('🔍 测试PDF解析函数导入...');
  
  try {
    // 测试pdf-parser-alternative.js导入
    const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
    console.log('✅ pdf-parser-alternative.js导入成功');
    
    // 测试函数签名
    if (typeof parseDocumentWithFallback === 'function') {
      console.log('✅ parseDocumentWithFallback函数可用');
      
      // 创建测试PDF buffer
      const testPdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n299\n%%EOF';
      const testBuffer = Buffer.from(testPdfContent);
      
      try {
        const result = await parseDocumentWithFallback(testBuffer, 'test.pdf');
        console.log('✅ PDF解析测试成功，提取内容长度:', result.length);
        return true;
      } catch (error) {
        console.log('⚠️ PDF解析测试失败:', error.message);
        return false;
      }
    } else {
      console.log('❌ parseDocumentWithFallback不是函数');
      return false;
    }
  } catch (error) {
    console.log('❌ 导入失败:', error.message);
    return false;
  }
}

// 测试materials.ts导入配置
async function testMaterialsImport() {
  console.log('\n🔍 测试materials.ts导入配置...');
  
  try {
    const materialsPath = './api/routes/materials.ts';
    if (!fs.existsSync(materialsPath)) {
      console.log('❌ materials.ts文件不存在');
      return false;
    }
    
    const content = fs.readFileSync(materialsPath, 'utf8');
    
    // 检查导入语句
    const hasCorrectImport = content.includes('import { parseDocumentWithFallback } from \'../pdf-parser-alternative.js\'');
    if (hasCorrectImport) {
      console.log('✅ materials.ts正确导入parseDocumentWithFallback');
    } else {
      console.log('❌ materials.ts导入配置错误');
      return false;
    }
    
    // 检查函数调用
    const callPattern = /parseDocumentWithFallback\(buffer,\s*originalname\)/g;
    const matches = content.match(callPattern);
    if (matches && matches.length > 0) {
      console.log(`✅ 找到${matches.length}个正确的函数调用`);
      return true;
    } else {
      console.log('❌ 未找到正确的函数调用');
      return false;
    }
  } catch (error) {
    console.log('❌ 检查失败:', error.message);
    return false;
  }
}

// 测试错误处理机制
async function testErrorHandling() {
  console.log('\n🔍 测试错误处理机制...');
  
  try {
    const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
    
    // 测试无效PDF
    const invalidBuffer = Buffer.from('这不是PDF文件');
    try {
      await parseDocumentWithFallback(invalidBuffer, 'invalid.pdf');
      console.log('❌ 应该抛出错误但没有');
      return false;
    } catch (error) {
      console.log('✅ 正确处理无效PDF:', error.message);
    }
    
    // 测试空buffer
    const emptyBuffer = Buffer.alloc(0);
    try {
      await parseDocumentWithFallback(emptyBuffer, 'empty.pdf');
      console.log('❌ 应该抛出错误但没有');
      return false;
    } catch (error) {
      console.log('✅ 正确处理空文件:', error.message);
    }
    
    return true;
  } catch (error) {
    console.log('❌ 错误处理测试失败:', error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始PDF上传修复验证测试\n');
  
  const results = {
    import: await testPdfParsingImport(),
    materials: await testMaterialsImport(),
    errorHandling: await testErrorHandling()
  };
  
  console.log('\n📊 测试结果汇总:');
  console.log('- PDF解析函数导入:', results.import ? '✅ 通过' : '❌ 失败');
  console.log('- materials.ts配置:', results.materials ? '✅ 通过' : '❌ 失败');
  console.log('- 错误处理机制:', results.errorHandling ? '✅ 通过' : '❌ 失败');
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 所有测试通过！PDF上传修复应该已生效');
    console.log('\n📋 下一步操作:');
    console.log('1. 运行 npm run check 检查代码质量');
    console.log('2. 部署到Vercel进行线上测试');
    console.log('3. 使用真实PDF文件测试上传功能');
  } else {
    console.log('\n❌ 部分测试失败，需要进一步修复');
  }
  
  return allPassed;
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };