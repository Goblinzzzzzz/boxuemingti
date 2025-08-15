// 清除数据库中的所有用户并添加新用户的脚本
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

// Supabase 配置
const supabaseUrl = 'https://pnjibotdkfdvtfgqqakg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2MzgyNiwiZXhwIjoyMDY5OTM5ODI2fQ.5WHYnrvY278MYatfm5hq1G7mspdp8ADNgDH1B-klzsM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetUsers() {
  try {
    console.log('开始清除用户数据...');
    
    // 1. 清除系统日志中的用户引用
    console.log('清除系统日志中的用户引用...');
    await supabase.from('system_logs').delete().neq('user_id', null);
    
    // 2. 清除生成任务中的用户引用
    console.log('清除生成任务中的用户引用...');
    await supabase.from('generation_tasks').update({ created_by: null }).neq('created_by', null);
    
    // 3. 清除试题中的用户引用
    console.log('清除试题中的用户引用...');
    await supabase.from('questions').update({ created_by: null }).neq('created_by', null);
    
    // 4. 清除素材中的用户引用
    console.log('清除素材中的用户引用...');
    await supabase.from('materials').update({ created_by: null }).neq('created_by', null);
    
    // 5. 删除所有用户角色关联和用户
    console.log('删除所有用户角色关联...');
    // 先查询所有用户角色
    const { data: existingUserRoles } = await supabase.from('user_roles').select('*');
    console.log('现有用户角色数量:', existingUserRoles?.length || 0);
    
    // 逐个删除用户角色
    if (existingUserRoles && existingUserRoles.length > 0) {
      for (const role of existingUserRoles) {
        const { error } = await supabase.from('user_roles').delete().eq('id', role.id);
        if (error) {
          console.error(`删除用户角色 ${role.id} 失败:`, error);
        }
      }
    }
    
    // 6. 删除所有用户
    console.log('删除所有用户...');
    const { data: existingUsers } = await supabase.from('users').select('id');
    console.log('现有用户数量:', existingUsers?.length || 0);
    
    if (existingUsers && existingUsers.length > 0) {
      for (const user of existingUsers) {
        const { error } = await supabase.from('users').delete().eq('id', user.id);
        if (error) {
          console.error(`删除用户 ${user.id} 失败:`, error);
        }
      }
    }
    
    console.log('用户数据清除完成！');
    
    // 7. 获取角色ID
    console.log('获取角色信息...');
    const { data: roles, error: rolesError } = await supabase.from('roles').select('id, name');
    if (rolesError) {
      throw new Error(`获取角色失败: ${rolesError.message}`);
    }
    
    const adminRole = roles.find(r => r.name === 'admin');
    const userRole = roles.find(r => r.name === 'user');
    
    if (!adminRole || !userRole) {
      throw new Error('找不到必要的角色');
    }
    
    console.log('角色信息:', { adminRole: adminRole.id, userRole: userRole.id });
    
    // 8. 生成密码哈希
    const passwordHash = await bcrypt.hash('123456', 10);
    console.log('密码哈希生成完成');
    
    // 9. 创建管理员用户
    console.log('创建管理员用户 zhaodan@ke.com...');
    const { data: adminUser, error: adminUserError } = await supabase
      .from('users')
      .insert({
        email: 'zhaodan@ke.com',
        password_hash: passwordHash,
        name: '赵丹',
        organization: '科技公司',
        email_verified: true,
        status: 'active'
      })
      .select()
      .single();
    
    if (adminUserError) {
      throw new Error(`创建管理员用户失败: ${adminUserError.message}`);
    }
    
    console.log('管理员用户创建成功:', adminUser.id);
    
    // 10. 创建普通用户
    console.log('创建普通用户 tangx66@ke.com...');
    const { data: normalUser, error: normalUserError } = await supabase
      .from('users')
      .insert({
        email: 'tangx66@ke.com',
        password_hash: passwordHash,
        name: '唐显',
        organization: '科技公司',
        email_verified: true,
        status: 'active'
      })
      .select()
      .single();
    
    if (normalUserError) {
      throw new Error(`创建普通用户失败: ${normalUserError.message}`);
    }
    
    console.log('普通用户创建成功:', normalUser.id);
    
    // 11. 分配管理员角色
    console.log('为管理员分配角色...');
    // 先检查是否已存在该角色分配
    const { data: existingAdminRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', adminUser.id)
      .eq('role_id', adminRole.id)
      .single();
    
    if (!existingAdminRole) {
      const { error: adminRoleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: adminUser.id,
          role_id: adminRole.id,
          assigned_by: adminUser.id
        });
      
      if (adminRoleError) {
        throw new Error(`分配管理员角色失败: ${adminRoleError.message}`);
      }
    } else {
      console.log('管理员角色已存在，跳过分配');
    }
    
    // 12. 分配普通用户角色
    console.log('为普通用户分配角色...');
    // 先检查是否已存在该角色分配
    const { data: existingUserRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', normalUser.id)
      .eq('role_id', userRole.id)
      .single();
    
    if (!existingUserRole) {
      const { error: userRoleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: normalUser.id,
          role_id: userRole.id,
          assigned_by: adminUser.id
        });
      
      if (userRoleError) {
        throw new Error(`分配普通用户角色失败: ${userRoleError.message}`);
      }
    } else {
      console.log('普通用户角色已存在，跳过分配');
    }
    
    // 13. 验证结果
    console.log('验证创建结果...');
    const { data: verification, error: verificationError } = await supabase
      .from('users')
      .select(`
        email,
        name,
        status,
        user_roles!inner(
          roles!inner(
            name
          )
        )
      `);
    
    if (verificationError) {
      console.error('验证失败:', verificationError);
    } else {
      console.log('\n用户创建完成:');
      verification.forEach(user => {
        const roleName = user.user_roles[0]?.roles?.name || '无角色';
        console.log(`- ${user.email} (${user.name}) - 角色: ${roleName} - 状态: ${user.status}`);
      });
    }
    
    console.log('\n用户重置完成！');
    console.log('登录信息:');
    console.log('管理员: zhaodan@ke.com / 123456');
    console.log('普通用户: tangx66@ke.com / 123456');
    
  } catch (error) {
    console.error('重置用户失败:', error.message);
    process.exit(1);
  }
}

// 运行脚本
resetUsers();