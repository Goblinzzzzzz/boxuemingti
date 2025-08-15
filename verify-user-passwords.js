/**
 * 验证用户密码脚本
 * 检查zhaodan@ke.com和zhaodab@ke.com的密码是否正确设置为123456
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyUserPasswords() {
  console.log('🔍 验证用户密码...');
  
  const testUsers = [
    { email: 'zhaodan@ke.com', expectedPassword: '123456' },
    { email: 'zhaodab@ke.com', expectedPassword: '123456' }
  ];
  
  for (const testUser of testUsers) {
    try {
      console.log(`\n检查用户: ${testUser.email}`);
      
      // 查询用户信息
      const { data: user, error } = await supabase
        .from('users')
        .select('email, password_hash, status')
        .eq('email', testUser.email)
        .single();
      
      if (error) {
        console.error(`❌ 查询用户失败:`, error.message);
        continue;
      }
      
      if (!user) {
        console.error(`❌ 用户不存在`);
        continue;
      }
      
      console.log(`✅ 用户存在，状态: ${user.status}`);
      
      // 验证密码
      if (!user.password_hash) {
        console.error(`❌ 用户没有设置密码哈希`);
        continue;
      }
      
      const isPasswordValid = await bcrypt.compare(testUser.expectedPassword, user.password_hash);
      
      if (isPasswordValid) {
        console.log(`✅ 密码验证成功 - 密码为: ${testUser.expectedPassword}`);
      } else {
        console.log(`❌ 密码验证失败 - 密码不是: ${testUser.expectedPassword}`);
        console.log(`   密码哈希: ${user.password_hash}`);
      }
      
    } catch (error) {
      console.error(`❌ 验证用户 ${testUser.email} 时出错:`, error.message);
    }
  }
}

verifyUserPasswords().catch(console.error);