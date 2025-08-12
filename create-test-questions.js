import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 创建测试试题数据
const testQuestions = [
  {
    question_text: '以下哪个选项是正确的？',
    question_type: 'single_choice',
    difficulty: 'easy',
    options: [
      { text: '选项A', is_correct: true },
      { text: '选项B', is_correct: false },
      { text: '选项C', is_correct: false },
      { text: '选项D', is_correct: false }
    ],
    analysis: '这是一道测试题。正确答案是A。解析内容需要包含三个部分：教材原文段、分析过程段、答案结论段。',
    status: 'ai_reviewing',
    subject: 'test',
    chapter: 'test_chapter',
    knowledge_points: ['测试知识点'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    question_text: '这是一道质量较差的试题',
    question_type: 'single_choice', 
    difficulty: 'easy',
    options: [
      { text: 'A', is_correct: true },
      { text: 'B', is_correct: false }
    ],
    analysis: '解析太短',
    status: 'ai_reviewing',
    subject: 'test',
    chapter: 'test_chapter', 
    knowledge_points: ['测试知识点'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    question_text: '根据教材内容，以下关于某个概念的描述，哪个是正确的？',
    question_type: 'single_choice',
    difficulty: 'medium',
    options: [
      { text: '概念A是指某种特定的理论框架', is_correct: false },
      { text: '概念B是指某种实践方法', is_correct: true },
      { text: '概念C是指某种分析工具', is_correct: false },
      { text: '概念D是指某种评估标准', is_correct: false }
    ],
    analysis: '【教材原文段】根据教材第三章的内容，概念B被定义为一种系统性的实践方法，它强调在具体操作中的应用价值。【分析过程段】通过对比四个选项，我们可以看出选项A描述的是理论框架，这与概念B的实践性质不符；选项C和D分别涉及分析工具和评估标准，都不是概念B的核心特征。只有选项B准确地概括了概念B作为实践方法的本质特征。【答案结论段】因此，正确答案是B，概念B是指某种实践方法。',
    status: 'ai_reviewing',
    subject: 'test',
    chapter: 'test_chapter',
    knowledge_points: ['概念理解', '实践方法'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

async function createTestQuestions() {
  try {
    console.log('正在创建测试试题...');
    
    // 插入测试试题
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(testQuestions)
      .select('id, question_text, status');
    
    if (insertError) {
      throw insertError;
    }
    
    console.log(`成功创建 ${insertedQuestions.length} 道测试试题:`);
    insertedQuestions.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q.id}, 状态: ${q.status}`);
      console.log(`   题目: ${q.question_text.substring(0, 50)}...`);
    });
    
    return insertedQuestions;
  } catch (error) {
    console.error('创建测试试题失败:', error);
    throw error;
  }
}

async function testAIReview(questionIds) {
  try {
    console.log('\n正在进行AI审核测试...');
    
    // 对每个试题进行AI审核
    for (const questionId of questionIds) {
      console.log(`\n审核试题 ${questionId}...`);
      
      const response = await fetch(`http://localhost:3001/api/review/ai-review/${questionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`审核结果: ${result.data.status} (分数: ${result.data.qualityScore})`);
        if (result.data.issues && result.data.issues.length > 0) {
          console.log(`问题: ${result.data.issues.join(', ')}`);
        }
      } else {
        console.log(`审核失败: ${response.status}`);
      }
    }
    
  } catch (error) {
    console.error('AI审核测试失败:', error);
  }
}

async function checkResults() {
  try {
    console.log('\n检查审核结果...');
    
    // 查询各状态的试题数量
    const { data: aiApproved, error: approvedError } = await supabase
      .from('questions')
      .select('id', { count: 'exact' })
      .eq('status', 'ai_approved');
      
    const { data: aiRejected, error: rejectedError } = await supabase
      .from('questions')
      .select('id', { count: 'exact' })
      .eq('status', 'ai_rejected');
      
    const { data: aiReviewing, error: reviewingError } = await supabase
      .from('questions')
      .select('id', { count: 'exact' })
      .eq('status', 'ai_reviewing');
    
    if (approvedError || rejectedError || reviewingError) {
      throw new Error('查询失败');
    }
    
    console.log('\n=== 审核结果统计 ===');
    console.log(`AI审核通过: ${aiApproved.length} 道`);
    console.log(`AI审核未通过: ${aiRejected.length} 道`);
    console.log(`待审核: ${aiReviewing.length} 道`);
    
    // 显示被拒绝的试题详情
    if (aiRejected.length > 0) {
      const { data: rejectedQuestions } = await supabase
        .from('questions')
        .select('id, question_text, metadata')
        .eq('status', 'ai_rejected');
        
      console.log('\n=== AI审核未通过的试题 ===');
      rejectedQuestions.forEach((q, index) => {
        console.log(`${index + 1}. ID: ${q.id}`);
        console.log(`   题目: ${q.question_text.substring(0, 50)}...`);
        if (q.metadata?.ai_review?.issues) {
          console.log(`   问题: ${q.metadata.ai_review.issues.join(', ')}`);
        }
      });
    }
    
  } catch (error) {
    console.error('检查结果失败:', error);
  }
}

async function main() {
  try {
    // 创建测试试题
    const questions = await createTestQuestions();
    const questionIds = questions.map(q => q.id);
    
    // 等待一秒确保数据插入完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 进行AI审核测试
    await testAIReview(questionIds);
    
    // 等待审核完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 检查结果
    await checkResults();
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 直接运行主函数
main();