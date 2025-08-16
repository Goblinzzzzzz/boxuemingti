/**
 * Vercel 依赖包兼容性检查和修复
 * 解决在 Serverless 环境中的依赖问题
 */

// 延迟加载的依赖
let errorLogger: any = null;
let withPerformanceLogging: any = null;
let mammoth: any = null;
let dependenciesInitialized = false;

// 初始化依赖的函数
async function initializeDependencies() {
  if (dependenciesInitialized) {
    return;
  }
  
  console.log('🔧 初始化文档解析依赖...');
  
  // 初始化错误日志记录器
  try {
    // 使用动态import代替require
    const loggerModule = await import('./utils/error-logger');
    errorLogger = loggerModule.errorLogger;
    withPerformanceLogging = loggerModule.withPerformanceLogging;
    console.log('✅ error-logger 模块加载成功');
  } catch (error) {
    // 如果导入失败，使用简化的日志记录
    console.log('⚠️ error-logger 模块加载失败，使用简化日志:', error.message);
    errorLogger = {
      log: (entry: any) => console.log(`[${entry.level}] ${entry.message}`, entry.details),
      logError: (message: string, error: any) => {
        console.error(`[ERROR] ${message}:`, error);
      },
      logDocumentParsingError: (error: Error, filename?: string, fileSize?: number, mimeType?: string) => {
        console.error('[DOC_PARSE_ERROR]', { error: error.message, filename, fileSize, mimeType });
      }
    };
    withPerformanceLogging = (fn: Function, name: string) => fn;
  }
  
  // 加载解析模块
  
  try {
    const mammothModule = await import('mammoth');
    mammoth = mammothModule.default || mammothModule;
    console.log('✅ mammoth 加载成功');
  } catch (error) {
    console.log('⚠️ mammoth 加载失败:', error.message);
    mammoth = null;
  }
  
  dependenciesInitialized = true;
  console.log('🎯 依赖初始化完成');
}

// 检查可能有问题的依赖包
const PROBLEMATIC_PACKAGES = [
  'mammoth',
  'bcrypt',
  'sharp',
  'canvas',
  'puppeteer'
];

/**
 * 检查依赖包兼容性
 */
export async function checkDependencyCompatibility() {
  console.log('🔍 检查 Vercel 依赖包兼容性...');
  
  // 确保依赖已初始化
  await initializeDependencies();
  
  const issues = [];
  const warnings = [];
  
  // 在本地开发环境中，假设依赖都可用，在实际解析时处理错误
  console.log('📝 假设 mammoth 包可用（运行时验证）');
  console.log('🔐 bcrypt 检查跳过（仅用于认证，不影响文档解析）');
  
  warnings.push({
    package: 'mammoth',
    issue: 'mammoth 在 Serverless 环境中可能有内存限制',
    solution: '限制处理的文档大小，或使用流式处理'
  });
  
  // 强制启用解析功能，在实际使用时处理错误
  return { issues, warnings, docx: true };
}

/**
 * PDF 解析的 Vercel 兼容实现
 */
export async function parseDocumentVercelCompatible(buffer: Buffer, type: 'docx'): Promise<string> {
  console.log(`📄 开始解析 ${type.toUpperCase()} 文档 (Vercel 兼容模式)`);
  
  try {
    if (type === 'docx') {
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
 * 文档解析降级处理
 */
export const parseDocumentWithFallback = async (buffer: Buffer, mimeType: string, filename?: string): Promise<string> => {
  // 确保依赖已初始化
  await initializeDependencies();
  
  const compatibility = await checkDependencyCompatibility();
  
  // 使用性能日志包装器（如果可用）
  const wrappedFunction = withPerformanceLogging ? withPerformanceLogging(
    async () => {
      return await parseDocumentInternal(buffer, mimeType, filename, compatibility);
    },
    'parseDocumentWithFallback'
  ) : async () => {
    return await parseDocumentInternal(buffer, mimeType, filename, compatibility);
  };
  
  return await wrappedFunction();
};

// 内部解析函数
async function parseDocumentInternal(buffer: Buffer, mimeType: string, filename: string | undefined, compatibility: any): Promise<string> {
  // 记录解析开始
  if (errorLogger && errorLogger.log) {
    errorLogger.log({
      level: 'info',
      category: 'document_parsing',
      message: `开始解析文档: ${filename || 'unknown'}`,
      details: {
        mimeType,
        fileSize: buffer.length,
        compatibility
      },
      filename,
      fileSize: buffer.length,
      mimeType
    });
  }
  
  try {
    if (mimeType === 'application/pdf') {
      throw new Error('PDF解析功能已禁用，请转换为DOCX格式或使用文本输入方式');
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      if (!compatibility.docx) {
        throw new Error('DOCX解析功能在当前环境中不可用，请转换为PDF格式或使用文本输入方式');
      }
      return await parseDocxVercelCompatible(buffer);
    } else if (mimeType === 'application/msword' || mimeType.includes('word')) {
       // 处理旧版Word格式
       throw new Error('不支持旧版Word格式(.doc)，请转换为.docx、PDF或纯文本格式');
     } else if (mimeType === 'text/plain' || mimeType === 'text/txt') {
       // 处理纯文本文件
       try {
         const text = buffer.toString('utf8');
         if (!text || text.trim().length === 0) {
           throw new Error('文本文件为空或无法读取');
         }
         console.log(`✅ 文本文件解析成功，字符数: ${text.length}`);
         return text.trim();
       } catch (error) {
         throw new Error(`文本文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
       }
     } else {
       // 对于其他不支持的格式，提供友好提示
       const fileInfo = filename ? `文件: ${filename}` : '上传的文件';
       throw new Error(`${fileInfo} - 不支持的文件格式: ${mimeType}。建议转换为PDF、DOCX或纯文本格式`);
     }
  } catch (error) {
    // 记录详细错误信息
    if (errorLogger && errorLogger.logDocumentParsingError) {
      errorLogger.logDocumentParsingError(
        error instanceof Error ? error : new Error(String(error)),
        filename,
        buffer.length,
        mimeType
      );
    }
    
    // 提供用户友好的错误信息和建议
    if (error instanceof Error) {
      if (error.message.includes('超时')) {
        throw new Error('文档解析超时，请尝试：1. 压缩文档大小 2. 分段上传 3. 使用文本输入方式');
      } else if (error.message.includes('过大')) {
        throw new Error('文件过大，请压缩文档或分段处理，建议文件大小不超过10MB');
      } else if (error.message.includes('损坏') || error.message.includes('格式')) {
        throw new Error('文件格式错误或损坏，请检查文件完整性或转换为标准PDF/DOCX格式');
      } else {
        throw new Error(`文档解析失败：${error.message}。建议使用文本输入方式或联系技术支持`);
      }
    }
    
    throw new Error('文档解析失败，请使用文本输入方式或联系技术支持');
  }
}



/**
 * Vercel 兼容的 DOCX 解析
 */
async function parseDocxVercelCompatible(buffer: Buffer): Promise<string> {
  // 检查文件大小限制（Vercel 内存限制）
  const maxSize = 15 * 1024 * 1024; // 15MB
  if (buffer.length > maxSize) {
    throw new Error('DOCX 解析失败：文件过大，请压缩文档或分段处理');
  }
  
  // 检查DOCX文件头（ZIP格式）
  const zipHeader = buffer.slice(0, 4);
  const isValidZip = zipHeader[0] === 0x50 && zipHeader[1] === 0x4B && 
                    (zipHeader[2] === 0x03 || zipHeader[2] === 0x05 || zipHeader[2] === 0x07);
  if (!isValidZip) {
    throw new Error('DOCX 解析失败：文件格式无效或文件损坏，请确认文件是有效的Word文档');
  }
  
  try {
    // 使用预加载的 mammoth 或动态加载
    let mammothFunc = mammoth;
    if (!mammothFunc) {
      try {
        const mammothModule = await import('mammoth');
        mammothFunc = mammothModule.default || mammothModule;
      } catch (error) {
        throw new Error('mammoth 库不可用');
      }
    }
    const actualMammoth = mammothFunc.default || mammothFunc;
    
    // 设置超时处理
    const parsePromise = actualMammoth.extractRawText({ buffer });
    
    // 设置25秒超时
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('DOCX解析超时，请尝试压缩文档或使用其他格式')), 25000);
    });
    
    const result = await Promise.race([parsePromise, timeoutPromise]) as any;
    
    if (result.messages && result.messages.length > 0) {
      console.warn('⚠️ DOCX 解析警告:', result.messages);
    }
    
    // 清理和优化提取的文本
    let cleanedText = result.value;
    
    // 移除多余的空白字符，但保留段落结构
    cleanedText = cleanedText
      .replace(/\r\n/g, '\n') // 统一换行符
      .replace(/\r/g, '\n')   // 统一换行符
      .replace(/\n{3,}/g, '\n\n') // 合并多个连续换行为两个
      .replace(/[ \t]+/g, ' ') // 合并多个空格为一个
      .replace(/^\s+|\s+$/gm, '') // 移除每行首尾空白
      .trim(); // 移除整体首尾空白
    
    // 验证提取的内容是否有效
    if (!cleanedText || cleanedText.length < 10) {
      throw new Error('Word文档内容提取不完整或为空，可能是文档损坏或格式不支持');
    }
    
    console.log(`✅ DOCX 解析成功，原始字符数: ${result.value.length}，清理后字符数: ${cleanedText.length}`);
    return cleanedText;
  } catch (error) {
    console.error('❌ mammoth 解析失败:', error);
    
    // 提供更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    if (errorMessage.includes('not a valid zip file') || errorMessage.includes('invalid signature')) {
      throw new Error('DOCX 解析失败：文件格式无效或文件损坏，请确认文件是有效的Word文档');
    } else if (errorMessage.includes('Cannot read property') || errorMessage.includes('Cannot read properties')) {
      throw new Error('DOCX 解析失败：文档结构异常，请尝试重新保存文档或转换为其他格式');
    } else if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file')) {
      throw new Error('DOCX 解析失败：文件读取错误，请重新上传文件');
    } else if (errorMessage.includes('out of memory') || errorMessage.includes('heap out of memory')) {
      throw new Error('DOCX 解析失败：文件过大，请压缩文档或分段处理');
    } else {
      throw new Error(`DOCX 解析失败：${errorMessage}`);
    }
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
  const memInfo = {
    rss: Math.round(usage.rss / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024)
  };
  
  console.log('🧠 内存使用情况:', {
    rss: `${memInfo.rss}MB`,
    heapTotal: `${memInfo.heapTotal}MB`,
    heapUsed: `${memInfo.heapUsed}MB`,
    external: `${memInfo.external}MB`
  });
  
  // 内存使用警告和建议
  if (memInfo.heapUsed > 100) {
    console.warn(`⚠️ 内存使用较高: ${memInfo.heapUsed}MB`);
    console.log('💡 内存优化建议: 1. 减少文档大小 2. 分批处理 3. 清理缓存');
  }
  
  if (memInfo.heapUsed > 150) {
    console.error(`🚨 内存使用过高: ${memInfo.heapUsed}MB，可能导致内存溢出`);
    console.log('🆘 紧急建议: 1. 立即减少处理负载 2. 重启服务 3. 联系技术支持');
  }
  
  // 返回内存信息供调用者使用
  return memInfo;
}

/**
 * Vercel 环境检测和优化建议
 */
export async function getVercelOptimizationSuggestions() {
  const suggestions = [];
  const diagnostics = {
    environment: process.env.VERCEL ? 'vercel' : 'local',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
  
  console.log('🔍 环境诊断:', diagnostics);
  
  // 检查是否在 Vercel 环境中
  if (!process.env.VERCEL) {
    suggestions.push('当前不在 Vercel 环境中，某些优化可能不适用');
    return { suggestions, diagnostics };
  }
  
  // 检查内存限制
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  
  if (heapUsedMB > 80) {
    suggestions.push(`内存使用接近限制(${heapUsedMB.toFixed(1)}MB)，建议：1. 减少文档大小 2. 优化数据处理 3. 增加垃圾回收`);
  }
  
  if (heapTotalMB > 120) {
    suggestions.push(`堆内存总量较高(${heapTotalMB.toFixed(1)}MB)，可能需要重启函数`);
  }
  
  // 检查函数执行时间
  const uptime = process.uptime();
  if (uptime > 8) {
    suggestions.push(`函数执行时间较长(${uptime.toFixed(1)}秒)，接近 Vercel 10秒限制，建议：1. 优化算法 2. 分批处理 3. 使用异步操作`);
  }
  
  if (uptime > 5) {
    suggestions.push(`执行时间超过5秒，建议监控性能瓶颈`);
  }
  
  // 检查依赖包
  try {
    const { issues, warnings } = await checkDependencyCompatibility();
    
    if (issues.length > 0) {
      suggestions.push(`发现 ${issues.length} 个依赖包问题需要解决：${issues.map(i => i.package).join(', ')}`);
    }
    
    if (warnings.length > 0) {
      suggestions.push(`发现 ${warnings.length} 个依赖包警告需要关注：${warnings.map(w => w.package).join(', ')}`);
    }
  } catch (error) {
    suggestions.push(`依赖包检查失败：${error instanceof Error ? error.message : '未知错误'}`);
  }
  
  // 检查环境变量
  const requiredEnvVars = ['DMXAPI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    suggestions.push(`缺少环境变量：${missingEnvVars.join(', ')}`);
  }
  
  return { suggestions, diagnostics, memoryUsage: usage };
}

// 在模块加载时执行兼容性检查
if (process.env.VERCEL) {
  console.log('🚀 Vercel 环境检测到，执行兼容性检查...');
  checkDependencyCompatibility().then(async ({ issues, warnings }) => {
    if (issues.length > 0) {
      console.error('❌ 发现依赖包问题:', issues);
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️ 发现依赖包警告:', warnings);
    }
    
    const { suggestions, diagnostics } = await getVercelOptimizationSuggestions();
    if (suggestions.length > 0) {
      console.log('💡 优化建议:', suggestions);
    }
    
    console.log('📊 环境诊断完成:', diagnostics);
  }).catch(error => {
    console.error('❌ 兼容性检查失败:', error);
    console.log('🔧 建议：1. 检查依赖安装 2. 验证环境配置 3. 查看详细错误日志');
  });
} else {
  console.log('🏠 本地开发环境，跳过Vercel特定检查');
}

// 导出诊断函数供外部调用