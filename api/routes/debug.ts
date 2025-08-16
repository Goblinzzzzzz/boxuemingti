import express, { Request, Response } from 'express';
import { supabase } from '../services/supabaseClient';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = express.Router();

/**
 * 详细的错误诊断接口
 * GET /api/debug
 */
router.get('/', async (req: Request, res: Response) => {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    platform: process.platform,
    nodeVersion: process.version,
    checks: {}
  };

  try {
    // 1. 环境变量检查
    debugInfo.checks.environmentVariables = {
      status: 'checking',
      variables: {
        NODE_ENV: !!process.env.NODE_ENV,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        JWT_SECRET: !!process.env.JWT_SECRET,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY
      },
      values: {
        SUPABASE_URL: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'missing',
        NODE_ENV: process.env.NODE_ENV || 'undefined'
      }
    };
    debugInfo.checks.environmentVariables.status = 'completed';

    // 2. 数据库连接测试
    debugInfo.checks.databaseConnection = {
      status: 'checking',
      supabaseClient: null,
      connectionTest: null
    };

    try {
      // 测试 Supabase 客户端初始化
      debugInfo.checks.databaseConnection.supabaseClient = {
        initialized: !!supabase,
        url: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'missing',
        key: process.env.SUPABASE_ANON_KEY ? 'present' : 'missing'
      };

      // 测试数据库连接
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      debugInfo.checks.databaseConnection.connectionTest = {
        success: !error,
        error: error?.message || null,
        data: data ? 'received' : 'none'
      };
      debugInfo.checks.databaseConnection.status = 'completed';
    } catch (dbError: any) {
      debugInfo.checks.databaseConnection.status = 'failed';
      debugInfo.checks.databaseConnection.error = dbError.message;
    }

    // 3. 依赖包验证
    debugInfo.checks.dependencies = {
      status: 'checking',
      packages: {}
    };

    try {
      // 测试 JWT
      const testToken = jwt.sign({ test: true }, process.env.JWT_SECRET || 'test', { expiresIn: '1m' });
      const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'test');
      debugInfo.checks.dependencies.packages.jwt = {
        available: true,
        version: 'available',
        test: 'passed'
      };
    } catch (jwtError: any) {
      debugInfo.checks.dependencies.packages.jwt = {
        available: false,
        error: jwtError.message
      };
    }

    try {
      // 测试 bcrypt
      const testHash = await bcrypt.hash('test', 10);
      const testCompare = await bcrypt.compare('test', testHash);
      debugInfo.checks.dependencies.packages.bcrypt = {
        available: true,
        version: 'available',
        test: testCompare ? 'passed' : 'failed'
      };
    } catch (bcryptError: any) {
      debugInfo.checks.dependencies.packages.bcrypt = {
        available: false,
        error: bcryptError.message
      };
    }

    try {
      // 测试 crypto
      const testCrypto = crypto.randomBytes(16).toString('hex');
      debugInfo.checks.dependencies.packages.crypto = {
        available: true,
        test: testCrypto ? 'passed' : 'failed'
      };
    } catch (cryptoError: any) {
      debugInfo.checks.dependencies.packages.crypto = {
        available: false,
        error: cryptoError.message
      };
    }

    debugInfo.checks.dependencies.status = 'completed';

    // 4. 内存和性能检查
    debugInfo.checks.performance = {
      status: 'checking',
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage()
    };
    debugInfo.checks.performance.status = 'completed';

    // 5. 请求信息
    debugInfo.request = {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      },
      ip: req.ip || req.connection.remoteAddress
    };

    debugInfo.overall = {
      status: 'completed',
      summary: {
        environmentVariables: debugInfo.checks.environmentVariables.status,
        databaseConnection: debugInfo.checks.databaseConnection.status,
        dependencies: debugInfo.checks.dependencies.status,
        performance: debugInfo.checks.performance.status
      }
    };

    res.status(200).json({
      success: true,
      debug: debugInfo
    });

  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    
    debugInfo.overall = {
      status: 'failed',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    };

    res.status(500).json({
      success: false,
      error: 'Debug endpoint failed',
      debug: debugInfo
    });
  }
});

/**
 * 简化的健康检查接口
 * GET /api/debug/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // 快速数据库连接测试
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        responseTime
      });
    }
    
    res.status(200).json({
      success: true,
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;