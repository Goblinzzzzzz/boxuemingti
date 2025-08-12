import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addStatusColumn() {
  try {
    console.log('正在添加status列到questions表...');
    
    // 使用SQL查询添加status列
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE questions 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected'));
      `
    });

    if (error) {
      console.error('添加status列失败:', error);
      
      // 尝试另一种方法：直接执行SQL
      console.log('尝试使用直接SQL执行...');
      const { data: result, error: sqlError } = await supabase
        .from('questions')
        .select('id')
        .limit(1);
        
      if (sqlError) {
        console.error('数据库连接失败:', sqlError);
        return;
      }
      
      console.log('数据库连接正常，但无法执行DDL语句');
      console.log('请在Supabase控制台的SQL编辑器中手动执行以下SQL:');
      console.log(`
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));
      `);
    } else {
      console.log('status列添加成功!');
    }
  } catch (error) {
    console.error('执行失败:', error);
  }
}

addStatusColumn();