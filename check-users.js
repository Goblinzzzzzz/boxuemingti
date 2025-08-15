/**
 * 检查数据库中的用户信息
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('=== 检查用户信息 ===');
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, password_hash, status')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('查询用户失败:', error);
      return;
    }
    
    console.log('\n用户列表:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. 邮箱: ${user.email}`);
      console.log(`   姓名: ${user.name}`);
      console.log(`   状态: ${user.status}`);
      console.log(`   密码哈希: ${user.password_hash?.substring(0, 20)}...`);
      console.log('---');
    });
    
    // 检查特定用户
    const testEmails = ['zhaodan@ke.com', 'test@example.com', 'admin@test.com'];
    
    for (const email of testEmails) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userError) {
        console.log(`\n用户 ${email}: 不存在`);
      } else {
        console.log(`\n用户 ${email}: 存在`);
        console.log(`状态: ${user.status}`);
        console.log(`密码哈希: ${user.password_hash}`);
      }
    }
    
  } catch (error) {
    console.error('检查用户异常:', error);
  }
}

checkUsers().catch(console.error);