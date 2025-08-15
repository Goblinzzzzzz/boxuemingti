#!/usr/bin/env node

/**
 * 综合文档上传测试脚本
 * 测试PDF和Word文档上传的完整流程
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 开始综合文档上传测试...');

// 测试计数器
let totalTests = 0;
let passedTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    const result = testFn();
    if (result === true || result === undefined) {
      console.log(`✅ ${testName}`);
      passedTests++;
    } else {
      console.log(`❌ ${testName}: ${result}`);
    }
  } catch (error) {
    console.log(`❌ ${testName}: ${error.message}`);
  }
}

async function runAsyncTest(testName, testFn) {
  totalTests++;
  try {
    const result = await testFn();
    if (result === true || result === undefined) {
      console.log(`✅ ${testName}`);
      passedTests++;
    } else {
      console.log(`❌ ${testName}: ${result}`);
    }
  } catch (error) {
    console.log(`❌ ${testName}: ${error.message}`);
  }
}

// 1. 检查PDF解析器文件
runTest('PDF解析器文件存在', () => {
  const pdfParserPath = join(__dirname, 'api', 'pdf-parser-alternative.js');
  if (!fs.existsSync(pdfParserPath)) {
    return 'pdf-parser-alternative.js文件不存在';
  }
  return true;
});

// 2. 检查materials.ts文件
runTest('Materials路由文件存在', () => {
  const materialsPath = join(__dirname, 'api', 'routes', 'materials.ts');
  if (!fs.existsSync(materialsPath)) {
    return 'materials.ts文件不存在';
  }
  return true;
});

// 3. 检查materials.ts中的导入
runTest('Materials.ts导入检查', () => {
  const materialsPath = join(__dirname, 'api', 'routes', 'materials.ts');
  const content = fs.readFileSync(materialsPath, 'utf-8');
  
  // 检查是否正确导入parseDocumentWithFallback
  if (!content.includes("import { parseDocumentWithFallback } from '../pdf-parser-alternative.js';")) {
    return 'parseDocumentWithFallback导入缺失';
  }
  
  // 检查是否移除了重复导入
  if (content.includes('parseDocumentVercelCompatible')) {
    return '仍然存在parseDocumentVercelCompatible的重复导入';
  }
  
  return true;
});

// 4. 测试PDF解析功能（跳过实际解析，只检查函数存在）
runTest('PDF解析功能存在性检查', () => {
  try {
    const pdfParserPath = join(__dirname, 'api', 'pdf-parser-alternative.js');
    const content = fs.readFileSync(pdfParserPath, 'utf-8');
    
    if (!content.includes('parseDocumentWithFallback')) {
      return 'parseDocumentWithFallback函数不存在';
    }
    
    if (!content.includes('export')) {
      return 'parseDocumentWithFallback函数未导出';
    }
    
    return true;
  } catch (error) {
    return `PDF解析功能检查错误: ${error.message}`;
  }
});

// 5. 检查Word文档解析依赖
runTest('Word文档解析依赖检查', () => {
  try {
    const packageJsonPath = join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    if (!packageJson.dependencies?.mammoth) {
      return 'mammoth依赖缺失';
    }
    
    return true;
  } catch (error) {
    return `package.json检查失败: ${error.message}`;
  }
});

// 6. 检查文件上传路由配置
runTest('文件上传路由配置检查', () => {
  const materialsPath = join(__dirname, 'api', 'routes', 'materials.ts');
  const content = fs.readFileSync(materialsPath, 'utf-8');
  
  // 检查multer配置
  if (!content.includes('multer.memoryStorage()')) {
    return 'multer内存存储配置缺失';
  }
  
  // 检查文件类型过滤
  if (!content.includes('application/pdf') || !content.includes('application/msword')) {
    return '文件类型过滤配置不完整';
  }
  
  // 检查上传路由
  if (!content.includes("router.post('/upload'")) {
    return '文件上传路由缺失';
  }
  
  return true;
});

// 7. 检查错误处理机制
runTest('错误处理机制检查', () => {
  const materialsPath = join(__dirname, 'api', 'routes', 'materials.ts');
  const content = fs.readFileSync(materialsPath, 'utf-8');
  
  // 检查错误响应格式
  if (!content.includes('success: false') || !content.includes('error:')) {
    return '错误响应格式不正确';
  }
  
  // 检查用户友好错误信息
  if (!content.includes('userFriendlyMessage')) {
    return '用户友好错误信息处理缺失';
  }
  
  return true;
});

// 8. 检查数据库保存逻辑
runTest('数据库保存逻辑检查', () => {
  const materialsPath = join(__dirname, 'api', 'routes', 'materials.ts');
  const content = fs.readFileSync(materialsPath, 'utf-8');
  
  // 检查Supabase插入操作
  if (!content.includes('.from(\'materials\')') || !content.includes('.insert(')) {
    return 'Supabase数据库插入操作缺失';
  }
  
  // 检查用户关联
  if (!content.includes('created_by: req.user.id')) {
    return '用户关联逻辑缺失';
  }
  
  return true;
});

// 9. 检查前端文件上传逻辑
runTest('前端文件上传逻辑检查', () => {
  const frontendPath = join(__dirname, 'src', 'pages', 'MaterialInputPage.tsx');
  if (!fs.existsSync(frontendPath)) {
    return 'MaterialInputPage.tsx文件不存在';
  }
  
  const content = fs.readFileSync(frontendPath, 'utf-8');
  
  // 检查文件上传API调用
  if (!content.includes('/api/materials/upload')) {
    return '文件上传API调用缺失';
  }
  
  // 检查错误处理
  if (!content.includes('catch') || !content.includes('error')) {
    return '前端错误处理缺失';
  }
  
  return true;
});

// 10. 检查环境配置
runTest('环境配置检查', () => {
  // 检查是否设置了NODE_ENV
  const materialsPath = join(__dirname, 'api', 'routes', 'materials.ts');
  const content = fs.readFileSync(materialsPath, 'utf-8');
  
  if (!content.includes('process.env.NODE_ENV')) {
    return 'NODE_ENV环境变量设置缺失';
  }
  
  return true;
});

// 输出测试结果
console.log('\n📊 测试结果汇总:');
console.log(`总测试数: ${totalTests}`);
console.log(`通过测试: ${passedTests}`);
console.log(`失败测试: ${totalTests - passedTests}`);
console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 所有测试通过！文档上传功能配置正确。');
  console.log('\n📋 建议下一步操作:');
  console.log('1. 启动开发服务器测试实际上传功能');
  console.log('2. 使用真实PDF和Word文档进行测试');
  console.log('3. 检查线上环境的部署状态');
} else {
  console.log('\n⚠️  存在配置问题，需要修复后再进行测试。');
  process.exit(1);
}