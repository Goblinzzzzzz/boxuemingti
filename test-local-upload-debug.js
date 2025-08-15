#!/usr/bin/env node

/**
 * 本地环境文档上传调试脚本
 * 模拟实际的API调用，诊断本地环境问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建测试PDF文件
function createTestPdf() {
  const pdfHeader = '%PDF-1.4\n';
  const pdfContent = `1 0 obj
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
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Hello World) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000179 00000 n 

trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
274
%%EOF`;
  
  return Buffer.from(pdfHeader + pdfContent, 'utf-8');
}

// 测试1: 检查pdf-parser-alternative.js模块加载
async function testPdfParserModule() {
  console.log('\n🔍 测试1: 检查pdf-parser-alternative.js模块加载...');
  
  try {
    const module = await import('./api/pdf-parser-alternative.js');
    const { parseDocumentWithFallback } = module;
    
    if (typeof parseDocumentWithFallback !== 'function') {
      console.log('❌ parseDocumentWithFallback不是函数');
      return false;
    }
    
    console.log('✅ pdf-parser-alternative.js模块加载成功');
    return true;
  } catch (error) {
    console.log('❌ pdf-parser-alternative.js模块加载失败:', error.message);
    return false;
  }
}

// 测试2: 直接测试PDF解析功能
async function testDirectPdfParsing() {
  console.log('\n🔍 测试2: 直接测试PDF解析功能...');
  
  try {
    const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
    const testPdf = createTestPdf();
    
    console.log('📄 开始解析测试PDF...');
    const result = await parseDocumentWithFallback(testPdf, 'test.pdf');
    
    console.log('✅ PDF解析成功');
    console.log('📝 提取的内容:', result);
    console.log('📊 内容长度:', result.length);
    
    return true;
  } catch (error) {
    console.log('❌ PDF解析失败:', error.message);
    console.log('🔍 错误堆栈:', error.stack);
    return false;
  }
}

// 测试3: 检查数据库连接
async function testDatabaseConnection() {
  console.log('\n🔍 测试3: 检查数据库连接...');
  
  try {
    const { supabase } = await import('./api/services/supabaseClient.ts');
    
    // 测试简单查询
    const { data, error } = await supabase
      .from('materials')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ 数据库连接失败:', error.message);
      return false;
    }
    
    console.log('✅ 数据库连接正常');
    return true;
  } catch (error) {
    console.log('❌ 数据库连接测试失败:', error.message);
    return false;
  }
}

// 测试4: 模拟完整的文档上传流程
async function testCompleteUploadFlow() {
  console.log('\n🔍 测试4: 模拟完整的文档上传流程...');
  
  try {
    // 导入所需模块
    const { parseDocumentWithFallback } = await import('./api/pdf-parser-alternative.js');
    const { supabase } = await import('./api/services/supabaseClient.ts');
    
    // 创建测试数据
    const testPdf = createTestPdf();
    const filename = 'test-upload.pdf';
    const mimetype = 'application/pdf';
    
    console.log('📄 步骤1: 解析PDF文档...');
    const content = await parseDocumentWithFallback(testPdf, filename);
    console.log('✅ PDF解析成功，内容长度:', content.length);
    
    console.log('💾 步骤2: 模拟数据库插入...');
    // 注意：这里不实际插入数据，只是测试SQL语句构建
    const insertData = {
      title: filename,
      content,
      file_type: 'pdf',
      file_path: filename,
      created_by: 'test-user-id',
      metadata: {
        originalName: filename,
        size: testPdf.length,
        uploadTime: new Date().toISOString(),
        originalMimeType: mimetype
      }
    };
    
    console.log('✅ 数据库插入数据准备完成');
    console.log('📊 插入数据预览:', {
      title: insertData.title,
      contentLength: insertData.content.length,
      fileType: insertData.file_type,
      metadataSize: JSON.stringify(insertData.metadata).length
    });
    
    return true;
  } catch (error) {
    console.log('❌ 完整上传流程测试失败:', error.message);
    console.log('🔍 错误堆栈:', error.stack);
    return false;
  }
}

// 测试5: 检查本地环境特定问题
async function testLocalEnvironmentIssues() {
  console.log('\n🔍 测试5: 检查本地环境特定问题...');
  
  const issues = [];
  
  // 检查Node.js版本
  console.log('📋 Node.js版本:', process.version);
  if (parseInt(process.version.slice(1)) < 16) {
    issues.push('Node.js版本过低，建议使用16+');
  }
  
  // 检查环境变量
  if (!process.env.SUPABASE_URL) {
    issues.push('缺少SUPABASE_URL环境变量');
  }
  
  if (!process.env.SUPABASE_ANON_KEY) {
    issues.push('缺少SUPABASE_ANON_KEY环境变量');
  }
  
  // 检查依赖文件
  const requiredFiles = [
    './api/pdf-parser-alternative.js',
    './api/services/supabaseClient.ts',
    './api/routes/materials.ts'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      issues.push(`缺少必需文件: ${file}`);
    }
  }
  
  if (issues.length === 0) {
    console.log('✅ 本地环境检查通过');
    return true;
  } else {
    console.log('❌ 发现本地环境问题:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }
}

// 主测试函数
async function runLocalUploadDiagnostics() {
  console.log('🚀 开始本地环境文档上传诊断...');
  console.log('=' .repeat(60));
  
  const results = {
    moduleLoading: await testPdfParserModule(),
    pdfParsing: await testDirectPdfParsing(),
    databaseConnection: await testDatabaseConnection(),
    completeFlow: await testCompleteUploadFlow(),
    environmentCheck: await testLocalEnvironmentIssues()
  };
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 诊断结果总结:');
  console.log('   模块加载:', results.moduleLoading ? '✅ 通过' : '❌ 失败');
  console.log('   PDF解析:', results.pdfParsing ? '✅ 通过' : '❌ 失败');
  console.log('   数据库连接:', results.databaseConnection ? '✅ 通过' : '❌ 失败');
  console.log('   完整流程:', results.completeFlow ? '✅ 通过' : '❌ 失败');
  console.log('   环境检查:', results.environmentCheck ? '✅ 通过' : '❌ 失败');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 总体结果: ${passedTests}/${totalTests} 项测试通过`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ 本地环境诊断完成，所有测试通过！');
    console.log('💡 建议: 如果上传仍然失败，可能是前端调用或认证问题');
  } else {
    console.log('\n❌ 发现本地环境问题，需要修复后重试');
    console.log('💡 建议: 根据上述失败的测试项进行相应修复');
  }
  
  console.log('\n测试完成时间:', new Date().toLocaleString());
}

// 运行诊断
runLocalUploadDiagnostics().catch(error => {
  console.error('❌ 诊断脚本执行失败:', error);
  process.exit(1);
});