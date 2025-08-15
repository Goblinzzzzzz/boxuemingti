import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// 创建Supabase客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkReviewPermissions() {
  try {
    console.log('=== 检查试题审核权限配置 ===\n');

    // 1. 检查questions.review权限是否存在
    console.log('1. 检查questions.review权限是否存在...');
    const { data: reviewPermission, error: permError } = await supabase
      .from('permissions')
      .select('*')
      .eq('name', 'questions.review')
      .single();

    if (permError) {
      console.log('❌ questions.review权限不存在:', permError.message);
      return;
    }
    console.log('✅ questions.review权限存在:', reviewPermission);

    // 2. 检查user角色的权限分配
    console.log('\n2. 检查user角色的权限分配...');
    const { data: userRolePerms, error: userError } = await supabase
      .from('role_permissions')
      .select(`
        roles!inner(name),
        permissions!inner(name, description)
      `)
      .eq('roles.name', 'user');

    if (userError) {
      console.log('❌ 查询user角色权限失败:', userError.message);
    } else {
      console.log('user角色权限列表:');
      const hasReviewPermission = userRolePerms.some(rp => rp.permissions.name === 'questions.review');
      userRolePerms.forEach(rp => {
        const status = rp.permissions.name === 'questions.review' ? '✅' : '  ';
        console.log(`${status} ${rp.permissions.name} - ${rp.permissions.description}`);
      });
      
      if (!hasReviewPermission) {
        console.log('\n❌ user角色缺少questions.review权限!');
      } else {
        console.log('\n✅ user角色拥有questions.review权限');
      }
    }

    // 3. 检查admin角色的权限分配
    console.log('\n3. 检查admin角色的权限分配...');
    const { data: adminRolePerms, error: adminError } = await supabase
      .from('role_permissions')
      .select(`
        roles!inner(name),
        permissions!inner(name, description)
      `)
      .eq('roles.name', 'admin');

    if (adminError) {
      console.log('❌ 查询admin角色权限失败:', adminError.message);
    } else {
      console.log('admin角色权限列表:');
      const hasReviewPermission = adminRolePerms.some(rp => rp.permissions.name === 'questions.review');
      adminRolePerms.forEach(rp => {
        const status = rp.permissions.name === 'questions.review' ? '✅' : '  ';
        console.log(`${status} ${rp.permissions.name} - ${rp.permissions.description}`);
      });
      
      if (!hasReviewPermission) {
        console.log('\n❌ admin角色缺少questions.review权限!');
      } else {
        console.log('\n✅ admin角色拥有questions.review权限');
      }
    }

    // 4. 检查特定用户的权限
    console.log('\n4. 检查用户tangx66@ke.com的权限...');
    const { data: user, error: userFindError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', 'tangx66@ke.com')
      .single();

    if (userFindError) {
      console.log('❌ 找不到用户tangx66@ke.com:', userFindError.message);
    } else {
      console.log(`用户信息: ${user.name} (${user.email})`);
      
      // 获取用户权限
      const { data: userPermissions, error: userPermError } = await supabase
        .rpc('get_user_permissions', { user_uuid: user.id });

      if (userPermError) {
        console.log('❌ 获取用户权限失败:', userPermError.message);
      } else {
        console.log('用户权限列表:');
        const hasReviewPermission = userPermissions.includes('questions.review');
        userPermissions.forEach(perm => {
          const status = perm === 'questions.review' ? '✅' : '  ';
          console.log(`${status} ${perm}`);
        });
        
        if (!hasReviewPermission) {
          console.log('\n❌ 用户tangx66@ke.com缺少questions.review权限!');
        } else {
          console.log('\n✅ 用户tangx66@ke.com拥有questions.review权限');
        }
      }
    }

    // 5. 总结
    console.log('\n=== 权限检查总结 ===');
    const userHasReview = userRolePerms && userRolePerms.some(rp => rp.permissions.name === 'questions.review');
    const adminHasReview = adminRolePerms && adminRolePerms.some(rp => rp.permissions.name === 'questions.review');
    
    if (userHasReview && adminHasReview) {
      console.log('✅ 权限配置正确：user和admin角色都拥有questions.review权限');
    } else {
      console.log('❌ 权限配置有问题：');
      if (!userHasReview) console.log('  - user角色缺少questions.review权限');
      if (!adminHasReview) console.log('  - admin角色缺少questions.review权限');
      console.log('\n建议运行修复脚本或重新应用008_fix_user_permissions.sql迁移');
    }

  } catch (error) {
    console.error('检查权限时发生错误:', error);
  }
}

checkReviewPermissions();