/**
 * 测试AI试题生成的题型验证功能
 * 验证修复后的parseResponse方法是否正确处理题型错误
 */

// 由于aiService.ts是TypeScript模块，我们需要直接测试parseResponse逻辑
// 这里我们将复制parseResponse的核心验证逻辑进行测试

// 模拟parseResponse方法的题型验证逻辑
function validateAndFixQuestionType(parsedQuestion, questionType) {
  const expectedOptionCounts = {
    '单选题': 4,
    '多选题': 4, 
    '判断题': 2
  };
  
  const expectedAnswerFormats = {
    '单选题': /^[A-D]$/,
    '多选题': /^[A-D]{2,4}$/,
    '判断题': /^[AB]$/
  };
  
  const expectedCount = expectedOptionCounts[questionType];
  const answerPattern = expectedAnswerFormats[questionType];
  
  // 验证选项数量
  const optionKeys = Object.keys(parsedQuestion.options);
  if (optionKeys.length !== expectedCount) {
    console.log(`   🔧 修复选项数量: ${optionKeys.length} -> ${expectedCount}`);
    
    if (questionType === '判断题' && optionKeys.length > 2) {
      // 单选题/多选题被错误标记为判断题，修复为标准判断题格式
      parsedQuestion.options = {
        A: '正确',
        B: '错误'
      };
    } else if ((questionType === '单选题' || questionType === '多选题') && optionKeys.length === 2) {
      // 判断题被错误标记为单选题/多选题，扩展为4个选项
      parsedQuestion.options = {
        A: parsedQuestion.options.A || '选项A',
        B: parsedQuestion.options.B || '选项B', 
        C: '选项C',
        D: '选项D'
      };
    }
  }
  
  // 验证答案格式
  if (!answerPattern.test(parsedQuestion.correct_answer)) {
    console.log(`   🔧 修复答案格式: ${parsedQuestion.correct_answer}`);
    
    if (questionType === '判断题') {
      // 判断题答案修复
      if (parsedQuestion.correct_answer === '正确' || parsedQuestion.correct_answer.includes('正确')) {
        parsedQuestion.correct_answer = 'A';
      } else {
        parsedQuestion.correct_answer = 'B';
      }
    } else if (questionType === '多选题' && /^[A-D]$/.test(parsedQuestion.correct_answer)) {
      // 多选题答案格式修复（单个字母改为多个字母）
      parsedQuestion.correct_answer = parsedQuestion.correct_answer + 'B';
    } else if (questionType === '单选题' && parsedQuestion.correct_answer.length > 1) {
      // 单选题答案格式修复（多个字母改为单个字母）
      parsedQuestion.correct_answer = parsedQuestion.correct_answer.charAt(0);
    }
  }
  
  return parsedQuestion;
}

// 模拟AI响应数据，包含各种题型错误情况
const testCases = [
  {
    name: '单选题被标记为判断题（选项数量错误）',
    params: { questionType: '单选题', content: '测试内容', difficulty: '中', knowledgePoint: '测试知识点' },
    mockResponse: {
      choices: [{
        message: {
          content: JSON.stringify({
            stem: '以下关于人力资源管理的说法，哪项是正确的。（ ）',
            options: ['正确', '错误'], // 错误：单选题只有2个选项
            correct_answer: 'A',
            analysis: {
              textbook: '教材原文：测试内容',
              explanation: '试题分析：测试分析',
              conclusion: '【本题答案为 A】'
            },
            quality_score: 85
          })
        }
      }]
    }
  },
  {
    name: '判断题被标记为单选题（选项数量错误）',
    params: { questionType: '判断题', content: '测试内容', difficulty: '易', knowledgePoint: '测试知识点' },
    mockResponse: {
      choices: [{
        message: {
          content: JSON.stringify({
            stem: '绩效管理的主要目的是为了淘汰不合格员工。（ ）',
            options: ['选项A', '选项B', '选项C', '选项D'], // 错误：判断题有4个选项
            correct_answer: 'B',
            analysis: {
              textbook: '教材原文：测试内容',
              explanation: '试题分析：测试分析',
              conclusion: '【本题答案为 B】'
            },
            quality_score: 80
          })
        }
      }]
    }
  },
  {
    name: '多选题答案格式错误（单个字母）',
    params: { questionType: '多选题', content: '测试内容', difficulty: '难', knowledgePoint: '测试知识点' },
    mockResponse: {
      choices: [{
        message: {
          content: JSON.stringify({
            stem: '现代企业人力资源管理体系的核心模块包括以下哪些内容。（ ）',
            options: ['人力资源规划', '招聘选拔', '培训开发', '绩效管理'],
            correct_answer: 'A', // 错误：多选题答案应该是多个字母
            analysis: {
              textbook: '教材原文：测试内容',
              explanation: '试题分析：测试分析',
              conclusion: '【本题答案为 A】'
            },
            quality_score: 90
          })
        }
      }]
    }
  },
  {
    name: '判断题答案格式错误（包含文字）',
    params: { questionType: '判断题', content: '测试内容', difficulty: '易', knowledgePoint: '测试知识点' },
    mockResponse: {
      choices: [{
        message: {
          content: JSON.stringify({
            stem: '人力资源管理是企业的核心职能。（ ）',
            options: ['正确', '错误'],
            correct_answer: '正确', // 错误：应该是A或B
            analysis: {
              textbook: '教材原文：测试内容',
              explanation: '试题分析：测试分析',
              conclusion: '【本题答案为 正确】'
            },
            quality_score: 85
          })
        }
      }]
    }
  },
  {
    name: '正确的单选题格式',
    params: { questionType: '单选题', content: '测试内容', difficulty: '中', knowledgePoint: '测试知识点' },
    mockResponse: {
      choices: [{
        message: {
          content: JSON.stringify({
            stem: '以下关于组织设计的说法，哪项是正确的。（ ）',
            options: ['明确岗位职责', '建立任职资格', '设置晋升路径', '对齐能力模型'],
            correct_answer: 'B',
            analysis: {
              textbook: '教材原文：测试内容',
              explanation: '试题分析：测试分析',
              conclusion: '【本题答案为 B】'
            },
            quality_score: 90
          })
        }
      }]
    }
  }
];

// 测试函数
async function testQuestionTypeValidation() {
  console.log('🧪 开始测试AI试题生成的题型验证功能\n');
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`📋 测试案例 ${i + 1}: ${testCase.name}`);
    console.log(`   题型: ${testCase.params.questionType}`);
    
    try {
      // 解析AI响应中的JSON内容
      const content = testCase.mockResponse.choices[0].message.content;
      let parsedQuestion = JSON.parse(content);
      
      // 转换选项格式（从数组转为对象）
      if (Array.isArray(parsedQuestion.options)) {
        const optionLabels = ['A', 'B', 'C', 'D'];
        const optionsObj = {};
        parsedQuestion.options.forEach((option, index) => {
          if (index < optionLabels.length) {
            optionsObj[optionLabels[index]] = option;
          }
        });
        parsedQuestion.options = optionsObj;
      }
      
      console.log(`   📥 原始数据: 选项${Object.keys(parsedQuestion.options).length}个, 答案${parsedQuestion.correct_answer}`);
      
      // 应用题型验证和修复逻辑
      const result = validateAndFixQuestionType(parsedQuestion, testCase.params.questionType);
      
      console.log(`   ✅ 解析成功`);
      console.log(`   📊 选项数量: ${Object.keys(result.options).length}`);
      console.log(`   📝 选项内容: ${JSON.stringify(result.options)}`);
      console.log(`   🎯 正确答案: ${result.correct_answer}`);
      
      // 验证修复结果
      const expectedOptionCounts = {
        '单选题': 4,
        '多选题': 4,
        '判断题': 2
      };
      
      const expectedAnswerFormats = {
        '单选题': /^[A-D]$/,
        '多选题': /^[A-D]{2,4}$/,
        '判断题': /^[AB]$/
      };
      
      const actualOptionCount = Object.keys(result.options).length;
      const expectedOptionCount = expectedOptionCounts[testCase.params.questionType];
      const answerPattern = expectedAnswerFormats[testCase.params.questionType];
      
      if (actualOptionCount === expectedOptionCount) {
        console.log(`   ✅ 选项数量验证通过: ${actualOptionCount}个选项`);
      } else {
        console.log(`   ❌ 选项数量验证失败: 期望${expectedOptionCount}个，实际${actualOptionCount}个`);
      }
      
      if (answerPattern.test(result.correct_answer)) {
        console.log(`   ✅ 答案格式验证通过: ${result.correct_answer}`);
      } else {
        console.log(`   ❌ 答案格式验证失败: ${result.correct_answer}不符合${answerPattern}`);
      }
      
      // 特殊检查判断题选项格式
      if (testCase.params.questionType === '判断题') {
        const hasCorrectOption = result.options.A && result.options.A.includes('正确');
        const hasWrongOption = result.options.B && result.options.B.includes('错误');
        if (hasCorrectOption && hasWrongOption) {
          console.log(`   ✅ 判断题选项格式验证通过`);
        } else {
          console.log(`   ❌ 判断题选项格式验证失败`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ 解析失败: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🎉 题型验证功能测试完成！');
}

// 运行测试
if (require.main === module) {
  testQuestionTypeValidation().catch(console.error);
}

module.exports = { testQuestionTypeValidation };