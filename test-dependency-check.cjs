// 测试依赖检查功能
const path = require('path');

console.log('🔍 测试依赖检查功能...');

// 测试 require.resolve
console.log('\n=== require.resolve 测试 ===');
try {
  const pdfParsePath = require.resolve('pdf-parse');
  console.log('✅ pdf-parse 路径:', pdfParsePath);
} catch (error) {
  console.log('❌ pdf-parse 未找到:', error.message);
}

try {
  const mammothPath = require.resolve('mammoth');
  console.log('✅ mammoth 路径:', mammothPath);
} catch (error) {
  console.log('❌ mammoth 未找到:', error.message);
}

// 测试实际加载
console.log('\n=== 实际加载测试 ===');
try {
  const pdfParse = require('pdf-parse');
  console.log('✅ pdf-parse 加载成功:', typeof pdfParse);
} catch (error) {
  console.log('❌ pdf-parse 加载失败:', error.message);
}

try {
  const mammoth = require('mammoth');
  console.log('✅ mammoth 加载成功:', typeof mammoth);
  console.log('📝 mammoth.extractRawText:', typeof mammoth.extractRawText);
} catch (error) {
  console.log('❌ mammoth 加载失败:', error.message);
}

// 测试兼容性检查函数
console.log('\n=== 兼容性检查函数测试 ===');
try {
  // 动态导入兼容性检查函数
  const { checkDependencyCompatibility } = require('./api/vercel-compatibility.ts');
  const compatibility = checkDependencyCompatibility();
  console.log('📋 兼容性检查结果:', compatibility);
  console.log('📄 PDF 兼容:', compatibility.pdf);
  console.log('📝 DOCX 兼容:', compatibility.docx);
} catch (error) {
  console.log('❌ 兼容性检查失败:', error.message);
  console.log('📋 错误详情:', error.stack);
}

console.log('\n🏁 依赖检查测试完成');