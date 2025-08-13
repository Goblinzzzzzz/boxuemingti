import { Request, Response } from 'express';

/**
 * 专门的环境变量检查接口
 * 用于验证Vercel生产环境中的环境变量传递情况
 */
export const envCheckHandler = async (req: Request, res: Response) => {
  try {
    const timestamp = new Date().toISOString();
    
    // 需要检查的环境变量列表
    const requiredEnvVars = [
      'NODE_ENV',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'VERCEL',
      'VERCEL_URL',
      'VERCEL_ENV'
    ];

    // 脱敏显示函数
    const maskValue = (value: string | undefined, showLength = 10): string => {
      if (!value) return 'undefined';
      if (value.length <= showLength) {
        return value.substring(0, 3) + '*'.repeat(Math.max(0, value.length - 3));
      }
      return value.substring(0, showLength) + '...' + value.substring(value.length - 3);
    };

    // 检查环境变量状态
    const envStatus: any = {
      timestamp,
      platform: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        isVercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV || 'unknown'
      },
      environmentVariables: {},
      summary: {
        total: requiredEnvVars.length,
        defined: 0,
        undefined: 0,
        issues: []
      }
    };

    // 检查每个环境变量
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      const isDefined = value !== undefined && value !== '';
      
      envStatus.environmentVariables[varName] = {
        defined: isDefined,
        hasValue: !!value,
        length: value ? value.length : 0,
        preview: isDefined ? maskValue(value) : 'undefined',
        type: typeof value
      };

      if (isDefined) {
        envStatus.summary.defined++;
      } else {
        envStatus.summary.undefined++;
        envStatus.summary.issues.push(`${varName} is undefined or empty`);
      }

      // 特殊检查
      if (varName === 'SUPABASE_URL' && value && !value.startsWith('https://')) {
        envStatus.summary.issues.push(`${varName} should start with https://`);
      }
      
      if (varName === 'JWT_SECRET' && value && value.length < 32) {
        envStatus.summary.issues.push(`${varName} should be at least 32 characters long`);
      }
    });

    // 额外的环境信息
    envStatus.additionalInfo = {
      processEnvKeys: Object.keys(process.env).length,
      vercelSpecificVars: Object.keys(process.env)
        .filter(key => key.startsWith('VERCEL_'))
        .reduce((acc: any, key) => {
          acc[key] = {
            defined: true,
            preview: maskValue(process.env[key])
          };
          return acc;
        }, {}),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    // 健康状态评估
    const healthScore = (envStatus.summary.defined / envStatus.summary.total) * 100;
    envStatus.health = {
      score: Math.round(healthScore),
      status: healthScore === 100 ? 'healthy' : healthScore >= 80 ? 'warning' : 'critical',
      message: healthScore === 100 
        ? 'All environment variables are properly configured'
        : `${envStatus.summary.undefined} environment variables are missing or empty`
    };

    console.log(`[ENV-CHECK] Health Score: ${envStatus.health.score}%, Status: ${envStatus.health.status}`);
    console.log(`[ENV-CHECK] Issues: ${envStatus.summary.issues.length}`);
    
    if (envStatus.summary.issues.length > 0) {
      console.log('[ENV-CHECK] Issues found:', envStatus.summary.issues);
    }

    res.status(200).json({
      success: true,
      environment: envStatus
    });

  } catch (error: any) {
    console.error('[ENV-CHECK] Error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Environment check failed',
        details: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 简化的环境变量快速检查
 */
export const quickEnvCheck = (req: Request, res: Response) => {
  try {
    const criticalVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
    const status = criticalVars.map(varName => ({
      name: varName,
      defined: !!process.env[varName],
      length: process.env[varName]?.length || 0
    }));

    const allDefined = status.every(v => v.defined);

    res.status(allDefined ? 200 : 500).json({
      success: allDefined,
      critical_vars: status,
      message: allDefined ? 'All critical variables defined' : 'Some critical variables missing',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};