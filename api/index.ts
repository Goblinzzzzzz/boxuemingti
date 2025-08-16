/**
 * Vercel deploy entry handler, for serverless deployment
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from './app';
// 移除有问题的vercel-logger依赖
import { supabaseValidator } from './supabase-validator';
// 移除有问题的vercel-optimization依赖

// 验证关键环境变量
function validateEnvironment() {
  console.log('🔍 Vercel 环境变量验证开始...');
  
  const requiredVars = {
    'JWT_SECRET': process.env.JWT_SECRET,
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  
  const missingVars = [];
  const invalidVars = [];
  
  // 详细检查每个环境变量
  for (const [varName, value] of Object.entries(requiredVars)) {
    if (!value) {
      missingVars.push(varName);
    } else if (value.length < 10) {
      invalidVars.push(`${varName} (长度过短: ${value.length} 字符)`);
    }
  }
  
  // 验证 SUPABASE_URL 格式
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
    invalidVars.push('SUPABASE_URL (格式无效，应以https://开头)');
  }
  
  // 记录详细的环境变量状态
  console.log('📊 Vercel 环境变量状态:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
  console.log(`  VERCEL: ${process.env.VERCEL || '未设置'}`);
  console.log(`  VERCEL_ENV: ${process.env.VERCEL_ENV || '未设置'}`);
  console.log(`  VERCEL_REGION: ${process.env.VERCEL_REGION || '未设置'}`);
  console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? `已设置 (${process.env.JWT_SECRET.length} 字符)` : '未设置'}`);
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? `已设置 (${process.env.SUPABASE_URL})` : '未设置'}`);
  console.log(`  SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? `已设置 (${process.env.SUPABASE_ANON_KEY.length} 字符)` : '未设置'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? `已设置 (${process.env.SUPABASE_SERVICE_ROLE_KEY.length} 字符)` : '未设置'}`);
  
  if (missingVars.length > 0) {
    console.error('❌ 缺少必需的环境变量:', missingVars.join(', '));
    console.error('请在 Vercel 控制台配置这些环境变量');
    console.error('配置路径: Project Settings > Environment Variables');
  }
  
  if (invalidVars.length > 0) {
    console.error('❌ 环境变量格式无效:', invalidVars.join(', '));
  }
  
  const isValid = missingVars.length === 0 && invalidVars.length === 0;
  
  if (isValid) {
    console.log('✅ Vercel 环境变量验证通过');
  } else {
    console.error('💥 Vercel 环境变量验证失败');
  }
  
  return isValid;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // const requestLogger = vercelLogger.createRequestLogger(req);
  const handlerId = Math.random().toString(36).substr(2, 9);
  // const performanceMonitor = new PerformanceMonitor(handlerId);
  
  // 设置响应头以支持CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    console.log('处理OPTIONS预检请求');
    res.status(200).end();
    return;
  }
  
  try {
    console.log('Vercel 函数开始执行');
    
    // 记录初始内存使用情况
    // logMemoryUsage('handler_start');
    
    // 验证环境变量
    console.log('开始环境变量验证');
    if (!validateEnvironment()) {
      console.error('环境变量验证失败');
      return res.status(500).json({
        success: false,
        error: 'ENVIRONMENT_ERROR',
        message: '服务器配置错误，请联系管理员',
        handlerId,
        timestamp: new Date().toISOString(),
        vercelEnv: process.env.VERCEL_ENV || 'unknown'
      });
    }
    console.log('环境变量验证通过');
    
    // 快速连接测试（仅在生产环境）
    if (process.env.VERCEL_ENV === 'production') {
      console.log('执行快速连接测试');
      const connectionTest = await supabaseValidator.quickConnectionTest();
      
      if (!connectionTest.success) {
        console.error('Supabase 连接测试失败', connectionTest.details);
        return res.status(503).json({
          success: false,
          error: 'DATABASE_CONNECTION_ERROR',
          message: '数据库连接失败',
          details: connectionTest,
          handlerId,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`Supabase 连接测试通过 (${connectionTest.duration || 0}ms)`);
    }
    
    // 设置请求超时（Vercel函数有10秒限制）
    const TIMEOUT_MS = 8000; // 8秒超时，留2秒缓冲
    const timeout = setTimeout(() => {
      // // const duration = performanceMonitor.finish();
      console.error('请求处理超时');
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'REQUEST_TIMEOUT',
          message: '请求处理超时',
          handlerId,
          // duration: `${duration}ms`,
          timeout: `${TIMEOUT_MS}ms`
        });
      }
    }, TIMEOUT_MS);
    
    try {
      console.log('将请求传递给Express应用');
      await app(req, res);
    } finally {
      clearTimeout(timeout);
      console.log('请求完成');
      
      // 记录最终内存使用情况
      // logMemoryUsage('handler_end');
    }
  } catch (error) {
    // const duration = performanceMonitor.finish();
      console.error('请求处理异常', {
        error: error.message || error,
        handlerId
      });
    
    console.error('Vercel函数处理错误:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'VERCEL_FUNCTION_ERROR',
        message: '函数执行错误',
        handlerId,
        // duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        vercelEnv: process.env.VERCEL_ENV || 'unknown'
      });
    }
  }
}