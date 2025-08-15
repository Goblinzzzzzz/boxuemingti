/**
 * 验证普通用户权限配置脚本
 * 检查user角色是否拥有questions.review权限，如果缺少则自动修复
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyUserPermissions() {
  try {
    console.log('=== 验证普通用户权限配置 ===\n');

    // 1. 查询user角色的所有权限
    console.log('1. 查询user角色的所有权限...');
    const { data: userPermissions, error: permError } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          name,
          description
        )
      `)
      .eq('role_id', (
        await supabase
          .from('roles')
          .select('id')
          .eq('name', 'user')
          .single()
      ).data.id);

    if (permError) {
      console.error('查询权限失败:', permError.message);
      return;
    }

    const currentPermissions = userPermissions.map(p => p.permissions.name);
    console.log('当前user角色权限:');
    currentPermissions.forEach(perm => {
      console.log(`  ✅ ${perm}`);
    });
    console.log('');

    // 2. 检查必需的权限
    const requiredPermissions = [
      'materials.create',
      'questions.generate', 
      'questions.review',
      'questions.read'
    ];

    console.log('2. 检查必需权限...');
    const missingPermissions = [];
    
    requiredPermissions.forEach(perm => {
      const hasPermission = currentPermissions.includes(perm);
      console.log(`  ${hasPermission ? '✅' : '❌'} ${perm}`);
      if (!hasPermission) {
        missingPermissions.push(perm);
      }
    });
    console.log('');

    // 3. 如果有缺失权限，执行修复
    if (missingPermissions.length > 0) {
      console.log('3. 发现缺失权限，开始修复...');
      
      for (const permName of missingPermissions) {
        console.log(`修复权限: ${permName}`);
        
        // 获取权限ID
        const { data: permission, error: getPermError } = await supabase
          .from('permissions')
          .select('id')
          .eq('name', permName)
          .single();

        if (getPermError) {
          console.error(`  ❌ 获取权限${permName}失败:`, getPermError.message);
          continue;
        }

        // 获取user角色ID
        const { data: userRole, error: getRoleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'user')
          .single();

        if (getRoleError) {
          console.error('  ❌ 获取user角色失败:', getRoleError.message);
          continue;
        }

        // 分配权限给user角色
        const { error: assignError } = await supabase
          .from('role_permissions')
          .insert({
            role_id: userRole.id,
            permission_id: permission.id
          });

        if (assignError && !assignError.message.includes('duplicate')) {
          console.error(`  ❌ 分配权限${permName}失败:`, assignError.message);
        } else {
          console.log(`  ✅ 成功分配权限: ${permName}`);
        }
      }
      console.log('');
    } else {
      console.log('3. ✅ 所有必需权限都已正确配置\n');
    }

    // 4. 验证修复结果
    console.log('4. 验证修复结果...');
    const { data: finalPermissions, error: finalError } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          name,
          description
        )
      `)
      .eq('role_id', (
        await supabase
          .from('roles')
          .select('id')
          .eq('name', 'user')
          .single()
      ).data.id);

    if (finalError) {
      console.error('验证失败:', finalError.message);
      return;
    }

    const finalPermissionNames = finalPermissions.map(p => p.permissions.name);
    console.log('最终user角色权限:');
    finalPermissionNames.forEach(perm => {
      console.log(`  ✅ ${perm}`);
    });
    console.log('');

    // 5. 生成权限状态报告
    console.log('=== 权限状态报告 ===');
    console.log(`总权限数: ${finalPermissionNames.length}`);
    console.log('权限详情:');
    finalPermissions.forEach(p => {
      console.log(`  • ${p.permissions.name}: ${p.permissions.description}`);
    });
    
    const hasAllRequired = requiredPermissions.every(perm => 
      finalPermissionNames.includes(perm)
    );
    
    console.log(`\n状态: ${hasAllRequired ? '✅ 权限配置正确' : '❌ 仍有权限缺失'}`);
    
    if (hasAllRequired) {
      console.log('\n🎉 普通用户现在应该能够看到以下菜单:');
      console.log('  • 教材输入 (materials.create)');
      console.log('  • AI工作台 (questions.generate)');
      console.log('  • 试题审核 (questions.review)');
      console.log('  • 题库管理 (questions.read)');
    }

  } catch (error) {
    console.error('验证过程出错:', error.message);
  }
}

// 执行验证
verifyUserPermissions();