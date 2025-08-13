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
import authRoutes from './routes/auth.js';
import materialsRoutes from './routes/materials.js';
import generationRoutes from './routes/generation.js';
import questionsRoutes from './routes/questions.js';
import reviewRoutes from './routes/review.js';
import usersRoutes from './routes/users.js';
import systemRoutes from './routes/system.js';


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
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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

/**
 * health check with detailed system status
 */
app.use('/api/health', (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthStatus = {
      success: true,
      message: 'API服务正常运行',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        port: process.env.PORT || 'unknown',
        aiProvider: process.env.AI_PROVIDER || 'unknown'
      },
      services: {
        supabase: {
          configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
          url: process.env.SUPABASE_URL ? '已配置' : '未配置'
        },
        jwt: {
          configured: !!process.env.JWT_SECRET,
          status: process.env.JWT_SECRET ? '已配置' : '未配置'
        }
      },
      validation: {
        environmentCheck: envValidationResult || false,
        criticalServices: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.JWT_SECRET)
      }
    };
    
    // 如果关键服务未配置，返回警告状态
    if (!healthStatus.validation.criticalServices) {
      healthStatus.success = false;
      healthStatus.message = '部分关键服务未正确配置';
      console.warn('⚠️ 健康检查发现配置问题:', healthStatus);
      res.status(503).json(healthStatus);
       return;
    }
    
    console.log('✅ 健康检查通过:', healthStatus.message);
    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('❌ 健康检查失败:', error);
    res.status(500).json({
      success: false,
      message: '健康检查失败',
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * error handler middleware with Vercel-specific logging
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const errorId = Date.now().toString(36);
  
  console.error(`[ERROR-${errorId}] 全局错误处理器捕获到错误:`, {
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