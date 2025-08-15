/**
 * Vercel Serverless Function for User Profile
 * GET /api/users/profile
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// 直接在文件中初始化Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 验证环境变量
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase环境变量缺失:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey
  });
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed. Only GET requests are supported.'
    });
  }

  // 检查环境变量
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase环境变量未配置');
    return res.status(500).json({
      success: false,
      message: '服务器配置错误'
    });
  }

  try {
    console.log('获取用户信息请求开始');
    
    // 获取Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('缺少Authorization header');
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    // 提取token
    const token = authHeader.substring(7);
    
    // 验证JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('JWT验证成功', { userId: decoded.user_id });
    } catch (jwtError) {
      console.error('JWT验证失败:', jwtError);
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌'
      });
    }

    const userId = decoded.user_id;
    if (!userId) {
      console.log('JWT中缺少user_id');
      return res.status(401).json({
        success: false,
        message: '无效的令牌格式'
      });
    }

    // 获取用户详细信息
    console.log('查询用户信息', { userId });
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, organization, avatar_url, email_verified, created_at, last_login_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('用户查询失败:', error);
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    console.log('用户信息查询成功', { userId: user.id, email: user.email });

    // 获取用户统计信息
    let stats = {
      total_materials: 0,
      total_questions: 0,
      approved_questions: 0,
      pending_questions: 0,
      rejected_questions: 0,
      total_generation_tasks: 0
    };
    
    try {
      const { data: userStats } = await supabase
        .rpc('get_user_statistics', { user_uuid: userId });
      
      if (userStats && userStats[0]) {
        stats = userStats[0];
      }
    } catch (statsError) {
      console.log('获取用户统计信息失败，使用默认值:', statsError);
    }

    // 获取用户角色和权限
    let roles: string[] = [];
    let permissions: string[] = [];
    
    try {
      // 获取用户角色
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          roles (
            name
          )
        `)
        .eq('user_id', userId);
      
      if (!rolesError && userRoles) {
        roles = userRoles.map((ur: any) => ur.roles?.name).filter(Boolean);
      }
      
      // 使用数据库函数获取用户权限
      const { data: userPermissions, error: permError } = await supabase
        .rpc('get_user_permissions', { user_uuid: userId });
      
      if (!permError && userPermissions) {
        permissions = userPermissions;
      }
    } catch (error) {
      console.error('获取用户角色权限失败:', error);
      // 使用备用逻辑
      roles = ['user']; // 默认角色
      permissions = [];
    }

    console.log('用户信息获取完成', { 
      userId: user.id, 
      roles: roles.length, 
      permissions: permissions.length 
    });

    return res.status(200).json({
      success: true,
      data: {
        ...user,
        roles,
        permissions,
        statistics: stats
      }
    });

  } catch (error) {
    console.error('获取用户信息过程中发生错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}