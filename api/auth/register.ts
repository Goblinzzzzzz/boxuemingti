/**
 * Vercel Serverless Function for User Registration
 * POST /api/auth/register
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcrypt';
import { supabase } from '../services/supabaseClient.js';

// 密码加密轮数
const SALT_ROUNDS = 12;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed. Only POST requests are supported.'
    });
  }

  try {
    const { email, password, name, organization } = req.body;

    // 验证必填字段
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: '邮箱、密码和姓名为必填字段'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
    }

    // 验证密码强度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少为6位'
      });
    }

    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '该邮箱已被注册'
      });
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
      return res.status(500).json({
        success: false,
        message: '注册失败，请稍后重试'
      });
    }

    return res.status(201).json({
      success: true,
      message: '注册成功',
      user_id: newUser.id
    });
  } catch (error) {
    console.error('注册过程中发生错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}