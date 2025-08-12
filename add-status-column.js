/**
 * 为questions表添加status列
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pnjibotdkfdvtfgqqakg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2MzgyNiwiZXhwIjoyMDY5OTM5ODI2fQ.5WHYnrvY278MYatfm5hq1G7mspdp8ADNgDH1B-klzsM'
);

async function addStatusColumn() {
  console.log('🔧 开始添加status列到questions表...\n');

  try {
    // 执行SQL添加status列
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE questions 
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected'));
        
        CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
      `
    });

    if (error) {
      console.error('❌ 添加列失败:', error);
      
      // 尝试直接使用SQL查询
      console.log('🔄 尝试使用直接SQL查询...');
      const { error: sqlError } = await supabase
        .from('questions')
        .select('status')
        .limit(1);
        
      if (sqlError && sqlError.message.includes('status')) {
        console.log('✅ 确认status列不存在，需要手动添加');
        console.log('请在Supabase控制台中执行以下SQL:');
        console.log(`
ALTER TABLE questions 
ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX idx_questions_status ON questions(status);
        `);
      } else {
        console.log('✅ status列可能已存在');
      }
    } else {
      console.log('✅ 成功添加status列');
    }

    // 检查表结构
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'questions')
      .eq('table_schema', 'public');

    if (columns) {
      console.log('\n📋 questions表当前结构:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

// 运行添加
addStatusColumn();