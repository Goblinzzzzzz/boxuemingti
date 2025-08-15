/**
 * Vercel环境错误日志记录工具
 */

export interface ErrorLogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  category: 'document_parsing' | 'file_upload' | 'dependency' | 'memory' | 'timeout';
  message: string;
  details?: any;
  userId?: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  environment: string;
  memoryUsage?: NodeJS.MemoryUsage;
  duration?: number;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100; // 限制内存中保存的日志数量

  /**
   * 记录错误日志
   */
  log(entry: Omit<ErrorLogEntry, 'timestamp' | 'environment' | 'memoryUsage'>): void {
    const logEntry: ErrorLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL ? 'vercel' : 'local',
      memoryUsage: process.memoryUsage()
    };

    // 添加到内存日志
    this.logs.push(logEntry);
    
    // 保持日志数量限制
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 输出到控制台
    const logMessage = `[${logEntry.level.toUpperCase()}] [${logEntry.category}] ${logEntry.message}`;
    
    switch (logEntry.level) {
      case 'error':
        console.error(logMessage, logEntry.details);
        break;
      case 'warn':
        console.warn(logMessage, logEntry.details);
        break;
      case 'info':
        console.log(logMessage, logEntry.details);
        break;
    }
  }

  /**
   * 记录文档解析错误
   */
  logDocumentParsingError(error: Error, filename?: string, fileSize?: number, mimeType?: string, userId?: string): void {
    this.log({
      level: 'error',
      category: 'document_parsing',
      message: `文档解析失败: ${error.message}`,
      details: {
        error: error.stack,
        filename,
        fileSize,
        mimeType
      },
      userId,
      filename,
      fileSize,
      mimeType
    });
  }

  /**
   * 记录内存使用警告
   */
  logMemoryWarning(operation: string, memoryUsage: NodeJS.MemoryUsage): void {
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    
    this.log({
      level: 'warn',
      category: 'memory',
      message: `高内存使用警告: ${operation}`,
      details: {
        heapUsedMB,
        heapTotalMB,
        memoryUsage
      }
    });
  }

  /**
   * 记录超时警告
   */
  logTimeoutWarning(operation: string, duration: number, timeout: number): void {
    this.log({
      level: 'warn',
      category: 'timeout',
      message: `操作接近超时: ${operation}`,
      details: {
        duration,
        timeout,
        remaining: timeout - duration
      },
      duration
    });
  }

  /**
   * 记录依赖问题
   */
  logDependencyIssue(packageName: string, issue: string, solution?: string): void {
    this.log({
      level: 'error',
      category: 'dependency',
      message: `依赖问题: ${packageName} - ${issue}`,
      details: {
        packageName,
        issue,
        solution
      }
    });
  }

  /**
   * 获取最近的错误日志
   */
  getRecentLogs(count: number = 10): ErrorLogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 获取特定类别的日志
   */
  getLogsByCategory(category: ErrorLogEntry['category']): ErrorLogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * 生成错误报告
   */
  generateErrorReport(): string {
    const errorLogs = this.logs.filter(log => log.level === 'error');
    const warnLogs = this.logs.filter(log => log.level === 'warn');
    
    const report = {
      summary: {
        totalLogs: this.logs.length,
        errors: errorLogs.length,
        warnings: warnLogs.length,
        environment: process.env.VERCEL ? 'vercel' : 'local',
        timestamp: new Date().toISOString()
      },
      recentErrors: errorLogs.slice(-5),
      recentWarnings: warnLogs.slice(-5)
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * 清理旧日志
   */
  cleanup(): void {
    this.logs = [];
  }
}

// 单例实例
export const errorLogger = new ErrorLogger();

/**
 * 性能监控装饰器
 */
export function withPerformanceLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();
      
      // 记录性能信息
      errorLogger.log({
        level: 'info',
        category: 'document_parsing',
        message: `操作完成: ${operationName}`,
        details: {
          duration,
          memoryDelta: {
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal
          }
        },
        duration
      });
      
      // 检查是否需要内存警告
      const heapUsedMB = Math.round(endMemory.heapUsed / 1024 / 1024);
      if (heapUsedMB > 512) { // 超过512MB发出警告
        errorLogger.logMemoryWarning(operationName, endMemory);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      errorLogger.log({
        level: 'error',
        category: 'document_parsing',
        message: `操作失败: ${operationName}`,
        details: {
          error: error instanceof Error ? error.message : String(error),
          duration
        },
        duration
      });
      
      throw error;
    }
  }) as T;
}