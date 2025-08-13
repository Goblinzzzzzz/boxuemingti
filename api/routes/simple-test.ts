import { Request, Response } from 'express';

/**
 * 最简单的测试接口
 * 用于验证Vercel部署的基础功能
 */
export const simpleTest = (req: Request, res: Response) => {
  try {
    const response = {
      success: true,
      message: 'API is working',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        platform: process.platform,
        nodeVersion: process.version
      },
      environmentVariables: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET,
        supabaseUrlPrefix: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) + '...' : 'missing'
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Simple test failed',
      message: error.message,
      stack: error.stack
    });
  }
};