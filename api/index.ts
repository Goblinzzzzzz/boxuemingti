/**
 * Vercel deploy entry handler, for serverless deployment
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from './app';

// 验证关键环境变量
function validateEnvironment() {
  const requiredEnvVars = [
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }
  
  console.log('Environment variables validated successfully');
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置响应头以支持CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    console.log(`[${new Date().toISOString()}] API Request: ${req.method} ${req.url}`);
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    // 验证环境变量
    if (!validateEnvironment()) {
      console.error('Environment validation failed');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
        error: 'Missing required environment variables'
      });
    }
    
    // 设置请求超时（Vercel函数有10秒限制）
    const timeout = setTimeout(() => {
      console.error('Request timeout after 9 seconds');
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          error: 'Function execution exceeded time limit'
        });
      }
    }, 9000);
    
    try {
      await app(req, res);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('API Handler Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
}