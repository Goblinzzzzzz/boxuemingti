/**
 * Supabase客户端配置
 * 用于后端API与Supabase数据库的连接
 * 集成 Vercel 优化功能
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// 移除有问题的vercel-optimization依赖

// 加载环境变量
dotenv.config();

// 创建 Supabase 客户端的函数
function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    const error = new Error('缺少Supabase配置：SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量是必需的');
    console.error('Supabase客户端初始化失败:', error);
    throw error;
  }

  console.log('🔗 创建 Supabase 客户端...');

  try {
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      // Vercel 优化配置
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      // 连接池配置
      db: {
        schema: 'public'
      }
    });

    console.log('✅ Supabase 客户端创建成功');
    return client;
  } catch (error) {
    console.error('Supabase客户端创建失败:', error);
    throw error;
  }
}

// 导出 Supabase 客户端
export const supabase = createSupabaseClient();

// 导出类型定义
// Database type will be defined based on actual schema

// 导出连接测试函数
export async function testSupabaseConnection() {
  const testId = Date.now().toString(36);
  console.log(`[SUPABASE-TEST-${testId}] 开始连接测试...`);
  
  try {
    const startTime = Date.now();
    
    // 简单的连接测试
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.error(`[SUPABASE-TEST-${testId}] 连接测试失败 (${duration}ms):`, {
        error: error.message,
        code: error.code,
        details: error.details
      });
      return { success: false, error, duration };
    }
    
    console.log(`[SUPABASE-TEST-${testId}] 连接测试成功 (${duration}ms)`);
    return { success: true, data, duration };
  } catch (error) {
    console.error(`[SUPABASE-TEST-${testId}] 连接测试异常:`, error);
    return { success: false, error, duration: 0 };
  }
}