// 修复管理员角色分配的脚本
import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = 'https://pnjibotdkfdvtfgqqakg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2MzgyNiwiZXhwIjoyMDY5OTM5ODI2fQ.5WHYnrvY278MYatfm5hq1G7mspdp8ADNgDH1B-klzsM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminRoles() {
  try {
    console.log('开始修复管理员角色分配...');
    
    // 1. 获取管理员用户ID
    const { data: adminUser, error: adminUserError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'zhaodan@ke.com')
      .single();
    
    if (adminUserError) {
      throw new Error(`获取管理员用户失败: ${adminUserError.message}`);
    }
    
    console.log('管理员用户ID:', adminUser.id);
    
    // 2. 获取角色ID
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name');
    
    if (rolesError) {
      throw new Error(`获取角色失败: ${rolesError.message}`);
    }
    
    const adminRole = roles.find(r => r.name === 'admin');
    const userRole = roles.find(r => r.name === 'user');
    
    console.log('角色信息:', { adminRole: adminRole.id, userRole: userRole.id });
    
    // 3. 查询管理员当前的角色分配
    const { data: currentRoles, error: currentRolesError } = await supabase
      .from('user_roles')
      .select('id, role_id, roles(name)')
      .eq('user_id', adminUser.id);
    
    if (currentRolesError) {
      throw new Error(`查询当前角色失败: ${currentRolesError.message}`);
    }
    
    console.log('管理员当前角色分配:');
    currentRoles.forEach(role => {
      console.log(`- ${role.roles.name} (ID: ${role.id})`);
    });
    
    // 4. 删除管理员的user角色
    const userRoleAssignment = currentRoles.find(r => r.role_id === userRole.id);
    if (userRoleAssignment) {
      console.log('删除管理员的user角色...');
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRoleAssignment.id);
      
      if (deleteError) {
        throw new Error(`删除user角色失败: ${deleteError.message}`);
      }
      
      console.log('✅ 成功删除管理员的user角色');
    } else {
      console.log('管理员没有user角色，无需删除');
    }
    
    // 5. 确保管理员有admin角色
    const adminRoleAssignment = currentRoles.find(r => r.role_id === adminRole.id);
    if (!adminRoleAssignment) {
      console.log('为管理员添加admin角色...');
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: adminUser.id,
          role_id: adminRole.id,
          assigned_by: adminUser.id
        });
      
      if (insertError) {
        throw new Error(`添加admin角色失败: ${insertError.message}`);
      }
      
      console.log('✅ 成功为管理员添加admin角色');
    } else {
      console.log('管理员已有admin角色');
    }
    
    // 6. 验证修复结果
    console.log('\n验证修复结果...');
    const { data: finalRoles, error: finalRolesError } = await supabase
      .from('user_roles')
      .select(`
        roles(name),
        users!user_roles_user_id_fkey(email)
      `)
      .eq('user_id', adminUser.id);
    
    if (finalRolesError) {
      throw new Error(`验证失败: ${finalRolesError.message}`);
    }
    
    console.log('管理员最终角色分配:');
    finalRoles.forEach(role => {
      console.log(`- ${role.users.email} -> ${role.roles.name}`);
    });
    
    if (finalRoles.length === 1 && finalRoles[0].roles.name === 'admin') {
      console.log('\n✅ 管理员角色修复成功！');
    } else {
      console.log('\n❌ 管理员角色修复失败');
    }
    
  } catch (error) {
    console.error('修复失败:', error.message);
    process.exit(1);
  }
}

// 运行修复
fixAdminRoles();