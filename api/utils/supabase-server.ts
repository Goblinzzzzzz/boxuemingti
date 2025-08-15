import { createClient } from '@supabase/supabase-js';

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('缺少Supabase环境变量配置');
}

// 创建服务端Supabase客户端（使用service role key）
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 创建用户上下文的Supabase客户端
export const createUserSupabaseClient = (userToken: string) => {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// 数据库操作的通用错误处理
export const handleDatabaseError = (error: any) => {
  console.error('数据库操作错误:', error);
  
  if (error.code === 'PGRST116') {
    return { success: false, error: '没有找到相关数据' };
  }
  
  if (error.code === 'PGRST301') {
    return { success: false, error: '权限不足' };
  }
  
  if (error.message?.includes('duplicate key')) {
    return { success: false, error: '数据已存在' };
  }
  
  return { success: false, error: '数据库操作失败' };
};

// API响应格式接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 成功响应辅助函数
export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message
});

// 错误响应辅助函数
export const errorResponse = (error: string): ApiResponse => ({
  success: false,
  error
});