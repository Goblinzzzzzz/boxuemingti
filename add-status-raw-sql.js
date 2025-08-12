import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function addStatusColumn() {
  console.log('🔧 尝试添加status列...');
  
  try {
    // 尝试使用原始SQL查询
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ 数据库连接失败:', error);
      return false;
    }
    
    console.log('✅ 数据库连接正常');
    console.log('📋 当前表字段:', Object.keys(data[0] || {}));
    
    // 检查是否已有status字段
    if (data[0] && 'status' in data[0]) {
      console.log('✅ status字段已存在');
      return true;
    }
    
    console.log('❌ status字段不存在');
    console.log('\n由于Supabase限制，需要手动添加status列。');
    console.log('请在Supabase Dashboard > SQL Editor中执行以下命令:');
    console.log('');
    console.log('ALTER TABLE questions ADD COLUMN status VARCHAR(20) DEFAULT \'pending\';');
    console.log('ALTER TABLE questions ADD CONSTRAINT questions_status_check CHECK (status IN (\'pending\', \'approved\', \'rejected\'));');
    console.log('CREATE INDEX idx_questions_status ON questions(status);');
    console.log('UPDATE questions SET status = \'pending\' WHERE status IS NULL;');
    console.log('');
    
    return false;
  } catch (error) {
    console.error('❌ 操作失败:', error);
    return false;
  }
}

// 运行脚本
addStatusColumn().then(success => {
  if (success) {
    console.log('\n🎉 status列已存在！');
  } else {
    console.log('\n⚠️  请手动添加status列后重试');
  }
  process.exit(0);
});