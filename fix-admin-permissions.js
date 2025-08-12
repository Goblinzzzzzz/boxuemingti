/**
 * 修复admin角色权限配置脚本
 * 确保admin角色拥有所有必要权限，特别是questions.generate权限
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

async function fixAdminPermissions() {
  try {
    console.log('=== 修复admin角色权限配置 ===\n');

    // 1. 查询admin角色ID
    console.log('1. 查询admin角色...');
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id, name')
      .eq('name', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.error('admin角色不存在:', roleError?.message);
      return;
    }

    console.log(`admin角色ID: ${adminRole.id}\n`);

    // 2. 查询questions.generate权限ID
    console.log('2. 查询questions.generate权限...');
    const { data: generatePermission, error: permError } = await supabase
      .from('permissions')
      .select('id, name')
      .eq('name', 'questions.generate')
      .single();

    if (permError || !generatePermission) {
      console.error('questions.generate权限不存在，需要先创建:', permError?.message);
      
      // 创建questions.generate权限
      console.log('3. 创建questions.generate权限...');
      const { data: newPermission, error: createError } = await supabase
        .from('permissions')
        .insert({
          name: 'questions.generate',
          description: 'AI生成试题权限',
          resource: 'questions',
          action: 'generate'
        })
        .select('id, name')
        .single();

      if (createError) {
        console.error('创建权限失败:', createError.message);
        return;
      }

      console.log(`权限创建成功: ${newPermission.name} (ID: ${newPermission.id})\n`);
      // 更新权限对象
      const updatedPermission = {
        id: newPermission.id,
        name: newPermission.name
      };
      Object.assign(generatePermission, updatedPermission);
    } else {
      console.log(`questions.generate权限ID: ${generatePermission.id}\n`);
    }

    // 3. 检查admin角色是否已有questions.generate权限
    console.log('3. 检查admin角色权限配置...');
    const { data: existingRolePermission, error: checkError } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', adminRole.id)
      .eq('permission_id', generatePermission.id)
      .single();

    if (existingRolePermission) {
      console.log('admin角色已拥有questions.generate权限\n');
    } else {
      console.log('admin角色缺少questions.generate权限，正在添加...');
      
      // 4. 为admin角色添加questions.generate权限
      const { error: assignError } = await supabase
        .from('role_permissions')
        .insert({
          role_id: adminRole.id,
          permission_id: generatePermission.id
        });

      if (assignError) {
        console.error('权限分配失败:', assignError.message);
        return;
      }

      console.log('✓ questions.generate权限已成功分配给admin角色\n');
    }

    // 5. 验证修复结果
    console.log('4. 验证修复结果...');
    const { data: adminPermissions, error: verifyError } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          name,
          description
        )
      `)
      .eq('role_id', adminRole.id);

    if (verifyError) {
      console.error('验证失败:', verifyError.message);
      return;
    }

    console.log('admin角色当前权限列表:');
    if (adminPermissions && adminPermissions.length > 0) {
      adminPermissions.forEach(rp => {
        console.log(`  - ${rp.permissions.name}`);
      });
    }
    console.log('');

    // 6. 检查关键权限
    const requiredPermissions = [
      'materials.create',
      'questions.generate',
      'questions.review',
      'users.manage'
    ];

    const currentPermissions = adminPermissions?.map(rp => rp.permissions.name) || [];
    
    console.log('关键权限检查:');
    let allPermissionsPresent = true;
    requiredPermissions.forEach(perm => {
      const hasPermission = currentPermissions.includes(perm);
      console.log(`  - ${perm}: ${hasPermission ? '✓' : '✗'}`);
      if (!hasPermission) {
        allPermissionsPresent = false;
      }
    });
    console.log('');

    if (allPermissionsPresent) {
      console.log('=== 修复完成 ===');
      console.log('admin角色现在拥有所有必要权限');
      console.log('用户zhaodan@ke.com应该能看到"教材输入"和"AI命题"菜单了');
    } else {
      console.log('=== 仍有权限缺失 ===');
      console.log('请检查数据库配置或联系系统管理员');
    }

  } catch (error) {
    console.error('修复过程中发生错误:', error);
  }
}

// 执行修复
fixAdminPermissions().then(() => {
  console.log('\n修复完成');
  process.exit(0);
}).catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});