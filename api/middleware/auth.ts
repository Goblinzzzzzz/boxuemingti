/**
 * 认证和权限控制中间件
 * 用于验证JWT token和用户权限
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseClient';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        name: string;
        roles: string[];
        permissions?: string[];
      };
    }
  }
}

/**
 * JWT认证中间件
 * 验证请求头中的JWT token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    
    // 验证JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      name: string;
      roles: string[];
    };

    // 验证用户是否仍然存在
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      });
      return;
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      roles: decoded.roles
    };

    next();
  } catch (error) {
    console.error('Token验证失败:', error);
    res.status(401).json({
      success: false,
      message: '无效的认证令牌'
    });
  }
};

/**
 * 可选认证中间件
 * 如果有token则验证，没有则继续
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 没有token，继续执行
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        name: string;
        roles: string[];
      };

      // 验证用户是否仍然存在
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', decoded.userId)
        .single();

      if (!error && user) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          roles: decoded.roles
        };
      }
    } catch (tokenError) {
      // Token无效，但不阻止请求继续
      console.warn('可选认证中token无效:', tokenError);
    }

    next();
  } catch (error) {
    console.error('可选认证中间件错误:', error);
    next(); // 即使出错也继续执行
  }
};

/**
 * 角色权限检查中间件工厂
 * 检查用户是否具有指定角色
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '需要登录'
      });
      return;
    }

    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    const userRoles = req.user.roles || [];

    // 检查用户是否具有任一所需角色
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        success: false,
        message: '权限不足'
      });
      return;
    }

    next();
  };
};

/**
 * 权限检查中间件工厂
 * 检查用户是否具有指定权限
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '需要登录'
        });
        return;
      }

      // 获取用户权限
      const { data: hasPermission, error } = await supabase
        .rpc('check_user_permission', {
          user_uuid: req.user.userId,
          permission_name: permission
        });

      if (error) {
        console.error('权限检查失败:', error);
        res.status(500).json({
          success: false,
          message: '权限检查失败'
        });
        return;
      }

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `缺少权限: ${permission}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('权限检查中间件错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
};

/**
 * 管理员权限检查中间件
 */
export const requireAdmin = requireRole('admin');

/**
 * 审核员权限检查中间件
 */
export const requireReviewer = requireRole(['admin', 'reviewer']);

/**
 * 资源所有者检查中间件工厂
 * 检查用户是否是资源的创建者
 */
export const requireOwnership = (resourceTable: string, resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: '需要登录'
        });
        return;
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        res.status(400).json({
          success: false,
          message: '缺少资源ID'
        });
        return;
      }

      // 检查资源是否属于当前用户
      const { data: resource, error } = await supabase
        .from(resourceTable)
        .select('created_by')
        .eq('id', resourceId)
        .single();

      if (error) {
        console.error('资源查询失败:', error);
        res.status(500).json({
          success: false,
          message: '资源查询失败'
        });
        return;
      }

      if (!resource) {
        res.status(404).json({
          success: false,
          message: '资源不存在'
        });
        return;
      }

      // 检查是否是资源所有者或管理员
      const isOwner = resource.created_by === req.user.userId;
      const isAdmin = req.user.roles.includes('admin');

      if (!isOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          message: '只能操作自己创建的资源'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('所有权检查中间件错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  };
};

/**
 * 获取用户权限的辅助函数
 */
export const getUserPermissions = async (userId: string): Promise<string[]> => {
  try {
    // 直接查询用户角色和权限，避免RPC调用
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name,
          role_permissions (
            permissions (
              name
            )
          )
        )
      `)
      .eq('user_id', userId);

    if (rolesError) {
      console.error('获取用户角色失败:', rolesError);
      return [];
    }

    // 提取所有权限
    const permissions = new Set<string>();
    
    if (userRoles) {
      userRoles.forEach((userRole: any) => {
        if (userRole.roles?.role_permissions) {
          userRole.roles.role_permissions.forEach((rp: any) => {
            if (rp.permissions?.name) {
              permissions.add(rp.permissions.name);
            }
          });
        }
      });
    }

    return Array.from(permissions);
  } catch (error) {
    console.error('获取权限过程中发生错误:', error);
    return [];
  }
};

/**
 * 检查用户权限的辅助函数
 */
export const checkUserPermission = async (userId: string, permission: string): Promise<boolean> => {
  try {
    const { data: hasPermission, error } = await supabase
      .rpc('check_user_permission', {
        user_uuid: userId,
        permission_name: permission
      });

    if (error) {
      console.error('权限检查失败:', error);
      return false;
    }

    return hasPermission || false;
  } catch (error) {
    console.error('权限检查过程中发生错误:', error);
    return false;
  }
};