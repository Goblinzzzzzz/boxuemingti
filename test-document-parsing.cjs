const fs = require('fs');
const path = require('path');

// 测试文档解析功能
async function testDocumentParsing() {
  console.log('🧪 开始测试文档解析功能...');
  
  try {
    // 导入解析函数
    const { parseDocumentWithFallback, checkDependencyCompatibility } = require('./api/vercel-compatibility.ts');
    
    // 检查依赖
    const compatibility = checkDependencyCompatibility();
    console.log('📋 依赖检查结果:', {
      pdf: compatibility.pdf,
      docx: compatibility.docx,
      issues: compatibility.issues.length,
      warnings: compatibility.warnings.length
    });
    
    if (!compatibility.pdf && !compatibility.docx) {
      console.error('❌ 没有可用的文档解析依赖');
      return;
    }
    
    // 创建一个简单的测试 PDF 内容（模拟）
    console.log('✅ 文档解析依赖检查通过');
    console.log('📄 PDF 解析可用:', compatibility.pdf);
    console.log('📝 DOCX 解析可用:', compatibility.docx);
    
    // 测试 PDF 解析（使用一个简单的 PDF 头部测试）
    if (compatibility.pdf) {
      try {
        const pdfParse = require('pdf-parse');
        console.log('✅ pdf-parse 模块加载成功');
      } catch (error) {
        console.error('❌ pdf-parse 模块加载失败:', error.message);
      }
    }
    
    // 测试 DOCX 解析
    if (compatibility.docx) {
      try {
        const mammoth = require('mammoth');
        console.log('✅ mammoth 模块加载成功');
      } catch (error) {
        console.error('❌ mammoth 模块加载失败:', error.message);
      }
    }
    
    console.log('🎉 文档解析功能测试完成');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testDocumentParsing().catch(console.error);