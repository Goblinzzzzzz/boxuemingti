/**
 * Vercel deploy entry handler, for serverless deployment
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from './app.js';

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
    
    return await app(req, res);
  } catch (error) {
    console.error('API Handler Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}