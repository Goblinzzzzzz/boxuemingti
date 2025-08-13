/**
 * Vercel 生产环境专用日志记录器
 * 提供详细的错误追踪、性能监控和调试信息
 */

export interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
  vercelRegion?: string;
  vercelEnvironment?: string;
  memoryUsage?: NodeJS.MemoryUsage;
  [key: string]: any;
}

export interface ErrorDetails {
  message: string;
  stack?: string;
  code?: string | number;
  statusCode?: number;
  context?: LogContext;
  metadata?: Record<string, any>;
}

class VercelLogger {
  private static instance: VercelLogger;
  private isProduction: boolean;
  private isVercel: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isVercel = !!process.env.VERCEL;
  }

  static getInstance(): VercelLogger {
    if (!VercelLogger.instance) {
      VercelLogger.instance = new VercelLogger();
    }
    return VercelLogger.instance;
  }

  /**
   * 生成请求 ID
   */
  generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取 Vercel 环境信息
   */
  getVercelContext(): Partial<LogContext> {
    return {
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
      vercelEnvironment: process.env.VERCEL_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * 从请求对象提取上下文信息
   */
  extractRequestContext(req: any): Partial<LogContext> {
    return {
      endpoint: req.path || req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.user?.id || req.headers['x-user-id']
    };
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = this.isVercel ? '[VERCEL]' : '[LOCAL]';
    const requestId = context?.requestId ? `[${context.requestId}]` : '';
    
    return `${timestamp} ${prefix}${requestId} [${level.toUpperCase()}] ${message}`;
  }

  /**
   * 记录信息日志
   */
  info(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage('info', message, context);
    console.log(formattedMessage);
    
    if (context && Object.keys(context).length > 0) {
      console.log('Context:', JSON.stringify(context, null, 2));
    }
  }

  /**
   * 记录警告日志
   */
  warn(message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage('warn', message, context);
    console.warn(formattedMessage);
    
    if (context && Object.keys(context).length > 0) {
      console.warn('Context:', JSON.stringify(context, null, 2));
    }
  }

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    const errorDetails: ErrorDetails = {
      message,
      context: {
        ...this.getVercelContext(),
        ...context
      }
    };

    if (error) {
      if (error instanceof Error) {
        errorDetails.stack = error.stack;
        errorDetails.code = (error as any).code;
      } else if (typeof error === 'object') {
        errorDetails.metadata = error;
      }
    }

    const formattedMessage = this.formatMessage('error', message, context);
    console.error(formattedMessage);
    console.error('Error Details:', JSON.stringify(errorDetails, null, 2));

    // 在生产环境中，可以发送到外部日志服务
    if (this.isProduction && this.isVercel) {
      this.sendToExternalLogger(errorDetails);
    }
  }

  /**
   * 记录性能指标
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    const perfContext = {
      ...context,
      operation,
      duration: `${duration}ms`,
      ...this.getVercelContext()
    };

    const message = `Performance: ${operation} completed in ${duration}ms`;
    this.info(message, perfContext);

    // 如果操作时间过长，记录警告
    if (duration > 5000) {
      this.warn(`Slow operation detected: ${operation} took ${duration}ms`, perfContext);
    }
  }

  /**
   * 记录数据库操作
   */
  database(operation: string, table: string, duration?: number, context?: LogContext): void {
    const dbContext = {
      ...context,
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      ...this.getVercelContext()
    };

    const message = `Database: ${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`;
    this.info(message, dbContext);
  }

  /**
   * 记录 API 请求
   */
  apiRequest(req: any, res: any, duration?: number): void {
    const context = {
      ...this.extractRequestContext(req),
      statusCode: res.statusCode,
      duration: duration ? `${duration}ms` : undefined,
      ...this.getVercelContext()
    };

    const message = `API: ${req.method} ${req.path} - ${res.statusCode}${duration ? ` (${duration}ms)` : ''}`;
    
    if (res.statusCode >= 400) {
      this.error(message, null, context);
    } else {
      this.info(message, context);
    }
  }

  /**
   * 记录认证事件
   */
  auth(event: string, userId?: string, success: boolean = true, context?: LogContext): void {
    const authContext = {
      ...context,
      event,
      userId,
      success,
      ...this.getVercelContext()
    };

    const message = `Auth: ${event} - ${success ? 'SUCCESS' : 'FAILED'}${userId ? ` (User: ${userId})` : ''}`;
    
    if (success) {
      this.info(message, authContext);
    } else {
      this.warn(message, authContext);
    }
  }

  /**
   * 记录文件操作
   */
  fileOperation(operation: string, filename: string, size?: number, context?: LogContext): void {
    const fileContext = {
      ...context,
      operation,
      filename,
      size: size ? `${size} bytes` : undefined,
      ...this.getVercelContext()
    };

    const message = `File: ${operation} - ${filename}${size ? ` (${size} bytes)` : ''}`;
    this.info(message, fileContext);
  }

  /**
   * 发送到外部日志服务（生产环境）
   */
  private async sendToExternalLogger(errorDetails: ErrorDetails): Promise<void> {
    try {
      // 这里可以集成外部日志服务，如 Sentry、LogRocket 等
      // 目前只是记录到控制台
      console.log('🚨 PRODUCTION ERROR LOGGED:', JSON.stringify(errorDetails, null, 2));
    } catch (logError) {
      console.error('Failed to send error to external logger:', logError);
    }
  }

  /**
   * 创建带有请求上下文的子日志记录器
   */
  createRequestLogger(req: any): RequestLogger {
    const requestId = this.generateRequestId();
    const context = {
      requestId,
      ...this.extractRequestContext(req),
      ...this.getVercelContext()
    };

    return new RequestLogger(this, context);
  }
}

/**
 * 请求级别的日志记录器
 */
class RequestLogger {
  constructor(
    private logger: VercelLogger,
    private baseContext: LogContext
  ) {}

  info(message: string, additionalContext?: Partial<LogContext>): void {
    this.logger.info(message, { ...this.baseContext, ...additionalContext });
  }

  warn(message: string, additionalContext?: Partial<LogContext>): void {
    this.logger.warn(message, { ...this.baseContext, ...additionalContext });
  }

  error(message: string, error?: Error | any, additionalContext?: Partial<LogContext>): void {
    this.logger.error(message, error, { ...this.baseContext, ...additionalContext });
  }

  performance(operation: string, duration: number, additionalContext?: Partial<LogContext>): void {
    this.logger.performance(operation, duration, { ...this.baseContext, ...additionalContext });
  }

  database(operation: string, table: string, duration?: number, additionalContext?: Partial<LogContext>): void {
    this.logger.database(operation, table, duration, { ...this.baseContext, ...additionalContext });
  }

  getRequestId(): string {
    return this.baseContext.requestId || 'unknown';
  }

  getContext(): LogContext {
    return { ...this.baseContext };
  }
}

// 导出单例实例
export const vercelLogger = VercelLogger.getInstance();
export { RequestLogger };
export default vercelLogger;