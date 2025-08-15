/**
 * PDF解析替代方案
 * 使用pdfjs-dist替代有问题的pdf-parse库
 * 专为Vercel Serverless环境优化
 */

import fs from 'fs';

// PDF解析结果接口
interface PdfParseResult {
  text: string;
  numpages: number;
  info?: any;
  metadata?: any;
}

// PDF解析错误类型
class PdfParseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PdfParseError';
  }
}

/**
 * 使用pdfjs-dist解析PDF文件
 * 这是一个更可靠的替代方案
 */
export async function parsePdfWithPdfjs(buffer: Buffer): Promise<PdfParseResult> {
  try {
    // 动态导入pdfjs-dist以避免构建时问题
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // 设置worker路径（Vercel环境兼容）
    if (typeof window === 'undefined') {
      // Node.js环境
      pdfjsLib.GlobalWorkerOptions.workerSrc = null;
    }
    
    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      verbosity: 0, // 减少日志输出
      disableFontFace: true, // 禁用字体加载以提高性能
      disableRange: true, // 禁用范围请求
      disableStream: true, // 禁用流式加载
    });
    
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const numPages = pdf.numPages;
    
    // 逐页提取文本
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // 组合文本项
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        
        fullText += pageText + '\n';
        
        // 清理页面资源
        page.cleanup();
      } catch (pageError) {
        console.warn(`解析第${pageNum}页时出错:`, pageError.message);
        // 继续处理其他页面
      }
    }
    
    // 获取文档信息
    let info = {};
    try {
      info = await pdf.getMetadata();
    } catch (metaError) {
      console.warn('获取PDF元数据失败:', metaError.message);
    }
    
    // 清理PDF资源
    pdf.destroy();
    
    return {
      text: fullText.trim(),
      numpages: numPages,
      info,
      metadata: info
    };
    
  } catch (error) {
    throw new PdfParseError(
      `PDF解析失败: ${error.message}`,
      'PDFJS_PARSE_ERROR'
    );
  }
}

/**
 * 简单的文本提取方案（备用）
 * 当pdfjs-dist也不可用时使用
 */
export function extractTextFromPdfBuffer(buffer: Buffer): PdfParseResult {
  try {
    const content = buffer.toString('binary');
    
    // 简单的文本提取正则表达式
    const textMatches = content.match(/\((.*?)\)/g) || [];
    const extractedText = textMatches
      .map(match => match.slice(1, -1)) // 移除括号
      .filter(text => text.length > 1) // 过滤短文本
      .join(' ');
    
    // 估算页数
    const pageMatches = content.match(/\/Type\s*\/Page[^s]/g) || [];
    const pageCount = Math.max(1, pageMatches.length);
    
    return {
      text: extractedText || '无法提取文本内容',
      numpages: pageCount,
      info: { method: 'simple_extraction' }
    };
    
  } catch (error) {
    throw new PdfParseError(
      `简单文本提取失败: ${error.message}`,
      'SIMPLE_EXTRACT_ERROR'
    );
  }
}

/**
 * 主要的PDF解析函数
 * 按优先级尝试不同的解析方法
 */
export async function parseDocument(buffer: Buffer): Promise<PdfParseResult> {
  // 验证PDF文件头
  const header = buffer.slice(0, 8).toString();
  if (!header.startsWith('%PDF')) {
    throw new PdfParseError('不是有效的PDF文件', 'INVALID_PDF_HEADER');
  }
  
  // 检查文件大小
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (buffer.length > maxSize) {
    throw new PdfParseError('PDF文件过大，请上传小于50MB的文件', 'FILE_TOO_LARGE');
  }
  
  // 方法1: 尝试使用pdfjs-dist
  try {
    console.log('尝试使用pdfjs-dist解析PDF...');
    const result = await parsePdfWithPdfjs(buffer);
    console.log('✅ pdfjs-dist解析成功');
    return result;
  } catch (pdfjsError) {
    console.warn('pdfjs-dist解析失败:', pdfjsError.message);
  }
  
  // 方法2: 使用简单文本提取
  try {
    console.log('尝试使用简单文本提取...');
    const result = extractTextFromPdfBuffer(buffer);
    console.log('✅ 简单文本提取成功');
    return result;
  } catch (simpleError) {
    console.warn('简单文本提取失败:', simpleError.message);
  }
  
  // 所有方法都失败
  throw new PdfParseError(
    'PDF文件解析失败。请确保文件未损坏，或尝试重新保存为PDF格式后上传。',
    'ALL_METHODS_FAILED'
  );
}

/**
 * 带有详细错误处理的PDF解析函数
 * 用于替代原有的parseDocumentWithFallback
 */
export async function parseDocumentWithFallback(buffer: Buffer, filename?: string): Promise<string> {
  try {
    const result = await parseDocument(buffer);
    
    // 验证提取的文本
    if (!result.text || result.text.trim().length < 10) {
      throw new PdfParseError(
        'PDF文件中未找到足够的文本内容。请确保文件包含可提取的文本，而非仅包含图片。',
        'INSUFFICIENT_TEXT'
      );
    }
    
    console.log(`✅ PDF解析成功: ${result.numpages}页, ${result.text.length}字符`);
    return result.text;
    
  } catch (error) {
    // 提供用户友好的错误信息
    let userMessage = '文档解析失败';
    
    if (error instanceof PdfParseError) {
      userMessage = error.message;
    } else if (error.message.includes('Invalid PDF')) {
      userMessage = 'PDF文件格式无效，请确保上传的是有效的PDF文件';
    } else if (error.message.includes('encrypted')) {
      userMessage = 'PDF文件已加密，请先解除密码保护后再上传';
    } else if (error.message.includes('corrupted')) {
      userMessage = 'PDF文件已损坏，请重新生成或修复文件后上传';
    } else {
      userMessage = `PDF解析失败: ${error.message}`;
    }
    
    console.error('PDF解析错误:', {
      filename,
      error: error.message,
      stack: error.stack
    });
    
    throw new Error(userMessage);
  }
}

/**
 * 检查pdfjs-dist库是否可用
 */
export async function checkPdfjsAvailability(): Promise<boolean> {
  try {
    await import('pdfjs-dist/legacy/build/pdf.mjs');
    return true;
  } catch (error) {
    console.warn('pdfjs-dist不可用:', error.message);
    return false;
  }
}