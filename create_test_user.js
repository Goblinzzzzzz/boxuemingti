import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createTestUser() {
  try {
    const testUserId = randomUUID();
    const testUser = {
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
      password_hash: 'test_hash_123', // 测试用的密码哈希
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([testUser]);
    
    if (error) {
      console.error('创建用户失败:', error);
    } else {
      console.log('测试用户创建成功:', testUserId);
      
      // 同时创建一些测试的generation_tasks数据
      const testTask = {
        id: randomUUID(),
        created_by: testUserId,
        material_id: randomUUID(),
        status: 'completed',
        created_at: new Date().toISOString()
      };
      
      const { error: taskError } = await supabase
        .from('generation_tasks')
        .insert([testTask]);
        
      if (taskError) {
        console.error('创建任务失败:', taskError);
      } else {
        console.log('测试任务创建成功:', testTask.id);
      }
    }
  } catch (error) {
    console.error('操作失败:', error);
  }
}

createTestUser();