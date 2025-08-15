/**
 * 重置用户密码脚本
 * 将zhaodan@ke.com的密码重置为123456
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

async function resetUserPassword() {
  const email = 'zhaodan@ke.com';
  const newPassword = '123456';
  
  try {
    console.log(`🔄 重置用户 ${email} 的密码...`);
    
    // 生成新的密码哈希
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log(`🔐 生成新密码哈希: ${passwordHash}`);
    
    // 更新数据库中的密码
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('email', email)
      .select();
    
    if (error) {
      console.error('❌ 更新密码失败:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ 密码重置成功!');
      console.log(`用户: ${data[0].email}`);
      console.log(`新密码: ${newPassword}`);
      
      // 验证新密码
      console.log('\n🔍 验证新密码...');
      const isValid = await bcrypt.compare(newPassword, passwordHash);
      if (isValid) {
        console.log('✅ 新密码验证成功!');
      } else {
        console.log('❌ 新密码验证失败!');
      }
    } else {
      console.log('❌ 没有找到要更新的用户');
    }
    
  } catch (error) {
    console.error('❌ 重置密码时出错:', error.message);
  }
}

resetUserPassword().catch(console.error);