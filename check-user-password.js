import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserPassword() {
  try {
    console.log('🔍 检查用户密码...');
    
    // 查询用户信息
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'zhaodan@ke.com')
      .single();
    
    if (error) {
      console.error('❌ 查询用户失败:', error.message);
      return;
    }
    
    if (!user) {
      console.error('❌ 用户不存在');
      return;
    }
    
    console.log('✅ 找到用户:', {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at
    });
    
    console.log('\n🔐 密码信息:');
    console.log('密码哈希存在:', !!user.password_hash);
    console.log('密码哈希长度:', user.password_hash ? user.password_hash.length : 0);
    
    // 测试密码
    const testPasswords = ['admin123456', 'Admin123456', '123456', 'admin'];
    
    console.log('\n🧪 测试密码:');
    for (const password of testPasswords) {
      try {
        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log(`  ${password}: ${isMatch ? '✅ 匹配' : '❌ 不匹配'}`);
        if (isMatch) {
          console.log(`\n🎯 正确密码: ${password}`);
          break;
        }
      } catch (error) {
        console.log(`  ${password}: ❌ 比较失败 - ${error.message}`);
      }
    }
    
    // 如果需要重置密码
    console.log('\n💡 如果需要重置密码，可以运行以下代码:');
    console.log('const newPasswordHash = await bcrypt.hash("admin123456", 10);');
    console.log('然后更新数据库中的password_hash字段');
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error.message);
  }
}

// 运行检查
checkUserPassword();