// 验证用户创建和角色分配的脚本
import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = 'https://pnjibotdkfdvtfgqqakg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2MzgyNiwiZXhwIjoyMDY5OTM5ODI2fQ.5WHYnrvY278MYatfm5hq1G7mspdp8ADNgDH1B-klzsM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyUsers() {
  try {
    console.log('开始验证用户创建和角色分配...');
    
    // 1. 查询所有用户
    console.log('\n1. 查询所有用户:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, organization, status, email_verified, created_at');
    
    if (usersError) {
      throw new Error(`查询用户失败: ${usersError.message}`);
    }
    
    console.log(`找到 ${users.length} 个用户:`);
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - 状态: ${user.status} - 邮箱验证: ${user.email_verified}`);
    });
    
    // 2. 查询用户角色分配
    console.log('\n2. 查询用户角色分配:');
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select(`
        id,
        user_id,
        role_id,
        assigned_at,
        users!user_roles_user_id_fkey(email, name),
        roles(name, description)
      `);
    
    if (userRolesError) {
      throw new Error(`查询用户角色失败: ${userRolesError.message}`);
    }
    
    console.log(`找到 ${userRoles.length} 个角色分配:`);
    userRoles.forEach(userRole => {
      const user = userRole.users;
      const role = userRole.roles;
      console.log(`- ${user.email} (${user.name}) -> 角色: ${role.name}`);
    });
    
    // 3. 验证特定用户
    console.log('\n3. 验证特定用户:');
    
    // 验证管理员用户
    const adminUser = users.find(u => u.email === 'zhaodan@ke.com');
    if (adminUser) {
      console.log('✅ 管理员用户 zhaodan@ke.com 创建成功');
      const adminRole = userRoles.find(ur => ur.users.email === 'zhaodan@ke.com');
      if (adminRole && adminRole.roles.name === 'admin') {
        console.log('✅ 管理员角色分配正确');
      } else {
        console.log('❌ 管理员角色分配错误或缺失');
      }
    } else {
      console.log('❌ 管理员用户 zhaodan@ke.com 未找到');
    }
    
    // 验证普通用户
    const normalUser = users.find(u => u.email === 'tangx66@ke.com');
    if (normalUser) {
      console.log('✅ 普通用户 tangx66@ke.com 创建成功');
      const normalRole = userRoles.find(ur => ur.users.email === 'tangx66@ke.com');
      if (normalRole && normalRole.roles.name === 'user') {
        console.log('✅ 普通用户角色分配正确');
      } else {
        console.log('❌ 普通用户角色分配错误或缺失');
      }
    } else {
      console.log('❌ 普通用户 tangx66@ke.com 未找到');
    }
    
    // 4. 验证权限
    console.log('\n4. 验证用户权限:');
    
    // 查询角色权限
    const { data: rolePermissions, error: permissionsError } = await supabase
      .from('role_permissions')
      .select(`
        roles(name),
        permissions(name, resource, action)
      `);
    
    if (permissionsError) {
      console.error('查询权限失败:', permissionsError);
    } else {
      const adminPermissions = rolePermissions.filter(rp => rp.roles.name === 'admin');
      const userPermissions = rolePermissions.filter(rp => rp.roles.name === 'user');
      
      console.log(`管理员权限数量: ${adminPermissions.length}`);
      console.log(`普通用户权限数量: ${userPermissions.length}`);
      
      // 检查关键权限
      const hasQuestionReview = userPermissions.some(up => 
        up.permissions.resource === 'questions' && up.permissions.action === 'review'
      );
      
      if (hasQuestionReview) {
        console.log('✅ 普通用户拥有试题审核权限');
      } else {
        console.log('❌ 普通用户缺少试题审核权限');
      }
    }
    
    // 5. 总结
    console.log('\n5. 验证总结:');
    const expectedUsers = ['zhaodan@ke.com', 'tangx66@ke.com'];
    const actualUsers = users.map(u => u.email);
    const missingUsers = expectedUsers.filter(email => !actualUsers.includes(email));
    const extraUsers = actualUsers.filter(email => !expectedUsers.includes(email));
    
    if (missingUsers.length === 0 && extraUsers.length === 0 && users.length === 2) {
      console.log('✅ 用户创建完全正确');
    } else {
      console.log('❌ 用户创建存在问题:');
      if (missingUsers.length > 0) {
        console.log(`  缺少用户: ${missingUsers.join(', ')}`);
      }
      if (extraUsers.length > 0) {
        console.log(`  多余用户: ${extraUsers.join(', ')}`);
      }
    }
    
    if (userRoles.length === 2) {
      console.log('✅ 角色分配数量正确');
    } else {
      console.log(`❌ 角色分配数量错误，期望2个，实际${userRoles.length}个`);
    }
    
    console.log('\n验证完成！');
    
  } catch (error) {
    console.error('验证失败:', error.message);
    process.exit(1);
  }
}

// 运行验证
verifyUsers();