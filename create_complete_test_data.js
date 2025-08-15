import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createCompleteTestData() {
  try {
    console.log('开始创建完整的测试数据...');
    
    // 1. 创建测试用户
    let testUserId = randomUUID();
    const testUser = {
      id: testUserId,
      email: 'testuser@example.com',
      name: 'Test User',
      password_hash: 'test_hash_123',
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    console.log('创建测试用户...');
    const { error: userError } = await supabase
      .from('users')
      .insert([testUser]);
    
    if (userError) {
      if (userError.code === '23505') {
        // 用户已存在，查找现有用户
        console.log('用户已存在，查找现有用户...');
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', 'testuser@example.com')
          .single();
        
        if (existingUser) {
          testUserId = existingUser.id;
          console.log('✓ 使用现有用户:', testUserId);
        } else {
          console.error('无法找到现有用户');
          return;
        }
      } else {
        console.error('创建用户失败:', userError);
        return;
      }
    } else {
      console.log('✓ 测试用户创建成功:', testUserId);
    }
    
    // 2. 创建测试教材
    const materialId = randomUUID();
    const testMaterial = {
      id: materialId,
      title: '测试教材',
      content: '这是一个测试教材的内容，用于生成试题。',
      file_type: 'text',
      created_by: testUserId,
      created_at: new Date().toISOString()
    };
    
    console.log('创建测试教材...');
    const { error: materialError } = await supabase
      .from('materials')
      .insert([testMaterial]);
    
    if (materialError) {
      console.error('创建教材失败:', materialError);
      return;
    }
    console.log('✓ 测试教材创建成功:', materialId);
    
    // 3. 创建测试知识点
    const knowledgePointId = randomUUID();
    const testKnowledgePoint = {
      id: knowledgePointId,
      title: '测试知识点',
      level: 'HR掌握',
      created_at: new Date().toISOString()
    };
    
    console.log('创建测试知识点...');
    const { error: kpError } = await supabase
      .from('knowledge_points')
      .insert([testKnowledgePoint]);
    
    if (kpError) {
      console.error('创建知识点失败:', kpError);
      return;
    }
    console.log('✓ 测试知识点创建成功:', knowledgePointId);
    
    // 4. 创建测试生成任务
    const taskId = randomUUID();
    const testTask = {
      id: taskId,
      created_by: testUserId,
      material_id: materialId,
      status: 'completed',
      parameters: {
        questionCount: 3,
        questionTypes: ['单选题', '判断题', '多选题'],
        difficulty: '中等'
      },
      created_at: new Date().toISOString()
    };
    
    console.log('创建测试生成任务...');
    const { error: taskError } = await supabase
      .from('generation_tasks')
      .insert([testTask]);
    
    if (taskError) {
      console.error('创建任务失败:', taskError);
      return;
    }
    console.log('✓ 测试生成任务创建成功:', taskId);
    
    // 5. 创建测试试题（审核通过状态）
    const questions = [
      {
        id: randomUUID(),
        task_id: taskId,
        question_type: '单选题',
        stem: '这是一个测试单选题的题干？',
        options: ['选项A', '选项B', '选项C', '选项D'],
        correct_answer: 'A',
        analysis: {
          explanation: '这是正确答案的解释。',
          reasoning: '选择A的原因是...'
        },
        difficulty: '中',
        knowledge_level: 'HR掌握',
        knowledge_point_id: knowledgePointId,
        status: 'approved',
        created_by: testUserId,
        created_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        task_id: taskId,
        question_type: '判断题',
        stem: '这是一个测试判断题的题干。',
        options: ['正确', '错误'],
        correct_answer: '正确',
        analysis: {
          explanation: '这是判断题的解释。',
          reasoning: '判断为正确的原因是...'
        },
        difficulty: '易',
        knowledge_level: 'HR掌握',
        knowledge_point_id: knowledgePointId,
        status: 'approved',
        created_by: testUserId,
        created_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        task_id: taskId,
        question_type: '多选题',
        stem: '这是一个测试多选题的题干？',
        options: ['选项A', '选项B', '选项C', '选项D'],
        correct_answer: 'A,B',
        analysis: {
          explanation: '这是多选题的解释。',
          reasoning: '选择A和B的原因是...'
        },
        difficulty: '难',
        knowledge_level: 'HR掌握',
        knowledge_point_id: knowledgePointId,
        status: 'approved',
        created_by: testUserId,
        created_at: new Date().toISOString()
      }
    ];
    
    console.log('创建测试试题...');
    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questions);
    
    if (questionsError) {
      console.error('创建试题失败:', questionsError);
      return;
    }
    console.log('✓ 测试试题创建成功，共', questions.length, '道题');
    
    console.log('\n=== 测试数据创建完成 ===');
    console.log('用户ID:', testUserId);
    console.log('教材ID:', materialId);
    console.log('知识点ID:', knowledgePointId);
    console.log('任务ID:', taskId);
    console.log('试题数量:', questions.length);
    
    return testUserId;
  } catch (error) {
    console.error('创建测试数据失败:', error);
  }
}

createCompleteTestData();