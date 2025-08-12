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

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.ts';
import materialsRoutes from './routes/materials.ts';
import generationRoutes from './routes/generation.ts';
import questionsRoutes from './routes/questions.ts';
import reviewRoutes from './routes/review.ts';
import usersRoutes from './routes/users.ts';
import systemRoutes from './routes/system.ts';


const app: express.Application = express();

app.use(cors());
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
 * health
 */
app.use('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    success: true,
    message: 'ok'
  });
});

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('全局错误处理器捕获到错误:', error);
  console.error('错误详情:', error.message);
  console.error('错误堆栈:', error.stack);
  console.error('请求路径:', req.path);
  console.error('请求方法:', req.method);
  
  res.status(500).json({
    success: false,
    error: 'Server internal error',
    message: error.message,
    details: error.toString()
  });
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