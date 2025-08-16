/**
 * Vercel Serverless Function for User Login
 * POST /api/login
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from './services/supabaseClient.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  const loginId = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log('登录请求开始', { loginId, email: req.body.email });
    
    console.log('环境检查', {
      loginId,
      nodeEnv: process.env.NODE_ENV,
      jwtSecret: process.env.JWT_SECRET ? '已设置' : '未设置',
      supabaseUrl: process.env.SUPABASE_URL ? '已设置' : '未设置',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '已设置' : '未设置',
      vercelRegion: process.env.VERCEL_REGION || 'local'
    });
    
    const { email, password, remember_me = false } = req.body;

    // 验证必填字段
    if (!email || !password) {
      console.log('登录失败: 缺少必填字段', { loginId });
      return res.status(400).json({
        success: false,
        message: '邮箱和密码为必填字段',
        loginId
      });
    }

    console.log(`尝试登录用户: ${email}`, { loginId });

    // 数据库连接测试
    console.log('测试数据库连接', { loginId });
    let dbTestTime = 0;
    
    try {
      const dbTestStart = Date.now();
      // 先进行简单的连接测试
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      dbTestTime = Date.now() - dbTestStart;
      
      if (testError) {
        console.error(`数据库连接测试失败 (${dbTestTime}ms)`, {
          loginId,
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
      
      console.log(`数据库连接测试成功 (${dbTestTime}ms)`, { loginId });
    } catch (dbError) {
      console.error(`数据库连接异常 (${dbTestTime}ms)`, { loginId, error: dbError });
      
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
    console.log('查询用户信息', { loginId });
    const userQueryStart = Date.now();
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, name, organization, created_at')
      .eq('email', email)
      .single();

    const userQueryTime = Date.now() - userQueryStart;
    console.log(`用户查询完成 (${userQueryTime}ms)`, { loginId });

    if (userError) {
      if (userError.code === 'PGRST116') {
        console.log(`用户不存在: ${email}`, { loginId });
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
          loginId
        });
      }
      
      console.error('用户查询失败', {
        loginId,
        error: userError.message,
        code: userError.code,
        email
      });
      
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
      console.log(`用户不存在: ${email}`, { loginId });
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
        loginId
      });
    }

    console.log(`找到用户: ${user.email} (ID: ${user.id})`, { loginId });

    // 验证密码
    console.log('验证密码', { loginId });
    const passwordVerifyStart = Date.now();
    
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    const passwordVerifyTime = Date.now() - passwordVerifyStart;
    console.log(`密码验证完成 (${passwordVerifyTime}ms)`, { loginId });

    if (!isPasswordValid) {
      console.log(`密码验证失败: ${email}`, { loginId });
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
        loginId
      });
    }

    console.log('密码验证成功', { loginId });

    // 生成JWT token
    console.log('生成JWT token', { loginId });
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

    const refreshToken = jwt.sign(
      { user_id: user.id, type: 'refresh' },
      JWT_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'exam-system',
        audience: 'exam-users'
      }
    );

    const tokenGenerateTime = Date.now() - tokenGenerateStart;
    console.log(`JWT token生成完成 (${tokenGenerateTime}ms)`, { loginId });

    const totalTime = Date.now() - startTime;
    
    console.log('登录成功', {
      loginId,
      userId: user.id,
      email: user.email,
      totalTime: `${totalTime}ms`,
      timing: {
        dbTestTime: `${dbTestTime}ms`,
        userQueryTime: `${userQueryTime}ms`,
        passwordVerifyTime: `${passwordVerifyTime}ms`,
        tokenGenerateTime: `${tokenGenerateTime}ms`
      }
    });

    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 86400, // 24小时，单位秒
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          organization: user.organization,
          created_at: user.created_at
        }
      },
      loginId,
      timing: {
        totalTime: `${totalTime}ms`,
        dbTestTime: `${dbTestTime}ms`,
        userQueryTime: `${userQueryTime}ms`,
        passwordVerifyTime: `${passwordVerifyTime}ms`,
        tokenGenerateTime: `${tokenGenerateTime}ms`
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.error('登录过程发生异常', {
      loginId,
      error: error.message,
      stack: error.stack,
      totalTime: `${totalTime}ms`
    });

    return res.status(500).json({
      success: false,
      message: '服务器内部错误，请稍后重试',
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