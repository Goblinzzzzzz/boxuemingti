/**
 * This is a API server
 */

// load env first
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

// 设置环境变量默认值
function setDefaultEnvVars() {
  // JWT_SECRET 默认值（生产环境应该设置真实的密钥）
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'mingti_default_jwt_secret_key_2024_please_change_in_production';
    console.warn('⚠️ 使用默认JWT_SECRET，生产环境请设置真实密钥');
  }
  
  // NODE_ENV 默认值
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }
  
  // PORT 默认值
  if (!process.env.PORT) {
    process.env.PORT = '3003';
  }
  
  // AI_PROVIDER 默认值
  if (!process.env.AI_PROVIDER) {
    process.env.AI_PROVIDER = 'dmxapi';
  }
}

// 验证关键环境变量
function validateEnvironment() {
  console.log('🔍 开始环境变量验证...');
  
  // 设置默认值
  setDefaultEnvVars();
  
  const requiredEnvVars = {
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
    'JWT_SECRET': process.env.JWT_SECRET
  };
  
  const missingVars = [];
  const invalidVars = [];
  
  for (const [varName, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missingVars.push(varName);
    } else if (value.length < 10) {
      invalidVars.push(`${varName} (长度过短)`);
    }
  }
  
  // 验证 SUPABASE_URL 格式
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
    invalidVars.push('SUPABASE_URL (格式无效，应以https://开头)');
  }
  
  // 记录环境变量状态
  console.log('📊 环境变量状态:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  PORT: ${process.env.PORT}`);
  console.log(`  AI_PROVIDER: ${process.env.AI_PROVIDER}`);
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '已设置' : '未设置'}`);
  console.log(`  SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '已设置' : '未设置'}`);
  console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? '已设置' : '未设置'}`);
  
  if (missingVars.length > 0) {
    console.error('❌ 缺少必需的环境变量:', missingVars.join(', '));
    console.error('请检查 .env 文件或 Vercel 环境变量配置');
  }
  
  if (invalidVars.length > 0) {
    console.error('❌ 环境变量格式无效:', invalidVars.join(', '));
  }
  
  if (missingVars.length === 0 && invalidVars.length === 0) {
    console.log('✅ 环境变量验证通过');
    return true;
  }
  
  // 在生产环境中不退出，而是记录错误并继续运行
  if (process.env.NODE_ENV !== 'production') {
    console.error('💥 开发环境检测到环境变量问题，退出程序');
    process.exit(1);
  } else {
    console.error('⚠️ 生产环境检测到环境变量问题，但继续运行');
    return false;
  }
}

// 执行环境变量验证
const envValidationResult = validateEnvironment();

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import materialsRoutes from './routes/materials';
import generationRoutes from './routes/generation';
import questionsRoutes from './routes/questions';
import reviewRoutes from './routes/review';
import usersRoutes from './routes/users';
import systemRoutes from './routes/system';
import healthRoutes from './routes/health';
import logsRoutes from './routes/logs';
import debugRoutes from './routes/debug';
import { addRequestLog } from './routes/logs';
import compatibilityRoutes from './routes/compatibility';
import deploymentRoutes from './routes/deployment';
import { simpleTest } from './routes/simple-test';
import { envCheckHandler, quickEnvCheck } from './routes/env-check';


const app: express.Application = express();

// CORS配置 - 允许Vercel部署域名
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://traemingtivtvj-goblinzzzzzz-kehrs-projects-ef0ee98f.vercel.app',
    /\.vercel\.app$/,
    /localhost:\d+$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 添加请求日志中间件
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  // 添加请求ID到请求对象
  (req as any).requestId = requestId;
  
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} [${requestId}]`);
  
  // 记录请求开始
  addRequestLog({
    level: 'info',
    event: 'request_start',
    method: req.method,
    endpoint: req.path,
    requestId,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    query: req.query,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });
  
  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    addRequestLog({
      level: res.statusCode >= 400 ? 'error' : 'info',
      event: 'request_end',
      method: req.method,
      endpoint: req.path,
      requestId,
      statusCode: res.statusCode,
      duration
    });
  });
  
  next();
});

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/generation', generationRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/compatibility', compatibilityRoutes);
app.use('/api/deployment', deploymentRoutes);

// 环境变量检查接口
app.get('/api/env-check', envCheckHandler);
app.get('/api/env-check/quick', quickEnvCheck);

// 简单测试接口
app.get('/api/simple-test', simpleTest);

// 健康检查路由已移动到 /api/health 路由文件中

/**
 * error handler middleware with Vercel-specific logging
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const errorId = Date.now().toString(36);
  const requestId = (req as any).requestId || 'unknown';
  
  const errorDetails = {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    headers: req.headers,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString(),
    vercelRegion: process.env.VERCEL_REGION || 'unknown',
    nodeEnv: process.env.NODE_ENV || 'unknown'
  };
  
  console.error(`[ERROR-${errorId}] 全局错误处理器捕获到错误:`, errorDetails);
  
  // 添加错误日志到追踪系统
  addRequestLog({
    level: 'error',
    event: 'global_error',
    method: req.method,
    endpoint: req.path,
    requestId,
    errorId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    errorDetails
  });
  
  // 检查是否是特定类型的错误
  let statusCode = 500;
  let errorType = 'INTERNAL_ERROR';
  
  if (error.message.includes('JWT')) {
    statusCode = 401;
    errorType = 'AUTH_ERROR';
  } else if (error.message.includes('Supabase') || error.message.includes('database')) {
    statusCode = 503;
    errorType = 'DATABASE_ERROR';
  } else if (error.message.includes('timeout')) {
    statusCode = 408;
    errorType = 'TIMEOUT_ERROR';
  }
  
  if (!res.headersSent) {
    res.status(statusCode).json({
      success: false,
      error: errorType,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      errorId: errorId,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found'
  });
});

export default app;