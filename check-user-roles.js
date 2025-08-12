/**
 * 检查用户角色分配脚本
 * 验证zhaodan@ke.com用户的角色和权限配置
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserRoles() {
  try {
    console.log('🔍 检查用户角色分配...');
    
    // 1. 查找用户
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', 'zhaodan@ke.com')
      .single();
    
    if (userError || !user) {
      console.error('❌ 用户不存在:', userError?.message);
      return;
    }
    
    console.log('✅ 找到用户:', user);
    
    // 2. 查询用户角色
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          id,
          name,
          description
        )
      `)
      .eq('user_id', user.id);
    
    if (rolesError) {
      console.error('❌ 查询用户角色失败:', rolesError.message);
      return;
    }
    
    console.log('\n📋 用户角色:');
    if (userRoles && userRoles.length > 0) {
      userRoles.forEach(ur => {
        console.log(`  - ${ur.roles.name}: ${ur.roles.description}`);
      });
    } else {
      console.log('  ❌ 用户没有分配任何角色');
    }
    
    // 3. 查询用户权限
    const { data: permissions, error: permError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          role_permissions (
            permissions (
              name,
              description
            )
          )
        )
      `)
      .eq('user_id', user.id);
    
    if (permError) {
      console.error('❌ 查询用户权限失败:', permError.message);
      return;
    }
    
    console.log('\n🔑 用户权限:');
    const allPermissions = new Set();
    
    if (permissions) {
      permissions.forEach(p => {
        if (p.roles?.role_permissions) {
          p.roles.role_permissions.forEach(rp => {
            if (rp.permissions) {
              allPermissions.add(rp.permissions.name);
              console.log(`  - ${rp.permissions.name}: ${rp.permissions.description}`);
            }
          });
        }
      });
    }
    
    if (allPermissions.size === 0) {
      console.log('  ❌ 用户没有任何权限');
    }
    
    // 4. 检查关键权限
    console.log('\n🎯 关键权限检查:');
    const keyPermissions = [
      'materials.create',
      'questions.generate',
      'questions.review',
      'users.manage',
      'system.admin'
    ];
    
    keyPermissions.forEach(perm => {
      const hasPermission = allPermissions.has(perm);
      console.log(`  ${hasPermission ? '✅' : '❌'} ${perm}`);
    });
    
    // 5. 检查是否有admin角色
    const hasAdminRole = userRoles?.some(ur => ur.roles.name === 'admin');
    console.log(`\n👑 管理员角色: ${hasAdminRole ? '✅ 已分配' : '❌ 未分配'}`);
    
    if (!hasAdminRole) {
      console.log('\n🔧 需要为用户分配admin角色');
      
      // 查找admin角色ID
      const { data: adminRole, error: adminError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'admin')
        .single();
      
      if (adminError || !adminRole) {
        console.error('❌ 找不到admin角色:', adminError?.message);
        return;
      }
      
      // 分配admin角色
      const { error: assignError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role_id: adminRole.id
        });
      
      if (assignError) {
        console.error('❌ 分配admin角色失败:', assignError.message);
      } else {
        console.log('✅ 已成功分配admin角色');
      }
    