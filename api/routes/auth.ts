/**
 * 用户认证API路由
 * 处理用户登录、注册、登出等认证相关功能
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseClient.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const requestId = Date.now().toString(36);
  console.log(`[LOGIN-${requestId}] 开始登录请求:`, { email: req.body.email });
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log(`[LOGIN-${requestId}] 参数验证失败: 邮箱或密码为空`);
      res.status(400).json({ error: '邮箱和密码不能为空' });
      return;
    }

    // 查询用户
    console.log(`[LOGIN-${requestId}] 查询用户:`, { email: email.toLowerCase() });
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      console.log(`[LOGIN-${requestId}] 用户查询失败:`, { userError, userFound: !!user });
      res.status(401).json({ error: '邮箱或密码错误' });
      return;
    }
    
    console.log(`[LOGIN-${requestId}] 用户查询成功:`, { userId: user.id, email: user.email });

    // 验证密码
    console.log(`[LOGIN-${requestId}] 验证密码...`);
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log(`[LOGIN-${requestId}] 密码验证失败`);
      res.status(401).json({ error: '邮箱或密码错误' });
      return;
    }
    
    console.log(`[LOGIN-${requestId}] 密码验证成功`);

    // 获取用户角色和权限
    console.log(`[LOGIN-${requestId}] 获取用户角色和权限...`);
    const { data: userRoles, error: rolesError } = await supabase
      .rpc('get_user_roles_and_permissions', { user_id: user.id });
      
    if (rolesError) {
      console.error(`[LOGIN-${requestId}] 获取角色权限失败:`, rolesError);
    } else {
      console.log(`[LOGIN-${requestId}] 角色权限查询成功:`, { rolesCount: userRoles?.length || 0 });
    }

    // 转换数据格式以匹配前端期望
    let role = 'user'; // 默认角色
    let permissions: string[] = [];
    
    if (userRoles && userRoles.length > 0) {
      // 如果有admin角色，优先使用admin
      const adminRole = userRoles.find((r: any) => r.role_name === 'admin');
      if (adminRole) {
        role = 'admin';
      } else {
        role = userRoles[0].role_name || 'user';
      }
      
      // 合并所有角色的权限
      permissions = userRoles.reduce((allPerms: string[], roleData: any) => {
        if (roleData.permissions && Array.isArray(roleData.permissions)) {
          return [...allPerms, ...roleData.permissions];
        }
        return allPerms;
      }, []);
      
      // 去重
      permissions = [...new Set(permissions)];
    }

    // 生成JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role,
        permissions
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 更新最后登录时间
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // 返回用户信息和token
    console.log(`[LOGIN-${requestId}] 登录成功:`, { 
      userId: user.id, 
      role, 
      permissionsCount: permissions.length 
    });
    
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization: user.organization,
        avatar_url: user.avatar_url,
        role,
        permissions
      }
    });
  } catch (error) {
    console.error(`[LOGIN-${requestId}] 登录异常:`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      env: {
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
    res.status(500).json({ 
      error: '登录失败，请稍后重试',
      requestId: requestId
    });
  }
});

/**
 * 用户注册（仅管理员可用）
 * POST /api/auth/register
 */
router.post('/register', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, organization } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: '邮箱、密码和姓名不能为空' });
      return;
    }

    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      res.status(409).json({ error: '该邮箱已被注册' });
      return;
    }

    // 加密密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        organization: organization || null
      })
      .select()
      .single();

    if (createError) {
      console.error('Create user error:', createError);
      res.status(500).json({ error: '创建用户失败' });
      return;
    }

    // 分配普通用户角色
    const { data: userRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (userRole) {
      await supabase
        .from('user_roles')
        .insert({
          user_id: newUser.id,
          role_id: userRole.id,
          assigned_by: req.user?.userId
        });
    }

    res.status(201).json({
      message: '用户创建成功',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        organization: newUser.organization
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // 在实际应用中，可以将token加入黑名单
    // 这里简单返回成功消息
    res.json({ message: '登出成功' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: '登出失败' });
  }
});

/**
 * 验证token
 * GET /api/auth/verify
 */
router.get('/verify', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    // 获取最新的用户信息和权限
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      res.status(401).json({ error: '用户不存在或已被禁用' });
      return;
    }

    // 获取用户角色和权限
    const { data: userRoles } = await supabase
      .rpc('get_user_roles_and_permissions', { user_id: user.id });

    // 转换数据格式以匹配前端期望
    let role = 'user'; // 默认角色
    let permissions: string[] = [];
    
    if (userRoles && userRoles.length > 0) {
      // 如果有admin角色，优先使用admin
      const adminRole = userRoles.find((r: any) => r.role_name === 'admin');
      if (adminRole) {
        role = 'admin';
      } else {
        role = userRoles[0].role_name || 'user';
      }
      
      // 合并所有角色的权限
      permissions = userRoles.reduce((allPerms: string[], roleData: any) => {
        if (roleData.permissions && Array.isArray(roleData.permissions)) {
          return [...allPerms, ...roleData.permissions];
        }
        return allPerms;
      }, []);
      
      // 去重
      permissions = [...new Set(permissions)];
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization: user.organization,
        avatar_url: user.avatar_url,
        role,
        permissions
      }
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: '验证失败' });
  }
});

/**
 * 检查用户权限
 * POST /api/auth/check-permission
 */
router.post('/check-permission', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { permission } = req.body;
    const userId = req.user?.userId;

    if (!permission) {
      res.status(400).json({ error: '权限名称不能为空' });
      return;
    }

    // 手动查询用户权限数据（替代不存在的get_user_roles_and_permissions函数）
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles!inner(
          id,
          name
        )
      `)
      .eq('user_id', userId);

    let hasPermission = false;
    
    if (userRoles && userRoles.length > 0) {
      const roleIds = userRoles.map((ur: any) => ur.role_id);
      
      // 查询角色权限
      const { data: rolePermissions } = await supabase
        .from('role_permissions')
        .select(`
          permissions!inner(
            name
          )
        `)
        .in('role_id', roleIds);
      
      // 检查是否有指定权限
      hasPermission = rolePermissions?.some((rp: any) => 
        rp.permissions.name === permission
      ) || false;
    }

    console.log('权限检查调试信息:');
    console.log('用户ID:', userId);
    console.log('查询权限:', permission);
    console.log('用户角色:', userRoles?.map((ur: any) => ur.roles.name));
    console.log('权限检查结果:', hasPermission);

    res.json({
      hasPermission,
      permission
    });
  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({ error: '权限检查失败' });
  }
});

export default router;