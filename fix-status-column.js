import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || 'https://pnjibotdkfdvtfgqqakg.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlub3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjg5NzEsImV4cCI6MjA2OTk0NDk3MX0.Ej6Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addStatusColumn() {
  console.log('🔧 尝试添加status列到questions表...')
  
  try {
    // 尝试使用原生SQL查询来添加列
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
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
    })
    
    if (error) {
      console.log('❌ RPC执行失败:', error)
      console.log('请手动在Supabase SQL编辑器中执行以下命令:')
      console.log(`
ALTER TABLE questions 
ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX idx_questions_status ON questions(status);

UPDATE questions SET status = 'pending' WHERE status IS NULL;
      `)
    } else {
      console.log('✅ SQL执行成功:', data)
      
      // 验证列是否添加成功
      const { data: testData, error: testError } = await supabase
        .from('questions')
        .select('id, status')
        .limit(1)
      
      if (testError) {
        console.log('❌ 验证失败:', testError)
      } else {
        console.log('✅ status列添加成功，验证通过')
      }
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error)
  }
}

addStatusColumn()