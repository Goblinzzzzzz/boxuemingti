/**
 * 为admin角色分配questions.generate权限
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

async function assignGeneratePermission() {
  try {
    console.log('=== 为admin角色分配questions.generate权限 ===\n');

    // 直接使用SQL插入权限分配
    const { data, error } = await supabase.rpc('assign_admin_generate_permission');
    
    if (error) {
      console.log('RPC函数不存在，使用直接插入方式...');
      
      // 使用原生SQL插入
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert({
          role_id: '5a6a229f-79dd-416c-a0f3-b11dc2a70011', // admin角色ID
          permission_id: 'd50fc3f2-3dfd-4e72-acbf-644f3a4a5ff8' // questions.generate权限ID
        });
        
      if (insertError) {
        if (insertError.code === '23505') {
          console.log('✓ admin角色已经拥有questions.generate权限');
        } else {
          console.error('权限分配失败:', insertError.message);
          return;
        }
      } else {
        console.log('✓ questions.generate权限已成功分配给admin角色');
      }
    } else {
      console.log('✓ 权限分配成功');
    }

    // 验证权限分配
    console.log('\n验证权限分配结果...');
    const { data: verification, error: verifyError } = await supabase
      .from('role_permissions')
      .select(`
        permissions (
          name
        )
      `)
      .eq('role_id', '5a6a229f-79dd-416c-a0f3-b11dc2a70011')
      .eq('permission_id', 'd50fc3f2-3dfd-4e72-acbf-644f3a4a5ff8');

    if (verifyError) {
      console.error('验证失败:', verifyError.message);
    } else if (verification && verification.length > 0) {
      console.log('✓ 验证成功：admin角色现在拥有questions.generate权限');
    } else {
      console.log('✗ 验证失败：权限分配可能未成功');
    }

  } catch (error) {
    console.error('执行过程中发生错误:', error);
  }
}

// 执行分配
assignGeneratePermission().then(() => {
  console.log('\n操作完成');
  process.exit(0);
}).catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});