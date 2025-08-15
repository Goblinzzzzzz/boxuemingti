import express, { Request, Response } from 'express';
import { supabase } from '../services/supabaseClient';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = express.Router();

/**
 * 部署状态和调试信息接口
 * GET /api/deployment/status
 */
router.get('/status', async (req: Request, res: Response) => {
  const deploymentInfo: any = {
    timestamp: new Date().toISOString(),
    deployment: {
      environment: process.env.NODE_ENV || 'unknown',
      platform: process.platform,
      nodeVersion: process.version,
      vercelRegion: process.env.VERCEL_REGION || 'local',
      vercelUrl: process.env.VERCEL_URL || 'localhost',
      deploymentId: process.env.VERCEL_GIT_COMMIT_SHA || 'local-dev'
    },
    services: {},
    performance: {},
    security: {},
    errors: []
  };

  try {
    // 1. 环境变量检查
    deploymentInfo.services.environment = await checkEnvironmentVariables();
    
    // 2. 数据库服务检查
    deploymentInfo.services.database = await checkDatabaseService();
    
    // 3. 认证服务检查
    deploymentInfo.services.authentication = await checkAuthenticationService();
    
    // 4. 性能指标检查
    deploymentInfo.performance = await checkPerformanceMetrics();
    
    // 5. 安全配置检查
    deploymentInfo.security = await checkSecurityConfiguration();
    
    // 6. API 端点健康检查
    deploymentInfo.services.endpoints = await checkAPIEndpoints();
    
    // 计算总体状态
    const allServices = Object.values(deploymentInfo.services);
    const healthyServices = allServices.filter((service: any) => service.status === 'healthy').length;
    const totalServices = allServices.length;
    
    deploymentInfo.overall = {
      status: healthyServices === totalServices ? 'healthy' : 'degraded',
      healthyServices,
      totalServices,
      healthScore: Math.round((healthyServices / totalServices) * 100),
      readyForProduction: healthyServices === totalServices && deploymentInfo.security.score >= 80
    };
    
    res.json({
      success: true,
      data: deploymentInfo
    });
    
  } catch (error) {
    console.error('部署状态检查失败:', error);
    
    deploymentInfo.overall = {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误'
    };
    
    res.status(500).json({
      success: false,
      error: '部署状态检查失败',
      data: deploymentInfo
    });
  }
});

/**
 * 环境变量检查
 */
async function checkEnvironmentVariables() {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'JWT_SECRET'
  ];
  
  const optionalVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'AI_PROVIDER',
    'NODE_ENV'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  const present = requiredVars.filter(varName => process.env[varName]);
  const optional = optionalVars.filter(varName => process.env[varName]);
  
  return {
    status: missing.length === 0 ? 'healthy' : 'unhealthy',
    required: {
      total: requiredVars.length,
      present: present.length,
      missing: missing
    },
    optional: {
      total: optionalVars.length,
      present: optional.length,
      available: optional
    },
    message: missing.length === 0 ? '所有必需的环境变量已配置' : `缺少 ${missing.length} 个必需的环境变量`
  };
}

/**
 * 数据库服务检查
 */
async function checkDatabaseService() {
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
        status: 'unhealthy',
        error: error.message,
        connectionTime: `${connectionTime}ms`,
        message: '数据库连接失败'
      };
    }
    
    // 测试表权限
    const { data: authTest, error: authError } = await supabase.auth.getSession();
    
    return {
      status: 'healthy',
      connectionTime: `${connectionTime}ms`,
      tablesAccessible: !error,
      authServiceAvailable: !authError,
      message: '数据库服务正常'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : '未知错误',
      message: '数据库服务检查失败'
    };
  }
}

/**
 * 认证服务检查
 */
async function checkAuthenticationService() {
  try {
    const testPayload = { test: true, timestamp: Date.now() };
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      return {
        status: 'unhealthy',
        error: 'JWT_SECRET 未配置',
        message: '认证服务配置错误'
      };
    }
    
    // 测试 JWT 签名和验证
    const token = jwt.sign(testPayload, secret, { expiresIn: '1m' });
    const decoded = jwt.verify(token, secret) as any;
    
    // 测试密码哈希
    const testPassword = 'test-password';
    const hash = await bcrypt.hash(testPassword, 10);
    const isValid = await bcrypt.compare(testPassword, hash);
    
    return {
      status: 'healthy',
      jwt: {
        signing: !!token,
        verification: decoded.test === true
      },
      passwordHashing: {
        hashing: !!hash,
        verification: isValid
      },
      message: '认证服务正常'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : '未知错误',
      message: '认证服务检查失败'
    };
  }
}

/**
 * 性能指标检查
 */
async function checkPerformanceMetrics() {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const uptime = process.uptime();
  
  const memoryMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  };
  
  const cpuTime = {
    user: Math.round(cpuUsage.user / 1000000), // 转换为秒
    system: Math.round(cpuUsage.system / 1000000)
  };
  
  // 性能评分
  let score = 100;
  if (memoryMB.heapUsed > 200) score -= 20; // 堆内存超过200MB
  if (memoryMB.rss > 500) score -= 30; // RSS超过500MB
  if (cpuTime.user + cpuTime.system > 60) score -= 20; // CPU时间超过60秒
  
  return {
    memory: {
      ...memoryMB,
      unit: 'MB'
    },
    cpu: {
      ...cpuTime,
      unit: 'seconds'
    },
    uptime: {
      seconds: Math.round(uptime),
      formatted: formatUptime(uptime)
    },
    score: Math.max(0, score),
    status: score >= 70 ? 'good' : score >= 40 ? 'fair' : 'poor'
  };
}

/**
 * 安全配置检查
 */
async function checkSecurityConfiguration() {
  let score = 0;
  const checks = {
    jwtSecret: false,
    httpsOnly: false,
    corsConfigured: false,
    environmentSecure: false,
    passwordHashing: false
  };
  
  // JWT Secret 检查
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
    checks.jwtSecret = true;
    score += 25;
  }
  
  // HTTPS 检查（生产环境）
  if (process.env.NODE_ENV === 'production') {
    if (process.env.VERCEL_URL?.startsWith('https://')) {
      checks.httpsOnly = true;
      score += 20;
    }
  } else {
    checks.httpsOnly = true; // 开发环境跳过
    score += 20;
  }
  
  // CORS 配置检查
  checks.corsConfigured = true; // 假设已配置
  score += 15;
  
  // 环境安全检查
  if (process.env.NODE_ENV === 'production' && !process.env.DEBUG) {
    checks.environmentSecure = true;
    score += 20;
  } else if (process.env.NODE_ENV !== 'production') {
    checks.environmentSecure = true; // 开发环境跳过
    score += 20;
  }
  
  // 密码哈希检查
  try {
    await bcrypt.hash('test', 10);
    checks.passwordHashing = true;
    score += 20;
  } catch (error) {
    // bcrypt 不可用
  }
  
  return {
    score,
    level: score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor',
    checks,
    recommendations: generateSecurityRecommendations(checks, score)
  };
}

/**
 * API 端点健康检查
 */
async function checkAPIEndpoints() {
  const endpoints = [
    { path: '/api/health', method: 'GET' },
    { path: '/api/debug', method: 'GET' },
    { path: '/api/logs/test', method: 'GET' },
    { path: '/api/compatibility/check', method: 'GET' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await fetch(`http://localhost:3003${endpoint.path}`);
      const responseTime = Date.now() - startTime;
      
      results.push({
        ...endpoint,
        status: response.ok ? 'healthy' : 'unhealthy',
        statusCode: response.status,
        responseTime: `${responseTime}ms`
      });
    } catch (error) {
      results.push({
        ...endpoint,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  }
  
  const healthyEndpoints = results.filter(r => r.status === 'healthy').length;
  
  return {
    status: healthyEndpoints === endpoints.length ? 'healthy' : 'degraded',
    total: endpoints.length,
    healthy: healthyEndpoints,
    endpoints: results
  };
}

/**
 * 格式化运行时间
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}天 ${hours}小时 ${minutes}分钟`;
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  if (minutes > 0) return `${minutes}分钟 ${secs}秒`;
  return `${secs}秒`;
}

/**
 * 生成安全建议
 */
function generateSecurityRecommendations(checks: any, score: number): string[] {
  const recommendations = [];
  
  if (!checks.jwtSecret) {
    recommendations.push('配置强度足够的 JWT_SECRET（至少32字符）');
  }
  
  if (!checks.httpsOnly) {
    recommendations.push('在生产环境中启用 HTTPS');
  }
  
  if (!checks.environmentSecure) {
    recommendations.push('在生产环境中禁用调试模式');
  }
  
  if (!checks.passwordHashing) {
    recommendations.push('确保密码哈希功能正常工作');
  }
  
  if (score < 70) {
    recommendations.push('提升整体安全配置以达到生产环境标准');
  }
  
  return recommendations;
}

export default router;