const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SALT_ROUNDS = 12;

async function createTestAccount() {
  try {
    console.log('🔧 开始创建测试账号...');
    
    const testUser = {
      email: 'zhaodab@ke.com',
      password: '123456',
      name: '测试用户',
      organization: '测试机构'
    };
    
    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', testUser.email)
      .single();
    
    if (existingUser) {
      console.log('✅ 测试账号已存在:', testUser.email);
      console.log('   用户ID:', existingUser.id);
      return existingUser;
    }
    
    // 加密密码
    const passwordHash = await bcrypt.hash(testUser.password, SALT_ROUNDS);
    
    // 创建用户
    const userId = randomUUID();
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: testUser.email,
        name: testUser.name,
        organization: testUser.organization,
        password_hash: passwordHash,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (userError) {
      console.error('❌ 创建用户失败:', userError);
      return null;
    }
    
    console.log('✅ 用户创建成功:', newUser.email);
    console.log('   用户ID:', newUser.id);
    
    // 分配用户角色
    const { data: userRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'teacher')
      .single();
    
    if (roleError || !userRole) {
      console.error('❌ 获取teacher角色失败:', roleError);
      // 如果没有teacher角色，创建一个
      const { data: newRole, error: createRoleError } = await supabase
        .from('roles')
        .insert({
          name: 'teacher',
          description: '教师角色',
          is_system_role: false,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (createRoleError) {
        console.error('❌ 创建teacher角色失败:', createRoleError);
      } else {
        // 分配角色给用户
        const { error: assignRoleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: newUser.id,
            role_id: newRole.id,
            created_at: new Date().toISOString()
          });
        
        if (assignRoleError) {
          console.error('❌ 分配角色失败:', assignRoleError);
        } else {
          console.log('✅ 角色创建并分配成功: teacher');
        }
      }
    } else {
      // 分配现有角色给用户
      const { error: assignRoleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: newUser.id,
          role_id: userRole.id,
          created_at: new Date().toISOString()
        });
      
      if (assignRoleError) {
        console.error('❌ 分配角色失败:', assignRoleError);
      } else {
        console.log('✅ 角色分配成功: teacher');
      }
    }
    
    // 创建一些测试材料
    const materialId = randomUUID();
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .insert({
        id: materialId,
        title: '测试教材',
        content: '这是用于测试试题生成的教材内容。包含数学、逻辑推理、综合应用等多个知识点。',
        text_content: '这是用于测试试题生成的教材内容。包含数学、逻辑推理、综合应用等多个知识点。',
        created_by: newUser.id,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (materialError) {
      console.error('❌ 创建测试材料失败:', materialError);
    } else {
      console.log('✅ 测试材料创建成功:', material.title);
      console.log('   材料ID:', material.id);
    }
    
    // 创建知识点
    const knowledgePoints = [
      { name: '数学基础', content: '基础数学概念和运算' },
      { name: '逻辑推理', content: '逻辑思维和推理能力' },
      { name: '综合应用', content: '综合知识的实际应用' }
    ];
    
    for (const kp of knowledgePoints) {
      const { error: kpError } = await supabase
        .from('knowledge_points')
        .insert({
          id: randomUUID(),
          title: kp.name,
          content: kp.content,
          material_id: materialId,
          created_by: newUser.id,
          created_at: new Date().toISOString()
        });
      
      if (kpError) {
        console.error(`❌ 创建知识点失败 (${kp.name}):`, kpError);
      } else {
        console.log(`✅ 知识点创建成功: ${kp.name}`);
      }
    }
    
    console.log('\n🎉 测试账号设置完成!');
    console.log('=' .repeat(40));
    console.log(`邮箱: ${testUser.email}`);
    console.log(`密码: ${testUser.password}`);
    console.log(`用户ID: ${newUser.id}`);
    console.log(`材料ID: ${materialId}`);
    console.log('=' .repeat(40));
    
    return newUser;
    
  } catch (error) {
    console.error('❌ 创建测试账号失败:', error);
    return null;
  }
}

// 验证登录功能
async function testLogin(email, password) {
  try {
    console.log('\n🔐 测试登录功能...');
    
    const response = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    
    if (result.success && result.access_token) {
      console.log('✅ 登录测试成功');
      console.log(`   用户ID: ${result.user.id}`);
      console.log(`   用户名: ${result.user.name}`);
      console.log(`   角色: ${result.user.roles.join(', ')}`);
      console.log(`   Token: 已生成`);
      return result.access_token;
    } else {
      console.log('❌ 登录测试失败:', result.message || '未知错误');
      if (result.error) {
        console.log('   错误详情:', result.error.message);
      }
      return null;
    }
  } catch (error) {
    console.error('❌ 登录测试错误:', error.message);
    return null;
  }
}

// 主函数
async function main() {
  console.log('🚀 开始设置测试环境');
  console.log('=' .repeat(50));
  
  const user = await createTestAccount();
  
  if (user) {
    // 等待一下确保数据库操作完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 测试登录
    const token = await testLogin('zhaodab@ke.com', '123456');
    
    if (token) {
      console.log('\n✅ 测试环境设置完成，可以开始运行试题生成测试!');
    } else {
      console.log('\n⚠️  测试环境设置完成，但登录测试失败，请检查服务器状态');
    }
  } else {
    console.log('\n❌ 测试环境设置失败');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { createTestAccount, testLogin };