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

async function resetUserPassword() {
  try {
    console.log('🔄 重置用户密码...');
    
    const email = 'zhaodan@ke.com';
    const newPassword = 'admin123456';
    
    // 生成新的密码哈希
    console.log('🔐 生成密码哈希...');
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    console.log('✅ 密码哈希生成成功');
    
    // 更新数据库中的密码
    console.log('💾 更新数据库...');
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('email', email)
      .select();
    
    if (error) {
      console.error('❌ 更新密码失败:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.error('❌ 未找到要更新的用户');
      return;
    }
    
    console.log('✅ 密码重置成功!');
    console.log('用户:', data[0].email);
    console.log('新密码:', newPassword);
    
    // 验证新密码
    console.log('\n🧪 验证新密码...');
    const isValid = await bcrypt.compare(newPassword, newPasswordHash);
    console.log('密码验证:', isValid ? '✅ 成功' : '❌ 失败');
    
    console.log('\n🎯 现在可以使用以下凭据登录:');
    console.log('邮箱:', email);
    console.log('密码:', newPassword);
    
  } catch (error) {
    console.error('❌ 重置密码过程中发生错误:', error.message);
  }
}

// 运行重置
resetUserPassword();