require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 创建测试教材和知识点
async function createTestMaterials() {
  try {
    console.log('🔧 开始创建测试教材和知识点...');
    
    // 获取测试用户ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'zhaodab@ke.com')
      .single();
    
    if (userError || !user) {
      console.error('❌ 找不到测试用户:', userError);
      return false;
    }
    
    console.log('✅ 找到测试用户:', user.id);
    
    // 检查是否已有测试教材
    const { data: existingMaterial, error: checkError } = await supabase
      .from('materials')
      .select('id, title')
      .eq('created_by', user.id)
      .eq('title', '测试教材')
      .single();
    
    let materialId;
    
    if (existingMaterial) {
      console.log('✅ 测试教材已存在:', existingMaterial.title);
      materialId = existingMaterial.id;
    } else {
      // 创建测试教材
      materialId = randomUUID();
      const { data: material, error: materialError } = await supabase
        .from('materials')
        .insert({
          id: materialId,
          title: '测试教材',
          content: '这是用于测试试题生成的教材内容。\n\n第一章：数学基础\n包含基础数学概念和运算，如加减乘除、分数、小数等。\n\n第二章：逻辑推理\n培养逻辑思维和推理能力，包括演绎推理、归纳推理等。\n\n第三章：综合应用\n将所学知识应用到实际问题中，提高解决问题的能力。',
          file_type: 'text',
          created_by: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (materialError) {
        console.error('❌ 创建测试教材失败:', materialError);
        return false;
      }
      
      console.log('✅ 测试教材创建成功:', material.title);
      console.log('   教材ID:', material.id);
    }
    
    // 检查是否已有知识点
    const { data: existingKnowledgePoints, error: kpCheckError } = await supabase
      .from('knowledge_points')
      .select('id, title')
      .in('title', ['数学基础', '逻辑推理', '综合应用']);
    
    if (existingKnowledgePoints && existingKnowledgePoints.length > 0) {
      console.log(`✅ 已存在 ${existingKnowledgePoints.length} 个知识点`);
      existingKnowledgePoints.forEach(kp => {
        console.log(`   - ${kp.title}`);
      });
    }
    
    // 创建缺失的知识点
    const knowledgePoints = [
      { 
        title: '数学基础', 
        description: '基础数学概念和运算，包括加减乘除、分数、小数等基本运算技能',
        level: '全员掌握',
        textbook_page: '第1-20页'
      },
      { 
        title: '逻辑推理', 
        description: '逻辑思维和推理能力，包括演绎推理、归纳推理、类比推理等思维方法',
        level: '全员熟悉',
        textbook_page: '第21-40页'
      },
      { 
        title: '综合应用', 
        description: '综合知识的实际应用，将理论知识运用到实际问题解决中',
        level: '全员了解',
        textbook_page: '第41-60页'
      }
    ];
    
    const existingTitles = existingKnowledgePoints ? existingKnowledgePoints.map(kp => kp.title) : [];
    
    for (const kp of knowledgePoints) {
      if (existingTitles.includes(kp.title)) {
        console.log(`⏭️  知识点已存在，跳过: ${kp.title}`);
        continue;
      }
      
      const { error: kpError } = await supabase
        .from('knowledge_points')
        .insert({
          id: randomUUID(),
          title: kp.title,
          description: kp.description,
          level: kp.level,
          textbook_page: kp.textbook_page,
          created_at: new Date().toISOString()
        });
      
      if (kpError) {
        console.error(`❌ 创建知识点失败 (${kp.title}):`, kpError);
      } else {
        console.log(`✅ 知识点创建成功: ${kp.title}`);
      }
    }
    
    console.log('\n🎉 测试教材和知识点设置完成!');
    console.log('=' .repeat(40));
    console.log(`教材ID: ${materialId}`);
    console.log(`用户ID: ${user.id}`);
    console.log('=' .repeat(40));
    
    return true;
    
  } catch (error) {
    console.error('❌ 创建测试教材失败:', error);
    return false;
  }
}

// 主函数
async function main() {
  console.log('🚀 开始设置测试教材环境');
  console.log('=' .repeat(50));
  
  const success = await createTestMaterials();
  
  if (success) {
    console.log('\n✅ 测试教材环境设置完成，可以开始运行试题生成测试!');
  } else {
    console.log('\n❌ 测试教材环境设置失败');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = { createTestMaterials };