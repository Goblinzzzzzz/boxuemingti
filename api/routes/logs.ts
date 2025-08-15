import express, { Request, Response } from 'express';
import { vercelLogger } from '../vercel-logger';
import { authenticateUser, requireAdmin } from '../middleware/auth';

// 内存中的日志存储（生产环境应该使用持久化存储）
interface LogEntry {
  timestamp: string;
  level: string;
  event: string;
  method?: string;
  endpoint?: string;
  requestId?: string;
  statusCode?: number;
  duration?: number;
  error?: any;
  [key: string]: any;
}

const logStore: LogEntry[] = [];
const MAX_LOGS = 1000; // 最大存储日志数量

/**
 * 添加日志条目
 */
export function addRequestLog(logEntry: Omit<LogEntry, 'timestamp'>) {
  const entry: LogEntry = {
    level: 'info',
    event: 'unknown',
    ...logEntry,
    timestamp: new Date().toISOString()
  };
  
  logStore.unshift(entry);
  
  // 保持日志数量在限制内
  if (logStore.length > MAX_LOGS) {
    logStore.splice(MAX_LOGS);
  }
  
  // 同时输出到控制台
  console.log(`[${entry.level.toUpperCase()}] ${entry.event}:`, entry);
}

const router = express.Router();

/**
 * 测试日志查看器（无需认证）
 * GET /api/logs/test
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit as string);
    
    const logs = {
      total: logStore.length,
      logs: logStore.slice(0, limitNum),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('获取测试日志失败:', error);
    res.status(500).json({
      success: false,
      error: '获取测试日志失败'
    });
  }
});

/**
 * Vercel 函数日志查看器
 * GET /api/logs
 */
router.get('/', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { limit = 100, level = 'all', startTime, endTime } = req.query;
    const limitNum = parseInt(limit as string);
    
    // 过滤日志
    let filteredLogs = [...logStore];
    
    // 按级别过滤
    if (level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    // 按时间过滤
    if (startTime) {
      const start = new Date(startTime as string);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= start);
    }
    
    if (endTime) {
      const end = new Date(endTime as string);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= end);
    }
    
    // 限制数量
    const paginatedLogs = filteredLogs.slice(0, limitNum);
    
    const logs = {
      total: filteredLogs.length,
      logs: paginatedLogs,
      filters: {
        limit: limitNum,
        level,
        startTime,
        endTime
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('获取日志失败:', error);
    res.status(500).json({
      success: false,
      error: '获取日志失败'
    });
  }
});

/**
 * 请求追踪接口
 * GET /api/logs/trace/:requestId
 */
router.get('/trace/:requestId', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    
    // 查找与该请求ID相关的所有日志
    const requestLogs = logStore.filter(log => log.requestId === requestId);
    
    if (requestLogs.length === 0) {
      return res.status(404).json({
        success: false,
        error: '未找到该请求的追踪信息'
      });
    }
    
    // 构建请求追踪数据
    const startLog = requestLogs.find(log => log.event === 'request_start');
    const endLog = requestLogs.find(log => log.event === 'request_end');
    const errorLog = requestLogs.find(log => log.level === 'error');
    
    const trace = {
      requestId,
      timestamp: startLog?.timestamp || new Date().toISOString(),
      method: startLog?.method || 'UNKNOWN',
      url: startLog?.endpoint || 'UNKNOWN',
      statusCode: endLog?.statusCode || null,
      duration: endLog?.duration || null,
      error: errorLog?.error || null,
      logs: requestLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    };
    
    res.json({
      success: true,
      data: trace
    });
  } catch (error) {
    console.error('获取请求追踪失败:', error);
    res.status(500).json({
      success: false,
      error: '获取请求追踪失败'
    });
  }
});

/**
 * 实时日志流接口
 * GET /api/logs/stream
 */
router.get('/stream', authenticateUser, requireAdmin, (req: Request, res: Response) => {
  // 设置 SSE 头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // 发送初始连接消息
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    timestamp: new Date().toISOString(),
    message: '日志流已连接'
  })}\n\n`);
  
  // 模拟实时日志
  const interval = setInterval(() => {
    const logEntry = {
      type: 'log',
      timestamp: new Date().toISOString(),
      level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
      message: `模拟日志消息 ${Date.now()}`,
      requestId: `req_${Date.now()}`
    };
    
    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  }, 2000);
  
  // 清理连接
  req.on('close', () => {
    clearInterval(interval);
  });
});

/**
 * 错误统计接口
 * GET /api/logs/stats
 */
router.get('/stats', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { period = '24h' } = req.query;
    
    // 模拟错误统计数据
    const stats = {
      period,
      totalRequests: 1250,
      errorCount: 45,
      errorRate: 3.6,
      topErrors: [
        {
          error: '数据库连接超时',
          count: 15,
          percentage: 33.3
        },
        {
          error: 'JWT token 验证失败',
          count: 12,
          percentage: 26.7
        },
        {
          error: '用户权限不足',
          count: 8,
          percentage: 17.8
        }
      ],
      errorsByHour: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: Math.floor(Math.random() * 10)
      })),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取错误统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取错误统计失败'
    });
  }
});

export default router;