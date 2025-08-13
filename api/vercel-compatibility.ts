/**
 * Vercel 依赖包兼容性检查和修复
 * 解决在 Serverless 环境中的依赖问题
 */

// 检查可能有问题的依赖包
const PROBLEMATIC_PACKAGES = [
  'pdf-parse',
  'mammoth',
  'bcrypt',
  'sharp',
  'canvas',
  'puppeteer'
];

/**
 * 检查依赖包兼容性
 */
export function checkDependencyCompatibility() {
  console.log('🔍 检查 Vercel 依赖包兼容性...');
  
  const issues = [];
  const warnings = [];
  
  // 检查 pdf-parse
  try {
    require.resolve('pdf-parse');
    console.log('📄 pdf-parse 包已安装');
    
    // pdf-parse 在 Vercel 中可能有问题，建议使用替代方案
    warnings.push({
      package: 'pdf-parse',
      issue: 'pdf-parse 在 Serverless 环境中可能不稳定',
      solution: '考虑使用 @vercel/node 兼容的 PDF 解析库或外部服务'
    });
  } catch (error) {
    console.log('❌ pdf-parse 包未找到');
  }
  
  // 检查 bcrypt
  try {
    require.resolve('bcrypt');
    console.log('🔐 bcrypt 包已安装');
    
    // bcrypt 是原生模块，在 Vercel 中通常工作正常
    console.log('✅ bcrypt 在 Vercel 中兼容性良好');
  } catch (error) {
    issues.push({
      package: 'bcrypt',
      issue: 'bcrypt 包未安装',
      solution: '运行 npm install bcrypt'
    });
  }
  
  // 检查 mammoth
  try {
    require.resolve('mammoth');
    console.log('📝 mammoth 包已安装');
    
    warnings.push({
      package: 'mammoth',
      issue: 'mammoth 在 Serverless 环境中可能有内存限制',
      solution: '限制处理的文档大小，或使用流式处理'
    });
  } catch (error) {
    console.log('❌ mammoth 包未找到');
  }
  
  return { issues, warnings };
}

/**
 * PDF 解析的 Vercel 兼容实现
 */
export async function parseDocumentVercelCompatible(buffer: Buffer, type: 'pdf' | 'docx'): Promise<string> {
  console.log(`📄 开始解析 ${type.toUpperCase()} 文档 (Vercel 兼容模式)`);
  
  try {
    if (type === 'pdf') {
      // 使用更轻量的 PDF 解析方法
      return await parsePdfVercelCompatible(buffer);
    } else if (type === 'docx') {
      // 使用 mammoth 解析 DOCX
      return await parseDocxVercelCompatible(buffer);
    }
    
    throw new Error(`不支持的文档类型: ${type}`);
  } catch (error) {
    console.error(`❌ 文档解析失败:`, error);
    throw new Error(`文档解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * Vercel 兼容的 PDF 解析
 */
async function parsePdfVercelCompatible(buffer: Buffer): Promise<string> {
  try {
    // 首先尝试使用 pdf-parse
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer, {
      // Vercel 优化选项
      max: 0, // 不限制页数
      version: 'v1.10.100' // 指定版本
    });
    
    console.log(`✅ PDF 解析成功，页数: ${data.numpages}，字符数: ${data.text.length}`);
    return data.text;
  } catch (error) {
    console.error('❌ pdf-parse 解析失败:', error);
    
    // 降级方案：返回错误信息，建议用户使用其他方式
    throw new Error('PDF 解析在当前环境中不可用，请尝试将 PDF 转换为文本后上传');
  }
}

/**
 * Vercel 兼容的 DOCX 解析
 */
async function parseDocxVercelCompatible(buffer: Buffer): Promise<string> {
  try {
    const mammoth = require('mammoth');
    
    // 使用 mammoth 解析 DOCX，配置 Vercel 优化选项
    const result = await mammoth.extractRawText(buffer, {
      // Vercel 内存优化
      includeEmbeddedStyleMap: false,
      includeDefaultStyleMap: false
    });
    
    if (result.messages && result.messages.length > 0) {
      console.warn('⚠️ DOCX 解析警告:', result.messages);
    }
    
    console.log(`✅ DOCX 解析成功，字符数: ${result.value.length}`);
    return result.value;
  } catch (error) {
    console.error('❌ mammoth 解析失败:', error);
    throw new Error('DOCX 解析失败，请检查文件格式');
  }
}

/**
 * 内存使用优化
 */
export function optimizeMemoryUsage() {
  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc();
    console.log('🧹 执行垃圾回收');
  }
  
  // 记录内存使用情况
  const usage = process.memoryUsage();
  console.log('🧠 内存使用情况:', {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
  
  // 如果内存使用过高，发出警告
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  if (heapUsedMB > 100) {
    console.warn(`⚠️ 内存使用较高: ${Math.round(heapUsedMB)}MB`);
  }
}

/**
 * Vercel 环境检测和优化建议
 */
export function getVercelOptimizationSuggestions() {
  const suggestions = [];
  
  // 检查是否在 Vercel 环境中
  if (!process.env.VERCEL) {
    suggestions.push('当前不在 Vercel 环境中，某些优化可能不适用');
    return suggestions;
  }
  
  // 检查内存限制
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  
  if (heapUsedMB > 80) {
    suggestions.push('内存使用接近限制，考虑优化数据处理流程');
  }
  
  // 检查函数执行时间
  const uptime = process.uptime();
  if (uptime > 8) {
    suggestions.push('函数执行时间较长，可能接近 Vercel 10秒限制');
  }
  
  // 检查依赖包
  const { issues, warnings } = checkDependencyCompatibility();
  
  if (issues.length > 0) {
    suggestions.push(`发现 ${issues.length} 个依赖包问题需要解决`);
  }
  
  if (warnings.length > 0) {
    suggestions.push(`发现 ${warnings.length} 个依赖包警告需要关注`);
  }
  
  return suggestions;
}

// 在模块加载时执行兼容性检查
if (process.env.VERCEL) {
  console.log('🚀 Vercel 环境检测到，执行兼容性检查...');
  const { issues, warnings } = checkDependencyCompatibility();
  
  if (issues.length > 0) {
    console.error('❌ 发现依赖包问题:', issues);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ 发现依赖包警告:', warnings);
  }
  
  const suggestions = getVercelOptimizationSuggestions();
  if (suggestions.length > 0) {
    console.log('💡 优化建议:', suggestions);
  }
}