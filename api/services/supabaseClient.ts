/**
 * Supabase客户端配置
 * 用于后端API与Supabase数据库的连接
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('缺少Supabase配置：SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量是必需的');
}

// 创建Supabase客户端（使用服务角色密钥，用于后端操作）
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 导出类型定义
// Database type will be defined based on actual schema