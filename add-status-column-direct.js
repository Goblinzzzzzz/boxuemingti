import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addStatusColumn() {
  console.log('🔧 尝试添加status列到questions表...');
  
  try {
    // 首先尝试查询一个试题，看看是否有status字段
    const { data: testQuestion, error: testError } = await supabase
      .from('questions')
      .select('id, status')
      .limit(1)
      .single();
    
    if (testError && testError.message.includes('column "status" does not exist')) {
      console.log('❌ status列不存在，需要手动添加');
      console.log('\n请在Supabase SQL编辑器中执行以下命令:');
      console.log('');
      console.log('-- 添加status列');
      console.log('ALTER TABLE questions ADD COLUMN status VARCHAR(20) DEFAULT \'pending\';');
      console.log('');
      console.log('-- 添加检查约束');
      console.log('ALTER TABLE questions ADD CONSTRAINT questions_status_check CHECK (status IN (\'pending\', \'approved\', \'rejected\'));');
      console.log('');
      console.log('-- 创建索引');
      console.log('CREATE INDEX idx_questions_status ON questions(status);');
      console.log('');
      console.log('-- 更新现有记录');
      console.log('UPDATE questions SET status = \'pending\' WHERE status IS NULL;');
      console.log('');
      return false;
    } else if (testError) {
      console.error('❌ 查询失败:', testError);
      return false;
    } else {
      console.log('✅ status列已存在');
      
      // 更新所有没有status的记录
      const { error: updateError } = await supabase
        .from('questions')
        .update({ status: 'pending' })
        .is('status', null);
      
      if (updateError) {
        console.log('⚠️  更新现有记录失败:', updateError.message);
      } else {
        console.log('✅ 已更新现有记录的status为pending');
      }
      
      return true;
    }
  } catch (error) {
    console.error('❌ 操作失败:', error);
    return false;
  }
}

// 运行脚本
addStatusColumn().then(success => {
  if (success) {
    console.log('\n🎉 status列配置完成！');
  } else {
    console.log('\n⚠️  请手动执行上述SQL命令后重新运行测试脚本');
  }
  process.exit(0);
});