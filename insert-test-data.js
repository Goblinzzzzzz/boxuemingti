/**
 * 直接向数据库插入测试试题数据
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pnjibotdkfdvtfgqqakg.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuamlib3Rka2ZkdnRmZ3FxYWtnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM2MzgyNiwiZXhwIjoyMDY5OTM5ODI2fQ.5WHYnrvY278MYatfm5hq1G7mspdp8ADNgDH1B-klzsM'
);

async function insertTestData() {
  console.log('🧪 开始插入测试试题数据...\n');

  try {
    // 首先获取一个task_id
    const { data: tasks } = await supabase
      .from('generation_tasks')
      .select('id')
      .limit(1);

    if (!tasks || tasks.length === 0) {
      console.log('❌ 没有找到generation_tasks，无法插入试题');
      return;
    }

    const taskId = tasks[0].id;
    console.log('✅ 使用task_id:', taskId);

    // 准备测试试题数据
    const testQuestions = [
      {
        task_id: taskId,
        stem: '以下关于岗位价值评估的说法，哪项是正确的？（ ）',
        options: {
          A: '主要考虑岗位稀缺性',
          B: '以对组织目标的贡献为基础',
          C: '重点关注员工满意度',
          D: '依据薪资高低判断'
        },
        correct_answer: 'B',
        question_type: '单选题',
        analysis: {
          textbook: '根据《第5届HR搏学考试辅导教材》第82页',
          explanation: '岗位价值评估的核心在于评估岗位对组织目标实现的贡献程度，而不是简单的稀缺性或薪资水平',
          conclusion: '本题答案为B'
        },
        knowledge_level: 'HR掌握',
        difficulty: '中',
        quality_score: 0.5
      },
      {
        task_id: taskId,
        stem: '绩效管理是一个持续的循环过程。（ ）',
        options: {
          A: '正确',
          B: '错误'
        },
        correct_answer: 'A',
        question_type: '判断题',
        analysis: {
          textbook: '根据《第5届HR搏学考试辅导教材》第95页',
          explanation: '绩效管理包括绩效计划、绩效实施、绩效考核和绩效反馈四个环节，形成一个持续的循环过程',
          conclusion: '本题答案为正确'
        },
        knowledge_level: '全员掌握',
        difficulty: '易',
        quality_score: 0.6
      },
      {
        task_id: taskId,
        stem: '以下哪些属于人力资源规划的主要内容？（ ）',
        options: {
          A: '人力资源需求预测',
          B: '人力资源供给预测',
          C: '人力资源平衡分析',
          D: '薪酬福利设计'
        },
        correct_answer: 'ABC',
        question_type: '多选题',
        analysis: {
          textbook: '根据《第5届HR搏学考试辅导教材》第45页',
          explanation: '人力资源规划主要包括需求预测、供给预测和平衡分析三个核心内容，薪酬福利设计属于薪酬管理范畴',
          conclusion: '本题答案为ABC'
        },
        knowledge_level: '全员熟悉',
        difficulty: '中',
        quality_score: 0.4
      }
    ];

    // 批量插入数据
    const { data, error } = await supabase
      .from('questions')
      .insert(testQuestions)
      .select();

    if (error) {
      console.error('❌ 插入失败:', error);
      return;
    }

    console.log(`✅ 成功插入 ${data.length} 道测试试题`);
    
    // 验证插入结果
    const { data: allQuestions } = await supabase
      .from('questions')
      .select('*');

    console.log(`📊 当前试题总数量: ${allQuestions?.length || 0}`);

  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

// 运行插入
insertTestData();