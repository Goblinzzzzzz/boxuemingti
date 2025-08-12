import fetch from 'node-fetch';

// 测试试题数据 - 匹配数据库结构
const testQuestions = [
  {
    stem: '以下哪个选项是正确的？',
    question_type: '单选题',
    difficulty: '易',
    options: [
      { text: '选项A', is_correct: true },
      { text: '选项B', is_correct: false },
      { text: '选项C', is_correct: false },
      { text: '选项D', is_correct: false }
    ],
    correct_answer: 'A',
    analysis: {
      content: '这是一道测试题。正确答案是A。解析内容需要包含三个部分：教材原文段、分析过程段、答案结论段。'
    },
    knowledge_level: '全员掌握'
  },
  {
    stem: '这是一道质量较差的试题',
    question_type: '单选题', 
    difficulty: '易',
    options: [
      { text: 'A', is_correct: true },
      { text: 'B', is_correct: false }
    ],
    correct_answer: 'A',
    analysis: {
      content: '解析太短'
    },
    knowledge_level: '全员了解'
  },
  {
    stem: '根据教材内容，以下关于某个概念的描述，哪个是正确的？',
    question_type: '单选题',
    difficulty: '中',
    options: [
      { text: '概念A是指某种特定的理论框架', is_correct: false },
      { text: '概念B是指某种实践方法', is_correct: true },
      { text: '概念C是指某种分析工具', is_correct: false },
      { text: '概念D是指某种评估标准', is_correct: false }
    ],
    correct_answer: 'B',
    analysis: {
      content: '【教材原文段】根据教材第三章的内容，概念B被定义为一种系统性的实践方法，它强调在具体操作中的应用价值。【分析过程段】通过对比四个选项，我们可以看出选项A描述的是理论框架，这与概念B的实践性质不符；选项C和D分别涉及分析工具和评估标准，都不是概念B的核心特征。只有选项B准确地概括了概念B作为实践方法的本质特征。【答案结论段】因此，正确答案是B，概念B是指某种实践方法。'
    },
    knowledge_level: '全员掌握'
  }
];

async function submitQuestions() {
  try {
    console.log('正在提交测试试题...');
    
    const response = await fetch('http://localhost:3003/api/review/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        questions: testQuestions,
        generationTaskId: null
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('提交成功:', result);
    return result;
  } catch (error) {
    console.error('提交失败:', error);
    throw error;
  }
}

async function getQuestions(status = 'pending') {
  try {
    console.log(`正在获取状态为 ${status} 的试题...`);
    
    // 根据状态选择正确的端点
    let endpoint = '/api/review/pending'; // ai_approved
    if (status === 'ai_reviewing') {
      endpoint = '/api/review/ai-pending'; // ai_reviewing
    } else if (status === 'ai_rejected') {
      endpoint = '/api/review/ai-rejected'; // ai_rejected
    }
    
    const response = await fetch(`http://localhost:3003${endpoint}?limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`找到 ${result.data.questions.length} 道 ${status} 状态的试题`);
    return result.data.questions;
  } catch (error) {
    console.error(`获取 ${status} 试题失败:`, error);
    return [];
  }
}

async function aiReviewQuestion(questionId) {
  try {
    console.log(`正在对试题 ${questionId} 进行AI审核...`);
    
    const response = await fetch(`http://localhost:3003/api/review/ai-review/${questionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`审核完成: ${result.data.status} (分数: ${result.data.qualityScore})`);
    if (result.data.issues && result.data.issues.length > 0) {
      console.log(`发现问题: ${result.data.issues.join(', ')}`);
    }
    return result;
  } catch (error) {
    console.error(`AI审核失败:`, error);
    throw error;
  }
}

async function checkAIRejectedQuestions() {
  try {
    console.log('\n正在检查AI审核未通过的试题...');
    
    const response = await fetch('http://localhost:3003/api/review/ai-rejected?limit=10', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`找到 ${result.data.questions.length} 道AI审核未通过的试题`);
    
    if (result.data.questions.length > 0) {
      console.log('\n=== AI审核未通过的试题详情 ===');
      result.data.questions.forEach((q, index) => {
        console.log(`${index + 1}. ID: ${q.id}`);
        console.log(`   题目: ${q.stem.substring(0, 50)}...`);
        console.log(`   状态: ${q.status}`);
        if (q.metadata?.ai_review?.issues) {
          console.log(`   问题: ${q.metadata.ai_review.issues.join(', ')}`);
        }
      });
    }
    
    return result.data.questions;
  } catch (error) {
    console.error('检查AI审核未通过试题失败:', error);
    return [];
  }
}

async function main() {
  try {
    console.log('=== 开始AI审核流程测试 ===\n');
    
    // 1. 提交测试试题
    await submitQuestions();
    
    // 2. 等待一秒确保数据插入完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. 获取待审核的试题（默认状态是ai_reviewing）
    const pendingQuestions = await getQuestions('ai-reviewing');
    
    if (pendingQuestions.length === 0) {
      console.log('没有找到待审核的试题');
      return;
    }
    
    // 4. 对每道试题进行AI审核
    console.log('\n=== 开始AI审核 ===');
    for (const question of pendingQuestions.slice(0, 3)) { // 只审核前3道
      await aiReviewQuestion(question.id);
      await new Promise(resolve => setTimeout(resolve, 500)); // 短暂延迟
    }
    
    // 5. 等待审核完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. 检查AI审核未通过的试题
    await checkAIRejectedQuestions();
    
    // 7. 检查AI审核通过的试题
    const approvedQuestions = await getQuestions('ai-approved');
    console.log(`\n找到 ${approvedQuestions.length} 道AI审核通过的试题`);
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
main();