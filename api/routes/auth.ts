/**
 * User authentication API routes
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseClient';
// 移除有问题的vercel-logger依赖

const router = Router();

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

// 密码加密轮数
const SALT_ROUNDS = 12;

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, organization } = req.body;

    // 验证必填字段
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        message: '邮箱、密码和姓名为必填字段'
      });
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
      return;
    }

    // 验证密码强度
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: '密码长度至少为6位'
      });
      return;
    }

    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: '该邮箱已被注册'
      });
      return;
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建用户
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        organization: organization || null
      })
      .select('id, email, name, organization, created_at')
      .single();

    if (error) {
      console.error('用户注册失败:', error);
      res.status(500).json({
        success: false,
        message: '注册失败，请稍后重试'
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: '注册成功',
      user_id: newUser.id
    });
  } catch (error) {
    console.error('注册过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  // const requestLogger = vercelLogger.createRequestLogger(req);
  const loginId = Math.random().toString(36).substr(2, 9);
  
  try {
    console.log('登录请求开始');
    console.log('login_attempt:', { email: req.body.email });
    
    console.log('环境检查', {
      nodeEnv: process.env.NODE_ENV,
      jwtSecret: process.env.JWT_SECRET ? '已设置' : '未设置',
      supabaseUrl: process.env.SUPABASE_URL ? '已设置' : '未设置',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '已设置' : '未设置',
      vercelRegion: process.env.VERCEL_REGION || 'local'
    });
    
    const { email, password, remember_me = false } = req.body;

    // 验证必填字段
    if (!email || !password) {
      console.warn('登录失败: 缺少必填字段');
      console.log('login_failed:', { reason: 'missing_credentials' });
      res.status(400).json({
        success: false,
        message: '邮箱和密码为必填字段',
        loginId
      });
      return;
    }

    console.log(`尝试登录用户: ${email}`);

    // 数据库连接测试
    console.log('测试数据库连接');
    const dbTestStart = Date.now();
    
    try {
      // 先进行简单的连接测试
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      const dbTestTime = Date.now() - dbTestStart;
      
      if (testError) {
        console.error(`数据库连接测试失败 (${dbTestTime}ms)`, {
          error: testError.message,
          code: testError.code,
          details: testError.details,
          hint: testError.hint
        });
        
        res.status(503).json({
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
        return;
      }
      
      console.log(`数据库连接测试成功 (${dbTestTime}ms)`);
    } catch (dbError) {
      const dbTestTime = Date.now() - dbTestStart;
      console.error(`数据库连接异常 (${dbTestTime}ms)`, dbError);
      console.error('login_failed:', { reason: 'db_connection_failed', error: dbError });
      
      res.status(503).json({
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
      return;
    }

    // 查找用户
    console.log('查询用户信息');
    const userQueryStart = Date.now();
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, name, organization, status')
      .eq('email', email)
      .single();

    const userQueryTime = Date.now() - userQueryStart;

    if (userError) {
      console.error(`数据库查询用户失败 (${userQueryTime}ms)`, {
        error: userError.message,
        code: userError.code,
        details: userError.details,
        hint: userError.hint
      });
      
      // 根据错误类型返回不同的响应
      if (userError.code === 'PGRST116') {
        // 用户不存在
        console.warn(`用户不存在: ${email}`);
        console.log('login_failed:', { reason: 'user_not_found', email });
        res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
          loginId
        });
      } else {
        // 其他数据库错误
        res.status(500).json({
          success: false,
          message: '数据库查询失败',
          error: {
            type: 'DATABASE_QUERY_ERROR',
            message: userError.message,
            code: userError.code
          },
          loginId,
          timing: {
            userQueryTime: `${userQueryTime}ms`
          }
        });
      }
      return;
    }
    
    console.log(`用户查询成功 (${userQueryTime}ms)`);

    if (!user) {
      console.warn(`用户不存在: ${email}`);
      console.log('login_failed:', { reason: 'user_not_found', email });
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误',
        loginId
      });
      return;
    }

    // 验证密码
    console.log('验证用户密码');
    const passwordStart = Date.now();
    
    try {
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      const passwordTime = Date.now() - passwordStart;
      
      if (!isPasswordValid) {
        console.warn(`密码验证失败: ${email} (${passwordTime}ms)`);
        console.log('login_failed:', { reason: 'invalid_password', userId: user.id });
        res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
          loginId
        });
        return;
      }
      
      console.log(`密码验证成功 (${passwordTime}ms)`);
    } catch (passwordError) {
      const passwordTime = Date.now() - passwordStart;
      console.error(`密码验证异常 (${passwordTime}ms)`, passwordError);
      console.error('login_failed:', { reason: 'password_verification_error', error: passwordError, userId: user.id });
      
      res.status(500).json({
        success: false,
        message: '密码验证失败',
        error: {
          type: 'PASSWORD_VERIFICATION_ERROR',
          message: passwordError instanceof Error ? passwordError.message : '密码验证异常'
        },
        loginId,
        timing: {
          passwordTime: `${passwordTime}ms`
        }
      });
      return;
    }

    // 检查用户状态
    console.log(`检查用户状态: ${user.status}`);
    if (user.status !== 'active') {
      let message = '账户状态异常，无法登录';
      
      switch (user.status) {
        case 'suspended':
          message = '账户已被暂停，请联系管理员';
          break;
        case 'pending':
          message = '账户待审核，请等待管理员审核通过';
          break;
        case 'inactive':
          message = '账户已停用，请联系管理员激活';
          break;
        default:
          message = '账户状态异常，无法登录';
      }
      
      console.warn(`用户状态检查失败: ${user.status} - ${message}`);
      console.log('login_failed:', { reason: 'account_status', status: user.status, userId: user.id });
      res.status(403).json({
        success: false,
        message,
        status: user.status,
        loginId
      });
      return;
    }

    // 获取用户角色和权限
    console.log('获取用户角色和权限');
    const roleStart = Date.now();
    
    let roles = ['user']; // 默认角色
    let permissions: string[] = [];
    
    try {
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select(`
          roles (
            name,
            description
          )
        `)
        .eq('user_id', user.id);

      const roleTime = Date.now() - roleStart;

      if (roleError) {
        console.error(`获取用户角色失败 (${roleTime}ms)`, {
          error: roleError.message,
          code: roleError.code,
          details: roleError.details
        });
        console.log('使用默认角色: user');
      } else {
        roles = userRoles?.map((ur: any) => ur.roles.name) || ['user'];
        console.log(`用户角色获取成功 (${roleTime}ms): ${roles.join(', ')}`);
      }
      
      // 获取用户权限
      const { data: userPermissions, error: permError } = await supabase
        .rpc('get_user_permissions', { user_uuid: user.id });
      
      if (!permError && userPermissions) {
        permissions = userPermissions;
        console.log(`用户权限获取成功: ${permissions.length} 个权限`);
      } else {
        console.error('获取用户权限失败:', permError?.message);
      }
    } catch (roleException) {
      const roleTime = Date.now() - roleStart;
      console.error(`获取用户角色权限异常 (${roleTime}ms)`, roleException);
      console.log('使用默认角色: user');
    }

    // 生成JWT token
    console.log('生成JWT token');
    const tokenStart = Date.now();
    let generatedTokens: { accessToken: string; refreshToken: string };
    
    try {
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions
      };

      if (!JWT_SECRET) {
        console.error('JWT_SECRET 环境变量未设置');
        console.error('login_failed:', { reason: 'jwt_config_error', userId: user.id });
        res.status(500).json({
          success: false,
          message: '服务器配置错误',
          error: {
            type: 'JWT_CONFIG_ERROR',
            message: 'JWT_SECRET 环境变量未设置'
          },
          loginId
        });
        return;
      }

      const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
      });

      const refreshToken = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: remember_me ? REFRESH_TOKEN_EXPIRES_IN : '7d' }
      );
      
      const tokenTime = Date.now() - tokenStart;
      console.log(`JWT token 生成成功 (${tokenTime}ms)`);
      
      // 存储生成的token以便后续使用
      generatedTokens = { accessToken, refreshToken };
    } catch (tokenError) {
      const tokenTime = Date.now() - tokenStart;
      console.error(`JWT token 生成失败 (${tokenTime}ms)`, tokenError);
      console.error('login_failed:', { reason: 'jwt_generation_error', error: tokenError, userId: user.id });
      
      res.status(500).json({
        success: false,
        message: 'Token生成失败',
        error: {
          type: 'JWT_GENERATION_ERROR',
          message: tokenError instanceof Error ? tokenError.message : 'Token生成异常'
        },
        loginId,
        timing: {
          tokenTime: `${tokenTime}ms`
        }
      });
      return;
    }

    // 更新最后登录时间
    console.log('更新最后登录时间');
    const updateStart = Date.now();
    
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);

      const updateTime = Date.now() - updateStart;

      if (updateError) {
        console.error(`更新最后登录时间失败 (${updateTime}ms)`, {
          error: updateError.message,
          code: updateError.code
        });
        // 继续执行，不影响登录流程
      } else {
        console.log(`最后登录时间更新成功 (${updateTime}ms)`);
      }
    } catch (updateException) {
      const updateTime = Date.now() - updateStart;
      console.error(`更新最后登录时间异常 (${updateTime}ms)`, updateException);
      // 继续执行，不影响登录流程
    }

    const duration = Date.now() - startTime;
    console.log(`登录成功，总用时: ${duration}ms`);
    console.log('login_success:', { email: user.email, roles, userId: user.id });

    res.json({
      success: true,
      access_token: generatedTokens.accessToken,
      refresh_token: generatedTokens.refreshToken,
      expires_in: 24 * 60 * 60, // 24小时（秒）
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization: user.organization,
        roles,
        permissions
      },
      loginId,
      timing: {
        totalTime: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`登录过程中发生未捕获错误 (用时: ${duration}ms)`, {
      error: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      nodeEnv: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION || 'local',
      timestamp: new Date().toISOString()
    });
    console.error('login_failed:', { reason: 'uncaught_error', error });
    
    // 根据错误类型返回不同的状态码
    let statusCode = 500;
    let errorType = 'INTERNAL_ERROR';
    let errorMessage = '服务器内部错误';
    
    if (error instanceof Error) {
      if (error.message.includes('JWT')) {
        statusCode = 500;
        errorType = 'JWT_ERROR';
        errorMessage = 'Token处理错误';
      } else if (error.message.includes('database') || error.message.includes('Supabase')) {
        statusCode = 503;
        errorType = 'DATABASE_ERROR';
        errorMessage = '数据库服务不可用';
      } else if (error.message.includes('timeout')) {
        statusCode = 408;
        errorType = 'TIMEOUT_ERROR';
        errorMessage = '请求超时';
      } else if (error.message.includes('network')) {
        statusCode = 503;
        errorType = 'NETWORK_ERROR';
        errorMessage = '网络连接错误';
      }
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: {
        type: errorType,
        message: process.env.NODE_ENV === 'production' ? errorMessage : (error instanceof Error ? error.message : '未知错误')
      },
      loginId,
      timing: {
        totalTime: `${duration}ms`,
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
 * 刷新Token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        success: false,
        message: '缺少刷新令牌'
      });
      return;
    }

    // 验证刷新令牌
    const decoded = jwt.verify(refresh_token, JWT_SECRET) as { userId: string };

    // 获取用户信息
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, organization')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
      return;
    }

    // 获取用户角色
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('user_id', user.id);

    const roles = userRoles?.map((ur: any) => ur.roles.name) || ['user'];

    // 生成新的访问令牌
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        roles
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      access_token: newAccessToken,
      expires_in: 24 * 60 * 60
    });
  } catch (error) {
    console.error('刷新令牌失败:', error);
    res.status(401).json({
      success: false,
      message: '无效的刷新令牌'
    });
  }
});

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    // 在实际应用中，这里可以将token加入黑名单
    // 目前只是返回成功响应
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取用户信息
 * GET /api/auth/profile
 */
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: '缺少认证令牌'
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      name: string;
      roles: string[];
    };

    // 获取最新的用户信息
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, organization, avatar_url, created_at, last_login_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization: user.organization,
        avatar_url: user.avatar_url,
        roles: decoded.roles,
        created_at: user.created_at,
        last_login_at: user.last_login_at
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(401).json({
      success: false,
      message: '无效的认证令牌'
    });
  }
});

/**
 * 获取用户权限
 * GET /api/auth/permissions
 */
router.get('/permissions', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: '缺少认证令牌'
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // 获取用户权限
    const { data: permissions, error } = await supabase
      .rpc('get_user_permissions', { user_uuid: decoded.userId });

    if (error) {
      console.error('获取用户权限失败:', error);
      res.status(500).json({
        success: false,
        message: '获取权限失败'
      });
      return;
    }

    res.json({
      success: true,
      permissions: permissions || []
    });
  } catch (error) {
    console.error('获取权限过程中发生错误:', error);
    res.status(401).json({
      success: false,
      message: '无效的认证令牌'
    });
  }
});

export default router;