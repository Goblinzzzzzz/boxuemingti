/**
 * 用户管理API路由
 * 处理用户信息管理、用户列表、角色分配等功能
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import { supabase } from '../services/supabaseClient';
import { 
  authenticateToken, 
  requireAdmin, 
  requirePermission,
  getUserPermissions 
} from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 12;

/**
 * 获取当前用户信息
 * GET /api/users/profile
 */
router.get('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // 获取用户详细信息
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, organization, avatar_url, email_verified, created_at, last_login_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    // 获取用户统计信息
    const { data: stats } = await supabase
      .rpc('get_user_statistics', { user_uuid: userId });

    // 获取用户权限（添加错误处理，确保权限获取失败不影响用户信息返回）
    let permissions: string[] = [];
    try {
      permissions = await getUserPermissions(userId);
    } catch (error) {
      console.error('获取用户权限失败，使用空权限列表:', error);
      permissions = [];
    }

    res.json({
      success: true,
      data: {
        ...user,
        roles: req.user!.roles,
        permissions,
        statistics: stats?.[0] || {
          total_materials: 0,
          total_questions: 0,
          approved_questions: 0,
          pending_questions: 0,
          rejected_questions: 0,
          total_generation_tasks: 0
        }
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 更新用户信息
 * PUT /api/users/profile
 */
router.put('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { name, organization, avatar_url } = req.body;

    // 验证必填字段
    if (!name) {
      res.status(400).json({
        success: false,
        message: '姓名为必填字段'
      });
      return;
    }

    // 更新用户信息
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        name,
        organization: organization || null,
        avatar_url: avatar_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, email, name, organization, avatar_url, updated_at')
      .single();

    if (error) {
      console.error('更新用户信息失败:', error);
      res.status(500).json({
        success: false,
        message: '更新失败，请稍后重试'
      });
      return;
    }

    res.json({
      success: true,
      message: '用户信息更新成功',
      user: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 修改密码
 * PUT /api/users/password
 */
router.put('/password', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { current_password, new_password } = req.body;

    // 验证必填字段
    if (!current_password || !new_password) {
      res.status(400).json({
        success: false,
        message: '当前密码和新密码为必填字段'
      });
      return;
    }

    // 验证新密码强度
    if (new_password.length < 6) {
      res.status(400).json({
        success: false,
        message: '新密码长度至少为6位'
      });
      return;
    }

    // 获取当前密码哈希
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
      return;
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(new_password, SALT_ROUNDS);

    // 更新密码
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('密码更新失败:', updateError);
      res.status(500).json({
        success: false,
        message: '密码更新失败，请稍后重试'
      });
      return;
    }

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取用户的教材列表
 * GET /api/users/materials
 */
router.get('/materials', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // 获取用户的教材列表
    const { data: materials, error } = await supabase
      .from('materials')
      .select('id, title, content, file_type, created_at, updated_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('获取教材列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取教材列表失败'
      });
      return;
    }

    // 获取总数
    const { count, error: countError } = await supabase
      .from('materials')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId);

    if (countError) {
      console.error('获取教材总数失败:', countError);
    }

    res.json({
      success: true,
      materials: materials || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('获取教材列表过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取用户的试题列表
 * GET /api/users/questions
 */
router.get('/questions', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('questions')
      .select('id, question_text, question_type, options, correct_answer, explanation, status, knowledge_points, difficulty_level, created_at')
      .eq('created_by', userId);

    // 如果指定了状态，添加状态过滤
    if (status) {
      query = query.eq('status', status);
    }

    const { data: questions, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('获取试题列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取试题列表失败'
      });
      return;
    }

    // 获取总数
    let countQuery = supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('获取试题总数失败:', countError);
    }

    res.json({
      success: true,
      questions: questions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('获取试题列表过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取用户的题库（已通过审核的试题）
 * GET /api/users/question-bank
 */
router.get('/question-bank', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // 获取已通过审核的试题
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, question_text, question_type, options, correct_answer, explanation, knowledge_points, difficulty_level, created_at')
      .eq('created_by', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('获取题库失败:', error);
      res.status(500).json({
        success: false,
        message: '获取题库失败'
      });
      return;
    }

    // 获取总数
    const { count, error: countError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('status', 'approved');

    if (countError) {
      console.error('获取题库总数失败:', countError);
    }

    res.json({
      success: true,
      questions: questions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('获取题库过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 管理员功能路由

/**
 * 获取所有用户列表（管理员）
 * GET /api/users/admin/list
 */
router.get('/admin/list', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select(`
        id, email, name, organization, email_verified, created_at, last_login_at,
        user_roles!user_roles_user_id_fkey (
          roles (
            name,
            description
          )
        )
      `);

    // 如果有搜索条件
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('获取用户列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户列表失败'
      });
      return;
    }

    // 获取总数
    let countQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('获取用户总数失败:', countError);
    }

    // 格式化用户数据
    const formattedUsers = users?.map(user => ({
      ...user,
      roles: user.user_roles?.map((ur: any) => ur.roles?.name) || []
    })) || [];

    res.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('获取用户列表过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 编辑用户信息（管理员）
 * PUT /api/users/admin/:userId
 */
router.put('/admin/:userId', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { name, email, organization } = req.body;
    const adminId = req.user!.userId;

    // 获取当前用户信息
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('id, name, email, organization')
      .eq('id', userId)
      .single();

    if (currentUserError || !currentUser) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    // 使用当前值作为默认值，如果请求中没有提供
    const updateData = {
      name: name || currentUser.name,
      email: email || currentUser.email,
      organization: organization !== undefined ? organization : currentUser.organization
    };

    // 验证必填字段
    if (!updateData.name || !updateData.email) {
      res.status(400).json({
        success: false,
        message: '姓名和邮箱为必填字段'
      });
      return;
    }

    // 检查邮箱是否已被其他用户使用
    if (updateData.email !== currentUser.email) {
      const { data: existingUser, error: emailError } = await supabase
        .from('users')
        .select('id')
        .eq('email', updateData.email)
        .neq('id', userId)
        .single();

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: '该邮箱已被其他用户使用'
        });
        return;
      }
    }

    // 更新用户信息
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        name: updateData.name,
        email: updateData.email,
        organization: updateData.organization || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, name, email, organization, status, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('更新用户信息失败:', updateError);
      res.status(500).json({
        success: false,
        message: '更新用户信息失败'
      });
      return;
    }

    res.json({
      success: true,
      message: `成功更新用户 ${updatedUser.name} 的信息`,
      user: updatedUser
    });
  } catch (error) {
    console.error('编辑用户信息过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 分配用户角色（管理员）
 * PUT /api/users/admin/:userId/role
 */
router.put('/admin/:userId/role', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role_name } = req.body;
    const adminId = req.user!.userId;

    if (!role_name) {
      res.status(400).json({
        success: false,
        message: '角色名称为必填字段'
      });
      return;
    }

    // 验证角色是否存在
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', role_name)
      .single();

    if (roleError || !role) {
      res.status(400).json({
        success: false,
        message: '角色不存在'
      });
      return;
    }

    // 验证用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    // 删除用户现有角色
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // 分配新角色
    const { error: assignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: role.id,
        assigned_by: adminId
      });

    if (assignError) {
      console.error('角色分配失败:', assignError);
      res.status(500).json({
        success: false,
        message: '角色分配失败'
      });
      return;
    }

    res.json({
      success: true,
      message: `成功为用户 ${user.name} 分配角色 ${role.name}`
    });
  } catch (error) {
    console.error('分配角色过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取所有角色列表（管理员）
 * GET /api/users/admin/roles
 */
router.get('/admin/roles', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: roles, error } = await supabase
      .from('roles')
      .select('id, name, description, is_system_role, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('获取角色列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取角色列表失败'
      });
      return;
    }

    res.json({
      success: true,
      roles: roles || []
    });
  } catch (error) {
    console.error('获取角色列表过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 切换用户状态（管理员）
 * PUT /api/users/admin/:userId/status
 */
router.put('/admin/:userId/status', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    const adminId = req.user!.userId;

    if (!status || !['active', 'suspended', 'inactive'].includes(status)) {
      res.status(400).json({
        success: false,
        message: '无效的用户状态'
      });
      return;
    }

    // 验证用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    // 更新用户状态
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('更新用户状态失败:', updateError);
      res.status(500).json({
        success: false,
        message: '更新用户状态失败'
      });
      return;
    }

    res.json({
      success: true,
      message: `成功将用户 ${user.name} 的状态更新为 ${status}`
    });
  } catch (error) {
    console.error('更新用户状态过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 删除用户（管理员）
 * DELETE /api/users/admin/:userId
 */
router.delete('/admin/:userId', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.userId;

    // 防止管理员删除自己
    if (userId === adminId) {
      res.status(400).json({
        success: false,
        message: '不能删除自己的账号'
      });
      return;
    }

    // 验证用户是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      res.status(404).json({
        success: false,
        message: '用户不存在'
      });
      return;
    }

    // 删除用户相关数据（级联删除）
    // 1. 删除用户角色关联
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // 2. 删除用户权限关联
    await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    // 3. 删除用户
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('删除用户失败:', deleteError);
      res.status(500).json({
        success: false,
        message: '删除用户失败'
      });
      return;
    }

    res.json({
      success: true,
      message: `成功删除用户 ${user.name}`
    });
  } catch (error) {
    console.error('删除用户过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 创建新用户（管理员）
 * POST /api/users/admin/create
 */
router.post('/admin/create', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, organization } = req.body;
    const adminId = req.user!.userId;

    // 验证必填字段
    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: '姓名、邮箱和密码为必填字段'
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
    const { data: existingUser, error: emailError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: '该邮箱已被注册'
      });
      return;
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建用户
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash: passwordHash,
        organization: organization || null,
        status: 'active',
        email_verified: false,
        created_at: new Date().toISOString()
      })
      .select('id, name, email, organization, status, created_at')
      .single();

    if (createError) {
      console.error('创建用户失败:', createError);
      res.status(500).json({
        success: false,
        message: '创建用户失败'
      });
      return;
    }

    // 为新用户分配默认角色（普通用户）
    const { data: defaultRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'user')
      .single();

    if (defaultRole) {
      await supabase
        .from('user_roles')
        .insert({
          user_id: newUser.id,
          role_id: defaultRole.id,
          assigned_by: adminId
        });
    }

    res.json({
      success: true,
      message: `成功创建用户 ${newUser.name}`,
      user: newUser
    });
  } catch (error) {
    console.error('创建用户过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 获取系统统计信息（管理员）
 * GET /api/users/admin/stats
 */
router.get('/admin/stats', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取用户统计
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // 获取题目统计
    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });

    // 获取教材统计
    const { count: totalMaterials } = await supabase
      .from('materials')
      .select('*', { count: 'exact', head: true });

    // 获取审核统计
    const { count: totalReviews } = await supabase
      .from('question_reviews')
      .select('*', { count: 'exact', head: true });

    const { count: pendingReviews } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalQuestions: totalQuestions || 0,
        totalMaterials: totalMaterials || 0,
        totalReviews: totalReviews || 0,
        pendingReviews: pendingReviews || 0,
        systemUptime: process.uptime(),
        databaseSize: '计算中...' // 这个需要特殊查询
      }
    });
  } catch (error) {
    console.error('获取系统统计信息过程中发生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;