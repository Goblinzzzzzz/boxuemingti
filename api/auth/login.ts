/**
 * Vercel Serverless Function for User Login
 * POST /api/auth/login
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseClient';
import { vercelLogger } from '../vercel-logger';

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed. Only POST requests are supported.'
    });
  }

  const startTime = Date.now();
  const requestLogger = vercelLogger.createRequestLogger(req);
  const loginId = requestLogger.getRequestId();
  
  try {
    requestLogger.info('登录请求开始');
    vercelLogger.auth('login_attempt', undefined, false, { email: req.body.email });
    
    requestLogger.info('环境检查', {
      nodeEnv: process.env.NODE_ENV,
      jwtSecret: process.env.JWT_SECRET ? '已设置' : '未设置',
      supabaseUrl: process.env.SUPABASE_URL ? '已设置' : '未设置',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '已设置' : '未设置',
      vercelRegion: process.env.VERCEL_REGION || 'local'
    });
    
    const { email, password, remember_me = false } = req.body;

    // 验证必填字段
    if (!email || !password) {
      requestLogger.warn('登录失败: 缺少必填字段');
      vercelLogger.auth('login_failed', undefined, false, { reason: 'missing_credentials' });
      return res.status(400).json({
        success: false,
        message: '邮箱和密码为必填字段',
        loginId
      });
    }

    requestLogger.info(`尝试登录用户: ${email}`);

    // 数据库连接测试
    requestLogger.info('测试数据库连接');
    const dbTestStart = Date.now();
    
    try {
      // 先进行简单的连接测试
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      const dbTestTime = Date.now() - dbTestStart;
      
      if (testError) {
        requestLogger.error(`数据库连接测试失败 (${dbTestTime}ms)`, {
          error: testError.message,
          code: testError.code,
          details: testError.details,
          hint: testError.hint
        });
        
        return res.status(503).json({
          success: false,
          message: '数据库连接失败，请稍后重试',
          error: {
            type: 'DATABASE_CONNECTION_ERROR',
            message: testError.message,
            code: testError.code
          },
          loginId,
          timing: {
            dbTestTime: `${dbTestTime}ms`
          }
        });
      }
      
      requestLogger.performance('db_connection_test', dbTestTime);
      requestLogger.database('connection_test', 'users', dbTestTime);
    } catch (dbError) {
      const dbTestTime = Date.now() - dbTestStart;
      requestLogger.error(`数据库连接异常 (${dbTestTime}ms)`, dbError);
      vercelLogger.auth('login_failed', undefined, false, { reason: 'db_connection_failed', error: dbError });
      
      return res.status(503).json({
        success: false,
        message: '数据库服务不可用',
        error: {
          type: 'DATABASE_SERVICE_ERROR',
          message: dbError instanceof Error ? dbError.message : '未知数据库错误'
        },
        loginId,
        timing: {
          dbTestTime: `${dbTestTime}ms`
        }
      });
    }

    // 查询用户
    requestLogger.info('查询用户信息');
    const userQueryStart = Date.now();
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, name, organization, created_at')
      .eq('email', email)
      .single();

    const userQueryTime = Date.now() - userQueryStart;
    requestLogger.performance('user_query', userQueryTime);
    requestLogger.database('user_query', 'users', userQueryTime);

    if (userError) {
      if (userError.code === 'PGRST116') {
        requestLogger.warn(`用户不存在: ${email}`);
        vercelLogger.auth('login_failed', undefined, false, { reason: 'user_not_found', email });
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
          loginId
        });
      }
      
      requestLogger.error('用户查询失败', {
        error: userError.message,
        code: userError.code,
        email
      });
      vercelLogger.auth('login_failed', undefined, false, { reason: 'user_query_failed', error: userError });
      
      return res.status(500).json({
        success: false,
        message: '登录失败，请稍后重试',
        error: {
          type: 'USER_QUERY_ERROR',
          message: userError.message,
          code: userError.code
        },
        loginId
      });
    }

    if (!user) {
      requestLogger.warn(`用户不存在: ${email}`);
      vercelLogger.auth('login_failed', undefined, false, { reason: 'user_not_found', email });
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
        loginId
      });
    }

    requestLogger.info(`找到用户: ${user.email} (ID: ${user.id})`);

    // 验证密码
    requestLogger.info('验证密码');
    const passwordVerifyStart = Date.now();
    
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    const passwordVerifyTime = Date.now() - passwordVerifyStart;
    requestLogger.performance('password_verify', passwordVerifyTime);

    if (!isPasswordValid) {
      requestLogger.warn(`密码验证失败: ${email}`);
      vercelLogger.auth('login_failed', user.id, false, { reason: 'invalid_password' });
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
        loginId
      });
    }

    requestLogger.info('密码验证成功');

    // 生成JWT token
    requestLogger.info('生成JWT token');
    const tokenGenerateStart = Date.now();
    
    const tokenPayload = {
      user_id: user.id,
      email: user.email,
      name: user.name
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'exam-system',
      audience: 'exam-users'
    });

    const refreshTokenExpiry = remember_me ? REFRESH_TOKEN_EXPIRES_IN : JWT_EXPIRES_IN;
    const refreshToken = jwt.sign(
      { user_id: user.id, type: 'refresh' },
      JWT_SECRET,
      {
        expiresIn: refreshTokenExpiry,
        issuer: 'exam-system',
        audience: 'exam-users'
      }
    );

    const tokenGenerateTime = Date.now() - tokenGenerateStart;
    requestLogger.performance('token_generate', tokenGenerateTime);

    // 更新用户最后登录时间
    requestLogger.info('更新最后登录时间');
    const updateLoginStart = Date.now();
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    const updateLoginTime = Date.now() - updateLoginStart;
    requestLogger.performance('update_login_time', updateLoginTime);
    requestLogger.database('update_login_time', 'users', updateLoginTime);

    if (updateError) {
      requestLogger.warn('更新最后登录时间失败', updateError);
    }

    const totalTime = Date.now() - startTime;
    requestLogger.performance('total_login_time', totalTime);
    requestLogger.info(`登录成功 (总耗时: ${totalTime}ms)`);
    vercelLogger.auth('login_success', user.id, true, { totalTime });

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: '登录成功',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: JWT_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization: user.organization
      },
      loginId,
      timing: {
        totalTime: `${totalTime}ms`,
        dbTestTime: `${Date.now() - dbTestStart}ms`,
        userQueryTime: `${userQueryTime}ms`,
        passwordVerifyTime: `${passwordVerifyTime}ms`,
        tokenGenerateTime: `${tokenGenerateTime}ms`,
        updateLoginTime: `${updateLoginTime}ms`
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    requestLogger.error(`登录过程中发生错误 (${totalTime}ms)`, error);
    vercelLogger.auth('login_failed', undefined, false, { reason: 'server_error', error, totalTime });
    
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : '未知错误'
      },
      loginId,
      timing: {
        totalTime: `${totalTime}ms`
      }
    });
  }
}