import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function addStatusColumnSQL() {
  console.log('🔧 尝试通过SQL添加status列到questions表...');
  
  try {
    // 执行SQL添加status列
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- 添加status列（如果不存在）
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'questions' AND column_name = 'status'
            ) THEN
                ALTER TABLE questions 
                ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
                CHECK (status IN ('pending', 'approved', 'rejected'));
                
                CREATE INDEX idx_questions_status ON questions(status);
                
                -- 更新现有记录
                UPDATE questions SET status = 'pending' WHERE status IS NULL;
                
                RAISE NOTICE 'Status column added successfully';
            ELSE
                RAISE NOTICE 'Status column already exists';
            END IF;
        END $$;
      `
    });

    if (error) {
      console.error('❌ SQL执行失败:', error);
      
      // 尝试直接使用ALTER TABLE
      console.log('🔧 尝试直接添加列...');
      const { error: alterError } = await supabase
        .from('questions')
        .select('id')
        .limit(1);
      
      if (alterError) {
        console.error('❌ 数据库连接失败:', alterError);
        return false;
      }
      
      console.log('✅ 数据库连接正常，但无法通过RPC添加列');
      console.log('\n请在Supabase Dashboard的SQL编辑器中手动执行以下SQL:');
      console.log('');
      console.log('ALTER TABLE questions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'pending\';');
      console.log('ALTER TABLE questions ADD CONSTRAINT IF NOT EXISTS questions_status_check CHECK (status IN (\'pending\', \'approved\', \'rejected\'));');
      console.log('CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);');
      console.log('UPDATE questions SET status = \'pending\' WHERE status IS NULL;');
      console.log('');
      return false;
    } else {
      console.log('✅ SQL执行成功:', data);
      return true;
    }
  } catch (error) {
    console.error('❌ 操作失败:', error);
    return false;
  }
}

// 运行脚本
addStatusColumnSQL().then(success => {
  if (success) {
    console.log('\n🎉 status列添加完成！');
  } else {
    console.log('\n⚠️  请手动在Supabase Dashboard中执行SQL命令');
  }
  process.exit(0);
});