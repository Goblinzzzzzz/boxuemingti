/**
 * 最基础的Vercel函数测试接口
 * 不依赖任何外部模块，用于验证Vercel函数基础功能
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    const timestamp = new Date().toISOString();
    const nodeVersion = process.version;
    const platform = process.platform;
    const arch = process.arch;
    
    // 检查基础环境变量
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      VERCEL: process.env.VERCEL || 'undefined',
      VERCEL_ENV: process.env.VERCEL_ENV || 'undefined',
      VERCEL_REGION: process.env.VERCEL_REGION || 'undefined',
      JWT_SECRET: process.env.JWT_SECRET ? 'defined' : 'undefined',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'defined' : 'undefined',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'defined' : 'undefined'
    };
    
    const response = {
      success: true,
      message: 'Vercel函数基础测试成功',
      timestamp,
      environment: {
        nodeVersion,
        platform,
        arch,
        envCheck
      },
      request: {
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip']
        }
      }
    };
    
    console.log('Basic test response:', JSON.stringify(response, null, 2));
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Basic test error:', error);
    
    res.status(500).json({
      success: false,
      error: 'BASIC_TEST_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}