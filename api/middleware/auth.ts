import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseClient';

// 扩展Request接口以包含用户信息
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

/**
 * 身份验证中间件
 * 验证自定义JWT token并提取用户信息
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 从Authorization header获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '未提供认证token'
      });
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

    // 获取JWT密钥
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

    // 验证自定义JWT token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      console.error('JWT验证失败:', jwtError.message);
      return res.status(401).json({
        success: false,
        error: '无效的认证token'
      });
    }

    // 验证token payload结构
    if (!decoded.userId || !decoded.email) {
      return res.status(401).json({
        success: false,
        error: 'Token格式无效'
      });
    }

    // 可选：验证用户是否仍然存在且状态正常
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, status')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      console.error('用户验证失败:', userError?.message);
      return res.status(401).json({
        success: false,
        error: '用户不存在'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: '用户账户已被禁用'
      });
    }

    // 将用户信息添加到请求对象
    (req as AuthenticatedRequest).user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.roles?.[0] || 'user' // 取第一个角色作为主要角色
    };

    next();
  } catch (error) {
    console.error('身份验证错误:', error);
    return res.status(500).json({
      success: false,
      error: '身份验证服务错误'
    });
  }
};

/**
 * 可选的身份验证中间件
 * 如果有token则验证，没有token则继续（用于公开接口）
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        if (decoded.userId && decoded.email) {
          (req as AuthenticatedRequest).user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.roles?.[0] || 'user'
          };
        }
      } catch (jwtError) {
        // 忽略JWT验证错误，继续执行
        console.log('可选认证JWT验证失败，继续执行:', jwtError);
      }
    }
    
    next();
  } catch (error) {
    console.error('可选身份验证错误:', error);
    next(); // 继续执行，不阻断请求
  }
};

/**
 * 管理员权限验证中间件
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '需要管理员权限'
    });
  }
  
  next();
};

/**
 * 审核员权限验证中间件
 */
export const requireReviewer = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user || (user.role !== 'reviewer' && user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      error: '需要审核员权限'
    });
  }
  
  next();
};