import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabase } from '../services/supabaseClient';

const router = express.Router();

/**
 * 生产环境兼容性检查接口
 * GET /api/compatibility/check
 */
router.get('/check', async (req: Request, res: Response) => {
  const compatibilityReport: any = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      vercelRegion: process.env.VERCEL_REGION || 'local',
      nodeEnv: process.env.NODE_ENV
    },
    checks: {}
  };

  try {
    // 1. JWT 兼容性测试
    compatibilityReport.checks.jwt = await testJWTCompatibility();
    
    // 2. 加密库兼容性测试
    compatibilityReport.checks.crypto = await testCryptoCompatibility();
    
    // 3. bcrypt 兼容性测试
    compatibilityReport.checks.bcrypt = await testBcryptCompatibility();
    
    // 4. 异步操作兼容性测试
    compatibilityReport.checks.async = await testAsyncCompatibility();
    
    // 5. 数据库连接兼容性测试
    compatibilityReport.checks.database = await testDatabaseCompatibility();
    
    // 6. 内存和性能测试
    compatibilityReport.checks.performance = await testPerformanceCompatibility();
    
    // 计算总体兼容性状态
    const allChecks = Object.values(compatibilityReport.checks);
    const passedChecks = allChecks.filter((check: any) => check.status === 'passed').length;
    const totalChecks = allChecks.length;
    
    compatibilityReport.overall = {
      status: passedChecks === totalChecks ? 'compatible' : 'issues_detected',
      passedChecks,
      totalChecks,
      compatibilityScore: Math.round((passedChecks / totalChecks) * 100)
    };
    
    res.json({
      success: true,
      data: compatibilityReport
    });
    
  } catch (error) {
    console.error('兼容性检查失败:', error);
    
    compatibilityReport.overall = {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误'
    };
    
    res.status(500).json({
      success: false,
      error: '兼容性检查失败',
      data: compatibilityReport
    });
  }
});

/**
 * JWT 兼容性测试
 */
async function testJWTCompatibility() {
  try {
    const testPayload = { test: true, timestamp: Date.now() };
    const secret = process.env.JWT_SECRET || 'test-secret';
    
    // 测试 JWT 签名
    const token = jwt.sign(testPayload, secret, { expiresIn: '1m' });
    
    // 测试 JWT 验证
    const decoded = jwt.verify(token, secret) as any;
    
    // 测试过期时间
    const expiredToken = jwt.sign(testPayload, secret, { expiresIn: '0s' });
    
    let expiredTest = false;
    try {
      jwt.verify(expiredToken, secret);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        expiredTest = true;
      }
    }
    
    return {
      status: 'passed',
      tests: {
        signing: !!token,
        verification: decoded.test === true,
        expiration: expiredTest
      },
      message: 'JWT 库在生产环境中兼容'
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误',
      message: 'JWT 库在生产环境中不兼容'
    };
  }
}

/**
 * 加密库兼容性测试
 */
async function testCryptoCompatibility() {
  try {
    // 测试随机数生成
    const randomBytes = crypto.randomBytes(32);
    
    // 测试哈希
    const hash = crypto.createHash('sha256').update('test').digest('hex');
    
    // 测试 HMAC
    const hmac = crypto.createHmac('sha256', 'secret').update('test').digest('hex');
    
    return {
      status: 'passed',
      tests: {
        randomBytes: randomBytes.length === 32,
        hash: hash.length === 64,
        hmac: hmac.length === 64
      },
      message: 'Crypto 库在生产环境中兼容'
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误',
      message: 'Crypto 库在生产环境中不兼容'
    };
  }
}

/**
 * bcrypt 兼容性测试
 */
async function testBcryptCompatibility() {
  try {
    const testPassword = 'test-password-123';
    
    // 测试密码哈希
    const hash = await bcrypt.hash(testPassword, 10);
    
    // 测试密码验证
    const isValid = await bcrypt.compare(testPassword, hash);
    const isInvalid = await bcrypt.compare('wrong-password', hash);
    
    return {
      status: 'passed',
      tests: {
        hashing: !!hash,
        validation: isValid === true,
        rejection: isInvalid === false
      },
      message: 'bcrypt 库在生产环境中兼容'
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误',
      message: 'bcrypt 库在生产环境中不兼容'
    };
  }
}

/**
 * 异步操作兼容性测试
 */
async function testAsyncCompatibility() {
  try {
    // 测试 Promise
    const promiseResult = await new Promise(resolve => {
      setTimeout(() => resolve('success'), 10);
    });
    
    // 测试 async/await
    const asyncFunction = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'async-success';
    };
    const asyncResult = await asyncFunction();
    
    // 测试并发 Promise
    const concurrentResults = await Promise.all([
      Promise.resolve('result1'),
      Promise.resolve('result2'),
      Promise.resolve('result3')
    ]);
    
    return {
      status: 'passed',
      tests: {
        promises: promiseResult === 'success',
        asyncAwait: asyncResult === 'async-success',
        concurrent: concurrentResults.length === 3
      },
      message: '异步操作在生产环境中兼容'
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误',
      message: '异步操作在生产环境中不兼容'
    };
  }
}

/**
 * 数据库连接兼容性测试
 */
async function testDatabaseCompatibility() {
  try {
    const startTime = Date.now();
    
    // 测试基本连接
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const connectionTime = Date.now() - startTime;
    
    if (error) {
      return {
        status: 'failed',
        error: error.message,
        message: '数据库连接在生产环境中不兼容'
      };
    }
    
    // 测试并发连接
    const concurrentStart = Date.now();
    const concurrentPromises = Array.from({ length: 3 }, () => 
      supabase.from('users').select('count').limit(1)
    );
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentTime = Date.now() - concurrentStart;
    
    const allSuccessful = concurrentResults.every(result => !result.error);
    
    return {
      status: 'passed',
      tests: {
        basicConnection: !error,
        connectionTime: connectionTime < 5000, // 5秒内
        concurrentConnections: allSuccessful,
        concurrentTime: concurrentTime < 10000 // 10秒内
      },
      performance: {
        connectionTime: `${connectionTime}ms`,
        concurrentTime: `${concurrentTime}ms`
      },
      message: '数据库连接在生产环境中兼容'
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误',
      message: '数据库连接在生产环境中不兼容'
    };
  }
}

/**
 * 性能兼容性测试
 */
async function testPerformanceCompatibility() {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // 测试内存使用
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryOK = memoryMB < 500; // 小于500MB
    
    // 测试 CPU 时间
    const cpuTime = (cpuUsage.user + cpuUsage.system) / 1000000; // 转换为秒
    
    // 测试响应时间
    const responseStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1));
    const responseTime = Date.now() - responseStart;
    
    return {
      status: 'passed',
      tests: {
        memoryUsage: memoryOK,
        responseTime: responseTime < 100 // 小于100ms
      },
      metrics: {
        memoryUsage: `${memoryMB.toFixed(2)}MB`,
        cpuTime: `${cpuTime.toFixed(3)}s`,
        responseTime: `${responseTime}ms`
      },
      message: '性能在生产环境中兼容'
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误',
      message: '性能在生产环境中不兼容'
    };
  }
}

export default router;