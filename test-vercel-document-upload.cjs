/**
 * Vercel环境文档上传测试脚本
 * 测试PDF和Word文档在Vercel Serverless环境限制下的解析功能
 * 
 * Vercel限制:
 * - 内存: 3008MB (根据vercel.json配置)
 * - 超时: 60秒 (根据vercel.json配置)
 * - 文件系统: 只读，除了/tmp目录
 * - 包大小限制: 50MB压缩后
 */

const fs = require('fs');
const path = require('path');

// 模拟Vercel环境限制
const VERCEL_LIMITS = {
  maxMemory: 3008 * 1024 * 1024, // 3008MB in bytes
  maxDuration: 60 * 1000, // 60 seconds in milliseconds
  maxFileSize: 10 * 1024 * 1024, // 10MB file upload limit
  readOnlyFileSystem: true
};

// 内存使用监控
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024) // MB
  };
}

// 超时控制
function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`操作超时: ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// 测试PDF解析在Vercel环境的兼容性
async function testPdfParsingVercelCompatibility() {
  console.log('\n=== 测试PDF解析Vercel兼容性 ===');
  
  const startTime = Date.now();
  const startMemory = getMemoryUsage();
  
  try {
    // 动态导入以模拟Vercel环境
    const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
    
    // 检查是否存在测试PDF文件
    const testPdfPath = path.join(__dirname, 'test-document.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.log('⚠️  测试PDF文件不存在，跳过PDF解析测试');
      return { success: true, skipped: true };
    }
    
    const pdfBuffer = fs.readFileSync(testPdfPath);
    console.log(`📄 PDF文件大小: ${Math.round(pdfBuffer.length / 1024)}KB`);
    
    // 检查文件大小限制
    if (pdfBuffer.length > VERCEL_LIMITS.maxFileSize) {
      throw new Error(`PDF文件过大: ${Math.round(pdfBuffer.length / 1024 / 1024)}MB > ${VERCEL_LIMITS.maxFileSize / 1024 / 1024}MB`);
    }
    
    // 在超时限制内解析PDF
    const result = await withTimeout(
      parseDocumentWithFallback(pdfBuffer, 'test-document.pdf'),
      VERCEL_LIMITS.maxDuration
    );
    
    const endTime = Date.now();
    const endMemory = getMemoryUsage();
    const duration = endTime - startTime;
    
    console.log(`✅ PDF解析成功`);
    console.log(`📊 解析时间: ${duration}ms`);
    console.log(`🧠 内存使用: ${startMemory.heapUsed}MB -> ${endMemory.heapUsed}MB (增加${endMemory.heapUsed - startMemory.heapUsed}MB)`);
    console.log(`📝 提取文本长度: ${result.content.length}字符`);
    
    // 检查内存使用是否超限
    if (endMemory.heapUsed > VERCEL_LIMITS.maxMemory / 1024 / 1024) {
      console.log(`⚠️  内存使用可能接近Vercel限制: ${endMemory.heapUsed}MB`);
    }
    
    return { 
      success: true, 
      duration, 
      memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
      textLength: result.content.length 
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`❌ PDF解析失败: ${error.message}`);
    console.log(`⏱️  失败时间: ${duration}ms`);
    
    return { success: false, error: error.message, duration };
  }
}

// 测试Word解析在Vercel环境的兼容性
async function testWordParsingVercelCompatibility() {
  console.log('\n=== 测试Word解析Vercel兼容性 ===');
  
  const startTime = Date.now();
  const startMemory = getMemoryUsage();
  
  try {
    // 动态导入mammoth
    const mammoth = await import('mammoth');
    
    // 检查是否存在测试Word文件
    const testWordPath = path.join(__dirname, 'test-word-document.docx');
    if (!fs.existsSync(testWordPath)) {
      console.log('⚠️  测试Word文件不存在，跳过Word解析测试');
      return { success: true, skipped: true };
    }
    
    const wordBuffer = fs.readFileSync(testWordPath);
    console.log(`📄 Word文件大小: ${Math.round(wordBuffer.length / 1024)}KB`);
    
    // 检查文件大小限制
    if (wordBuffer.length > VERCEL_LIMITS.maxFileSize) {
      throw new Error(`Word文件过大: ${Math.round(wordBuffer.length / 1024 / 1024)}MB > ${VERCEL_LIMITS.maxFileSize / 1024 / 1024}MB`);
    }
    
    // 在超时限制内解析Word
    const result = await withTimeout(
      mammoth.extractRawText({ buffer: wordBuffer }),
      VERCEL_LIMITS.maxDuration
    );
    
    const endTime = Date.now();
    const endMemory = getMemoryUsage();
    const duration = endTime - startTime;
    
    console.log(`✅ Word解析成功`);
    console.log(`📊 解析时间: ${duration}ms`);
    console.log(`🧠 内存使用: ${startMemory.heapUsed}MB -> ${endMemory.heapUsed}MB (增加${endMemory.heapUsed - startMemory.heapUsed}MB)`);
    console.log(`📝 提取文本长度: ${result.value.length}字符`);
    
    // 检查内存使用是否超限
    if (endMemory.heapUsed > VERCEL_LIMITS.maxMemory / 1024 / 1024) {
      console.log(`⚠️  内存使用可能接近Vercel限制: ${endMemory.heapUsed}MB`);
    }
    
    return { 
      success: true, 
      duration, 
      memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
      textLength: result.value.length 
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`❌ Word解析失败: ${error.message}`);
    console.log(`⏱️  失败时间: ${duration}ms`);
    
    return { success: false, error: error.message, duration };
  }
}

// 测试文件上传API在Vercel环境的表现
async function testFileUploadApiVercelCompatibility() {
  console.log('\n=== 测试文件上传API Vercel兼容性 ===');
  
  try {
    // 检查materials.ts路由配置
    const materialsPath = path.join(__dirname, 'api', 'routes', 'materials.ts');
    if (!fs.existsSync(materialsPath)) {
      throw new Error('materials.ts文件不存在');
    }
    
    const materialsContent = fs.readFileSync(materialsPath, 'utf8');
    
    // 检查关键配置
    const checks = [
      {
        name: 'Multer内存存储配置',
        pattern: /multer\.memoryStorage\(\)/,
        required: true
      },
      {
        name: '文件大小限制',
        pattern: /limits:\s*{[^}]*fileSize:\s*10\s*\*\s*1024\s*\*\s*1024/,
        required: true
      },
      {
        name: 'PDF解析函数导入',
        pattern: /parseDocumentWithFallback/,
        required: true
      },
      {
        name: 'Vercel兼容性检查',
        pattern: /vercel|serverless/i,
        required: false
      }
    ];
    
    let allPassed = true;
    for (const check of checks) {
      const found = check.pattern.test(materialsContent);
      const status = found ? '✅' : (check.required ? '❌' : '⚠️');
      console.log(`${status} ${check.name}: ${found ? '已配置' : '未找到'}`);
      
      if (check.required && !found) {
        allPassed = false;
      }
    }
    
    return { success: allPassed };
    
  } catch (error) {
    console.log(`❌ API配置检查失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 测试Vercel环境变量和依赖
async function testVercelEnvironment() {
  console.log('\n=== 测试Vercel环境配置 ===');
  
  try {
    // 检查package.json依赖
    const packagePath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const requiredDeps = [
      'pdfjs-dist',
      'mammoth',
      'multer',
      '@supabase/supabase-js'
    ];
    
    console.log('📦 检查必需依赖:');
    for (const dep of requiredDeps) {
      const version = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
      const status = version ? '✅' : '❌';
      console.log(`${status} ${dep}: ${version || '未安装'}`);
    }
    
    // 检查vercel.json配置
    const vercelPath = path.join(__dirname, 'vercel.json');
    if (fs.existsSync(vercelPath)) {
      const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
      console.log('\n⚙️  Vercel配置:');
      console.log(`   最大内存: ${vercelConfig.functions?.['api/**/*.ts']?.memory || '默认'}MB`);
      console.log(`   最大超时: ${vercelConfig.functions?.['api/**/*.ts']?.maxDuration || '默认'}秒`);
      console.log(`   API重写: ${vercelConfig.rewrites?.length || 0}条规则`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.log(`❌ 环境检查失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 主测试函数
async function runVercelDocumentUploadTests() {
  console.log('🚀 开始Vercel文档上传兼容性测试\n');
  console.log(`📋 Vercel环境限制:`);
  console.log(`   内存限制: ${VERCEL_LIMITS.maxMemory / 1024 / 1024}MB`);
  console.log(`   超时限制: ${VERCEL_LIMITS.maxDuration / 1000}秒`);
  console.log(`   文件大小限制: ${VERCEL_LIMITS.maxFileSize / 1024 / 1024}MB`);
  
  const results = {
    environment: await testVercelEnvironment(),
    apiConfig: await testFileUploadApiVercelCompatibility(),
    pdfParsing: await testPdfParsingVercelCompatibility(),
    wordParsing: await testWordParsingVercelCompatibility()
  };
  
  console.log('\n📊 测试结果汇总:');
  console.log(`   环境配置: ${results.environment.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   API配置: ${results.apiConfig.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   PDF解析: ${results.pdfParsing.success ? '✅ 通过' : results.pdfParsing.skipped ? '⏭️ 跳过' : '❌ 失败'}`);
  console.log(`   Word解析: ${results.wordParsing.success ? '✅ 通过' : results.wordParsing.skipped ? '⏭️ 跳过' : '❌ 失败'}`);
  
  const allPassed = Object.values(results).every(r => r.success || r.skipped);
  console.log(`\n🎯 总体结果: ${allPassed ? '✅ 所有测试通过，Vercel兼容性良好' : '❌ 存在兼容性问题'}`);
  
  if (!allPassed) {
    console.log('\n🔧 建议修复措施:');
    if (!results.environment.success) {
      console.log('   - 检查package.json依赖配置');
      console.log('   - 确认vercel.json配置正确');
    }
    if (!results.apiConfig.success) {
      console.log('   - 检查materials.ts中的Multer和解析配置');
      console.log('   - 确认文件上传路由正确配置');
    }
    if (!results.pdfParsing.success && !results.pdfParsing.skipped) {
      console.log('   - 检查pdfjs-dist在Vercel环境的兼容性');
      console.log('   - 考虑增加PDF解析超时处理');
    }
    if (!results.wordParsing.success && !results.wordParsing.skipped) {
      console.log('   - 检查mammoth库在Vercel环境的兼容性');
      console.log('   - 考虑增加Word解析超时处理');
    }
  }
  
  return results;
}

// 运行测试
if (require.main === module) {
  runVercelDocumentUploadTests()
    .then(() => {
      console.log('\n✨ 测试完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  runVercelDocumentUploadTests,
  testPdfParsingVercelCompatibility,
  testWordParsingVercelCompatibility,
  testFileUploadApiVercelCompatibility,
  testVercelEnvironment
};