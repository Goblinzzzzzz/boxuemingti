/**
 * User authentication API routes
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseClient.js';

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
  try {
    const { email, password, remember_me = false } = req.body;

    // 验证必填字段
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: '邮箱和密码为必填字段'
      });
      return;
    }

    // 查找用户
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, name, organization, status')
      .eq('email', email)
      .single();

    if (userError || !user) {
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
      return;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
      return;
    }

    // 检查用户状态
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
      
      res.status(403).json({
        success: false,
        message,
        status: user.status
      });
      return;
    }

    // 获取用户角色
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name,
          description
        )
      `)
      .eq('user_id', user.id);

    const roles = userRoles?.map((ur: any) => ur.roles.name) || ['user'];

    // 生成JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      roles
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: remember_me ? REFRESH_TOKEN_EXPIRES_IN : '7d' }
    );

    // 更新最后登录时间
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    res.json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 24 * 60 * 60, // 24小时（秒）
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization: user.organization,
        roles
      }
    });
  } catch (error) {
    console.error('登录过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
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