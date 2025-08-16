#!/usr/bin/env node

/**
 * 检查Supabase数据库中用户状态的脚本
 */

import { createClient } from '@supabase/supabase-js';

// Supabase配置
const SUPABASE_URL = 'https://pnjibotdkfdvtfgqqakg.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2MzgyNiwiZXhwIjoyMDY5OTM5ODI2fQ.5WHYnrvY278MYatfm5hq1G7mspdp8ADNgDH1B-klzsM';

// 测试用户邮箱
const TEST_EMAIL = 'zhaodan@ke.com';

async function checkUserDatabase() {
  console.log('🔍 检查用户数据库状态');
  console.log('📧 目标用户:', TEST_EMAIL);
  console.log('=' .repeat(60));
  
  try {
    // 创建Supabase客户端（使用service_role_key以获得完整权限）
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('\n1️⃣ 连接Supabase数据库...');
    
    // 查询用户信息
    console.log('\n2️⃣ 查询用户基本信息...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', TEST_EMAIL)
      .single();
    
    if (userError) {
      console.log('❌ 查询用户信息失败:', userError.message);
      return;
    }
    
    if (!userData) {
      console.log('❌ 用户不存在');
      return;
    }
    
    console.log('✅ 用户信息查询成功');
    console.log('   用户ID:', userData.id);
    console.log('   邮箱:', userData.email);
    console.log('   姓名:', userData.name);
    console.log('   组织:', userData.organization);
    console.log('   邮箱验证状态:', userData.email_verified);
    console.log('   创建时间:', userData.created_at);
    console.log('   最后登录:', userData.last_login_at);
    console.log('   密码哈希:', userData.password_hash ? userData.password_hash.substring(0, 20) + '...' : '无');
    
    // 查询用户角色
    console.log('\n3️⃣ 查询用户角色...');
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (name, description)
      `)
      .eq('user_id', userData.id);
    
    if (roleError) {
      console.log('❌ 查询用户角色失败:', roleError.message);
    } else {
      console.log('✅ 用户角色查询成功');
      if (roleData && roleData.length > 0) {
        roleData.forEach(role => {
          console.log(`   角色: ${role.roles.name} (${role.roles.description})`);
        });
      } else {
        console.log('   无角色分配');
      }
    }
    
    // 查询用户权限
    console.log('\n4️⃣ 查询用户权限...');
    const { data: permissionData, error: permissionError } = await supabase
      .from('user_permissions')
      .select(`
        permission_id,
        permissions (name, description)
      `)
      .eq('user_id', userData.id);
    
    if (permissionError) {
      console.log('❌ 查询用户权限失败:', permissionError.message);
    } else {
      console.log('✅ 用户权限查询成功');
      if (permissionData && permissionData.length > 0) {
        console.log(`   权限数量: ${permissionData.length}`);
        permissionData.slice(0, 5).forEach(perm => {
          console.log(`   权限: ${perm.permissions.name}`);
        });
        if (permissionData.length > 5) {
          console.log(`   ... 还有 ${permissionData.length - 5} 个权限`);
        }
      } else {
        console.log('   无权限分配');
      }
    }
    
    // 测试密码验证
    console.log('\n5️⃣ 测试密码验证...');
    if (userData.password_hash) {
      // 导入bcrypt来验证密码
      try {
        const bcrypt = await import('bcrypt');
        const testPassword = '123456';
        const isPasswordValid = await bcrypt.compare(testPassword, userData.password_hash);
        
        console.log(`   测试密码: ${testPassword}`);
        console.log(`   密码验证结果: ${isPasswordValid ? '✅ 正确' : '❌ 错误'}`);
        
        if (!isPasswordValid) {
          console.log('   ⚠️  密码哈希可能不匹配，这可能是登录失败的原因');
        }
      } catch (bcryptError) {
        console.log('❌ bcrypt模块加载失败:', bcryptError.message);
        console.log('   无法验证密码哈希');
      }
    } else {
      console.log('❌ 用户没有密码哈希');
    }
    
    // 检查Supabase Auth用户
    console.log('\n6️⃣ 检查Supabase Auth用户...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ 查询Auth用户失败:', authError.message);
    } else {
      const authUser = authUsers.users.find(u => u.email === TEST_EMAIL);
      if (authUser) {
        console.log('✅ 在Supabase Auth中找到用户');
        console.log('   Auth用户ID:', authUser.id);
        console.log('   邮箱确认状态:', authUser.email_confirmed_at ? '已确认' : '未确认');
        console.log('   最后登录:', authUser.last_sign_in_at);
      } else {
        console.log('❌ 在Supabase Auth中未找到用户');
      }
    }
    
  } catch (error) {
    console.log('❌ 检查过程中发生错误:', error.message);
    console.log('   错误详情:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🏁 数据库检查完成');
}

// 运行检查
if (import.meta.url === `file://${process.argv[1]}`) {
  checkUserDatabase();
}

export { checkUserDatabase };