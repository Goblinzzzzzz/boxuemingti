/**
 * 健康检查和数据库连接测试路由
 */
import express, { type Request, type Response } from 'express';
import { supabase } from '../services/supabaseClient.js';
import { vercelLogger } from '../vercel-logger.js';
import { supabaseValidator } from '../supabase-validator.js';
// import { debugHandler, healthCheck } from './debug.js';

const router = express.Router();

/**
 * 主健康检查接口
 * GET /api/health
 */
router.get('/', async (req: Request, res: Response) => {
  const requestLogger = vercelLogger.createRequestLogger(req);
  const healthCheckId = requestLogger.getRequestId();
  
  try {
    requestLogger.info('开始健康检查');
    
    // 执行快速连接测试
    const quickTest = await supabaseValidator.quickConnectionTest();
    
    if (!quickTest.success) {
      requestLogger.error('快速连接测试失败', quickTest.details);
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Quick connection test failed',
        details: quickTest,
        healthCheckId,
        timestamp: new Date().toISOString()
      });
    }
    
    requestLogger.performance('quick_connection_test', quickTest.duration || 0);
    requestLogger.info('快速连接测试通过');
    
    // 返回健康状态
    res.json({
      success: true,
      status: 'healthy',
      message: 'All systems operational',
      details: {
        connection: quickTest,
        environment: process.env.VERCEL ? 'vercel' : 'local',
        region: process.env.VERCEL_REGION || 'unknown',
        nodeEnv: process.env.NODE_ENV || 'unknown'
      },
      performance: {
        connectionTime: quickTest.duration || 0
      },
      healthCheckId,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    requestLogger.error('健康检查过程中发生错误', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        status: 'error',
        error: 'Health check failed',
        details: error instanceof Error ? error.message : String(error),
        healthCheckId,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * 详细的数据库连接测试接口
 * GET /api/health/db
 */
router.get('/db', async (req: Request, res: Response) => {
  const requestLogger = vercelLogger.createRequestLogger(req);
  const testId = requestLogger.getRequestId();
  
  try {
    requestLogger.info('开始详细数据库测试');
    
    // 执行完整的 Supabase 验证
    const validationReport = await supabaseValidator.validateComplete();
    
    requestLogger.performance('complete_validation', validationReport.performance.totalTime);
    requestLogger.info(`详细数据库测试完成: ${validationReport.overall.success ? '通过' : '失败'}`);
    
    const statusCode = validationReport.overall.success ? 200 : 503;
    
    res.status(statusCode).json({
      success: validationReport.overall.success,
      status: validationReport.overall.success ? 'healthy' : 'unhealthy',
      message: validationReport.overall.message,
      validation: validationReport,
      testId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    requestLogger.error('详细数据库测试过程中发生错误', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        status: 'error',
        error: 'Database test failed',
        details: error instanceof Error ? error.message : String(error),
        testId,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * 原始数据库连接测试接口（保持向后兼容）
 * GET /api/health/db/legacy
 */
router.get('/db/legacy', async (req: Request, res: Response) => {
  const testId = Date.now().toString(36);
  console.log(`[DB-TEST-${testId}] 开始数据库连接测试...`);
  
  try {
    // 记录环境变量状态
    console.log(`[DB-TEST-${testId}] 环境变量检查:`, {
      supabaseUrl: process.env.SUPABASE_URL ? '已设置' : '未设置',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '已设置' : '未设置',
      nodeEnv: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION || 'local'
    });
    
    // 测试 1: 基本连接测试
    console.log(`[DB-TEST-${testId}] 执行基本连接测试...`);
    const startTime = Date.now();
    
    // 尝试查询一个简单的表或执行简单查询
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const connectionTime = Date.now() - startTime;
    
    if (testError) {
      console.error(`[DB-TEST-${testId}] 基本连接测试失败:`, {
        error: testError.message,
        code: testError.code,
        details: testError.details,
        hint: testError.hint,
        connectionTime: `${connectionTime}ms`
      });
      
      return res.status(503).json({
        success: false,
        message: '数据库连接失败',
        testId,
        error: {
          type: 'CONNECTION_ERROR',
          message: testError.message,
          code: testError.code,
          details: testError.details,
          hint: testError.hint
        },
        timing: {
          connectionTime: `${connectionTime}ms`,
          timestamp: new Date().toISOString()
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          vercelRegion: process.env.VERCEL_REGION || 'local'
        }
      });
    }
    
    console.log(`[DB-TEST-${testId}] 基本连接测试成功，耗时: ${connectionTime}ms`);
    
    // 测试 2: 权限测试
    console.log(`[DB-TEST-${testId}] 执行权限测试...`);
    const permissionStartTime = Date.now();
    
    const { data: permissionData, error: permissionError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    const permissionTime = Date.now() - permissionStartTime;
    
    if (permissionError) {
      console.warn(`[DB-TEST-${testId}] 权限测试警告:`, {
        error: permissionError.message,
        code: permissionError.code,
        permissionTime: `${permissionTime}ms`
      });
    } else {
      console.log(`[DB-TEST-${testId}] 权限测试成功，耗时: ${permissionTime}ms`);
    }
    
    // 测试 3: 表结构检查
    console.log(`[DB-TEST-${testId}] 执行表结构检查...`);
    const schemaStartTime = Date.now();
    
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_info', { table_name: 'users' })
      .single();
    
    const schemaTime = Date.now() - schemaStartTime;
    
    // 表结构检查失败不影响整体结果，只记录警告
    if (schemaError) {
      console.warn(`[DB-TEST-${testId}] 表结构检查警告:`, {
        error: schemaError.message,
        schemaTime: `${schemaTime}ms`
      });
    } else {
      console.log(`[DB-TEST-${testId}] 表结构检查成功，耗时: ${schemaTime}ms`);
    }
    
    const totalTime = Date.now() - startTime;
    
    const result = {
      success: true,
      message: '数据库连接测试通过',
      testId,
      tests: {
        connection: {
          status: 'passed',
          time: `${connectionTime}ms`
        },
        permissions: {
          status: permissionError ? 'warning' : 'passed',
          time: `${permissionTime}ms`,
          warning: permissionError?.message
        },
        schema: {
          status: schemaError ? 'warning' : 'passed',
          time: `${schemaTime}ms`,
          warning: schemaError?.message
        }
      },
      timing: {
        totalTime: `${totalTime}ms`,
        timestamp: new Date().toISOString()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelRegion: process.env.VERCEL_REGION || 'local'
      },
      database: {
        url: process.env.SUPABASE_URL ? '已配置' : '未配置',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '已配置' : '未配置'
      }
    };
    
    console.log(`[DB-TEST-${testId}] 数据库连接测试完成:`, {
      success: true,
      totalTime: `${totalTime}ms`,
      tests: Object.keys(result.tests).length
    });
    
    res.status(200).json(result);
    
  } catch (error) {
    const errorTime = Date.now();
    console.error(`[DB-TEST-${testId}] 数据库连接测试异常:`, {
      error: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: '数据库连接测试异常',
      testId,
      error: {
        type: 'TEST_EXCEPTION',
        message: error instanceof Error ? error.message : '未知错误'
      },
      timing: {
        timestamp: new Date().toISOString()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelRegion: process.env.VERCEL_REGION || 'local'
      }
    });
  }
});

/**
 * 简化的数据库连接状态检查
 * GET /api/health/db/status
 */
router.get('/db/status', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      return res.status(503).json({
        connected: false,
        error: error.message
      });
    }
    
    res.status(200).json({
      connected: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * 详细的错误诊断接口
 * GET /api/health/debug
 */
// router.get('/debug', debugHandler);

/**
 * 简化的健康检查接口
 * GET /api/health/check
 */
// router.get('/check', healthCheck);

export default router;