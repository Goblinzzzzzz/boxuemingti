#!/usr/bin/env node

/**
 * 增强的PDF解析测试脚本
 * 用于验证修复后的PDF解析功能和错误处理机制
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 动态导入vercel-compatibility模块
async function loadVercelCompatibility() {
  try {
    const module = await import('./api/vercel-compatibility.ts');
    return module;
  } catch (error) {
    console.error('❌ 无法加载vercel-compatibility模块:', error.message);
    return null;
  }
}

// 创建测试PDF文件
function createTestPdfFiles() {
  const testDir = path.join(__dirname, 'test-pdfs');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }

  // 1. 正常PDF文件头
  const normalPdf = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
    Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'),
    Buffer.from('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n'),
    Buffer.from('xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \n'),
    Buffer.from('trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n200\n%%EOF')
  ]);
  fs.writeFileSync(path.join(testDir, 'normal.pdf'), normalPdf);

  // 2. 损坏的XRef表PDF（模拟bad XRef entry错误）
  const badXrefPdf = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
    Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'),
    Buffer.from('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n'),
    Buffer.from('xref\n0 4\ninvalid_xref_entry\n0000000074 00000 n \n0000000120 00000 n \n'), // 损坏的XRef
    Buffer.from('trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n200\n%%EOF')
  ]);
  fs.writeFileSync(path.join(testDir, 'bad-xref.pdf'), badXrefPdf);

  // 3. 无效PDF文件头
  const invalidHeaderPdf = Buffer.from('INVALID_PDF_HEADER\nThis is not a valid PDF file');
  fs.writeFileSync(path.join(testDir, 'invalid-header.pdf'), invalidHeaderPdf);

  // 4. 加密PDF（模拟）
  const encryptedPdf = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
    Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'),
    Buffer.from('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n'),
    Buffer.from('4 0 obj\n<< /Filter /Standard /V 1 /R 2 /O <encrypted> /U <encrypted> /P -4 >>\nendobj\n'), // 加密对象
    Buffer.from('xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \n0000000200 00000 n \n'),
    Buffer.from('trailer\n<< /Size 5 /Root 1 0 R /Encrypt 4 0 R >>\nstartxref\n300\n%%EOF')
  ]);
  fs.writeFileSync(path.join(testDir, 'encrypted.pdf'), encryptedPdf);

  // 5. 截断的PDF文件
  const truncatedPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog'); // 没有结尾
  fs.writeFileSync(path.join(testDir, 'truncated.pdf'), truncatedPdf);

  // 6. 过小的PDF文件
  const tinyPdf = Buffer.from('%PDF');
  fs.writeFileSync(path.join(testDir, 'tiny.pdf'), tinyPdf);

  // 7. 大文件（模拟）
  const largePdf = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.alloc(9 * 1024 * 1024, 'A'), // 9MB的数据
    Buffer.from('\n%%EOF')
  ]);
  fs.writeFileSync(path.join(testDir, 'large.pdf'), largePdf);

  console.log('✅ 测试PDF文件已创建');
  return testDir;
}

// 测试PDF解析功能
async function testPdfParsing(vercelCompat, testDir) {
  const testFiles = [
    { name: 'normal.pdf', expectSuccess: true, description: '正常PDF文件' },
    { name: 'bad-xref.pdf', expectSuccess: false, description: '损坏的XRef表PDF', expectedError: 'bad xref' },
    { name: 'invalid-header.pdf', expectSuccess: false, description: '无效PDF文件头', expectedError: 'pdf文件头无效' },
    { name: 'encrypted.pdf', expectSuccess: false, description: '加密PDF文件', expectedError: '已加密' },
    { name: 'truncated.pdf', expectSuccess: false, description: '截断的PDF文件', expectedError: '不完整' },
    { name: 'tiny.pdf', expectSuccess: false, description: '过小的PDF文件', expectedError: '过小' },
    { name: 'large.pdf', expectSuccess: false, description: '过大的PDF文件', expectedError: '过大' }
  ];

  console.log('\n🧪 开始PDF解析测试...');
  console.log('=' .repeat(60));

  let passedTests = 0;
  let totalTests = testFiles.length;

  for (const testFile of testFiles) {
    const filePath = path.join(testDir, testFile.name);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  测试文件不存在: ${testFile.name}`);
      continue;
    }

    console.log(`\n📄 测试: ${testFile.description} (${testFile.name})`);
    
    try {
      const buffer = fs.readFileSync(filePath);
      const fileSize = (buffer.length / 1024 / 1024).toFixed(2);
      console.log(`   文件大小: ${fileSize}MB`);
      
      const startTime = Date.now();
      const result = await vercelCompat.parseDocumentVercelCompatible(buffer, 'pdf');
      const duration = Date.now() - startTime;
      
      if (testFile.expectSuccess) {
        console.log(`✅ 解析成功 (${duration}ms)`);
        console.log(`   提取内容长度: ${result.length} 字符`);
        passedTests++;
      } else {
        console.log(`❌ 预期失败但解析成功 (${duration}ms)`);
        console.log(`   意外提取内容: ${result.substring(0, 100)}...`);
      }
      
    } catch (error) {
      if (!testFile.expectSuccess) {
        const errorMsg = error.message.toLowerCase();
        const expectedError = testFile.expectedError?.toLowerCase();
        
        if (expectedError && errorMsg.includes(expectedError)) {
          console.log(`✅ 正确捕获预期错误`);
          console.log(`   错误信息: ${error.message}`);
          passedTests++;
        } else {
          console.log(`⚠️  捕获错误但不匹配预期`);
          console.log(`   实际错误: ${error.message}`);
          console.log(`   预期包含: ${testFile.expectedError}`);
        }
      } else {
        console.log(`❌ 预期成功但解析失败`);
        console.log(`   错误信息: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 测试结果: ${passedTests}/${totalTests} 通过`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！PDF解析功能正常');
  } else {
    console.log('⚠️  部分测试失败，需要进一步检查');
  }

  return { passed: passedTests, total: totalTests };
}

// 测试内存使用情况
function testMemoryUsage() {
  console.log('\n💾 内存使用情况:');
  const memUsage = process.memoryUsage();
  console.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   External: ${(memUsage.external / 1024 / 1024).toFixed(2)}MB`);
}

// 主测试函数
async function main() {
  console.log('🚀 增强的PDF解析功能测试');
  console.log('测试时间:', new Date().toLocaleString());
  
  // 检查环境
  console.log('\n🔍 环境检查:');
  console.log(`   Node.js版本: ${process.version}`);
  console.log(`   平台: ${process.platform}`);
  console.log(`   架构: ${process.arch}`);
  
  testMemoryUsage();
  
  // 加载模块
  console.log('\n📦 加载模块...');
  const vercelCompat = await loadVercelCompatibility();
  
  if (!vercelCompat) {
    console.error('❌ 无法加载vercel-compatibility模块，测试终止');
    process.exit(1);
  }
  
  console.log('✅ vercel-compatibility模块加载成功');
  
  // 创建测试文件
  console.log('\n📁 准备测试文件...');
  const testDir = createTestPdfFiles();
  
  // 执行测试
  const testResult = await testPdfParsing(vercelCompat, testDir);
  
  // 最终内存检查
  testMemoryUsage();
  
  // 清理测试文件
  console.log('\n🧹 清理测试文件...');
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('✅ 测试文件已清理');
  } catch (error) {
    console.log('⚠️  清理测试文件失败:', error.message);
  }
  
  // 测试总结
  console.log('\n📋 测试总结:');
  console.log(`   通过率: ${((testResult.passed / testResult.total) * 100).toFixed(1)}%`);
  
  if (testResult.passed === testResult.total) {
    console.log('🎉 PDF解析功能测试完全通过！');
    console.log('✅ 增强的错误处理机制工作正常');
    console.log('✅ Vercel环境兼容性良好');
  } else {
    console.log('⚠️  存在问题需要修复');
    console.log('建议检查错误处理逻辑和兼容性设置');
  }
  
  console.log('\n测试完成时间:', new Date().toLocaleString());
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  });
}

export { main, testPdfParsing, createTestPdfFiles };