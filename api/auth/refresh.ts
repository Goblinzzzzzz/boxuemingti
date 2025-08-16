import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { supabase } from '../services/supabaseClient';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: '只支持POST请求'
    });
  }

  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REFRESH_TOKEN',
        message: '缺少refresh_token'
      });
    }

    // 验证refresh token
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_SECRET!) as any;
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_REFRESH_TOKEN',
        message: 'refresh_token无效或已过期'
      });
    }

    // 从数据库获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, status')
      .eq('id', decoded.userId)
      .eq('status', 'active')
      .single();

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在或已被禁用'
      });
    }

    // 生成新的access token
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // 生成新的refresh token
    const newRefreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      data: {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('Token刷新错误:', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    });
  }
}