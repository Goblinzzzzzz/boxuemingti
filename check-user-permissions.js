/**
 * 检查用户权限配置脚本
 * 用于查询zhaodan@ke.com用户的角色和权限配置
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('缺少Supabase配置信息');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserPermissions() {
  try {
    console.log('=== 检查用户权限配置 ===');
    console.log('目标用户: zhaodan@ke.com\n');

    // 1. 查询用户基本信息
    console.log('1. 查询用户基本信息...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('email', 'zhaodan@ke.com')
      .single();

    if (userError || !user) {
      console.error('用户不存在:', userError?.message);
      return;
    }

    console.log('用户信息:', {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at
    });
    console.log('');

    // 2. 查询用户角色
    console.log('2. 查询用户角色...');
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        assigned_at,
        roles (
          id,
          name,
          description
        )
      `)
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('查询用户角色失败:', rolesError.message);
      return;
    }

    console.log('用户角色:');
    if (userRoles && userRoles.length > 0) {
      userRoles.forEach(ur => {
        console.log(`  - ${ur.roles.name} (${ur.roles.description})`);
        console.log(`    分配时间: ${ur.assigned_at}`);
      });
    } else {
      console.log('  无角色分配');
    }
    console.log('');

    // 3. 查询用户权限
    console.log('3. 查询用户权限...');
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
      console.error('查询用户权限失败:', permError.message);
      return;
    }

    // 提取所有权限
    const allPermissions = new Set();
    if (permissions) {
      permissions.forEach(ur => {
        if (ur.roles?.role_permissions) {
          ur.roles.role_permissions.forEach(rp => {
            if (rp.permissions) {
              allPermissions.add(rp.permissions.name);
            }
          });
        }
      });
    }

    console.log('用户权限列表:');
    if (allPermissions.size > 0) {
      Array.from(allPermissions).forEach(perm => {
        console.log(`  - ${perm}`);
      });
    } else {
      console.log('  无权限');
    }
    console.log('');

    // 4. 检查关键权限
    console.log('4. 检查关键权限...');
    const requiredPermissions = [
      'materials.create',
      'questions.generate',
      'questions.review',
      'users.manage'
    ];

    console.log('关键权限检查:');
    requiredPermissions.forEach(perm => {
      const hasPermission = allPermissions.has(perm);
      console.log(`  - ${perm}: ${hasPermission ? '✓' : '✗'}`);
    });
    console.log('');

    // 5. 检查是否有admin角色
    const hasAdminRole = userRoles?.some(ur => ur.roles.name === 'admin');
    console.log(`5. 管理员角色检查: ${hasAdminRole ? '✓' : '✗'}`);
    console.log('');

    // 6. 提供修复建议
    if (!hasAdminRole || !allPermissions.has('materials.create') || !allPermissions.has('questions.generate')) {
      console.log('=== 发现问题，需要修复 ===');
      
      if (!hasAdminRole) {
        console.log('问题: 用户缺少admin角色');
        console.log('修复SQL:');
        console.log(`INSERT INTO user_roles (user_id, role_id, assigned_at) \nSELECT '${user.id}', id, NOW() \nFROM roles WHERE name = 'admin' \nON CONFLICT (user_id, role_id) DO NOTHING;`);
        console.log('');
      }
      
      if (!allPermissions.has('materials.create') || !allPermissions.has('questions.generate')) {
        console.log('问题: 缺少关键权限');
        console.log('建议: 确保admin角色拥有所有必要权限');
        console.log('');
      }
    } else {
      console.log('=== 权限配置正常 ===');
      console.log('用户拥有admin角色和所有必要权限');
    }

  } catch (error) {
    console.error('检查过程中发生错误:', error);
  }
}

// 执行检查
checkUserPermissions().then(() => {
  console.log('\n检查完成');
  process.exit(0);
}).catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});