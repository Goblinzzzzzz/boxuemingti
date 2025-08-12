import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 确保环境变量正确加载
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * AI服务 - 支持豆包和DeepSeek API
 * 
 * 使用说明：
 * 1. 在.env文件中配置API密钥
 * 2. 设置AI_PROVIDER环境变量选择服务商
 * 3. 调用generateQuestion方法生成试题
 */

// 试题生成参数
interface QuestionParams {
  content: string;           // 教材内容
  questionType: '单选题' | '多选题' | '判断题';
  difficulty: '易' | '中' | '难';
  knowledgePoint?: string;   // 知识点（可选）
}

// 生成的试题结构
interface Question {
  stem: string;              // 题干
  options: Record<string, string>;  // 选项（对象格式：{A: "选项内容", B: "选项内容"}）
  correct_answer: string;    // 正确答案
  analysis: {
    textbook: string;        // 教材原文
    explanation: string;     // 解析
    conclusion: string;      // 结论
  };
  quality_score: number;     // 质量评分
}

class AIService {
  private apiKey: string = '';
  private baseURL: string = '';
  private model: string = '';
  private provider: string = '';

  constructor() {
    this.initConfig();
  }

  /**
   * 初始化配置
   */
  private initConfig() {
    // 从环境变量获取AI服务商
    this.provider = process.env.AI_PROVIDER || 'doubao';
    
    if (this.provider === 'doubao') {
      // 豆包配置
      this.apiKey = process.env.DOUBAO_API_KEY || '';
      this.baseURL = 'https://ark.cn-beijing.volces.com/api/v3';
      this.model = process.env.DOUBAO_MODEL || 'ep-20241230140648-8xzpz';
    } else if (this.provider === 'deepseek') {
      // DeepSeek配置
      this.apiKey = process.env.DEEPSEEK_API_KEY || '';
      this.baseURL = 'https://api.deepseek.com';
      this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    } else if (this.provider === 'dmxapi') {
      // DMXAPI第三方配置 - 支持Claude、Gemini、Doubao、Qwen等模型
      this.apiKey = process.env.DMXAPI_API_KEY || '';
      this.baseURL = 'https://www.dmxapi.cn/v1';
      this.model = process.env.DMXAPI_MODEL || 'claude';
    } else if (this.provider === 'openai') {
      // OpenAI配置
      this.apiKey = process.env.OPENAI_API_KEY || '';
      this.baseURL = 'https://api.openai.com/v1';
      this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    }

    if (!this.apiKey) {
      console.warn(`⚠️  ${this.provider.toUpperCase()} API密钥未配置，将使用模拟数据`);
      console.log('请在.env文件中配置相应的API密钥：');
      if (this.provider === 'doubao') {
        console.log(`- 豆包: DOUBAO_API_KEY=your_api_key`);
      } else if (this.provider === 'deepseek') {
        console.log(`- DeepSeek: DEEPSEEK_API_KEY=your_api_key`);
      } else if (this.provider === 'dmxapi') {
        console.log(`- DMXAPI: DMXAPI_API_KEY=your_api_key`);
      } else {
        console.log(`- OpenAI: OPENAI_API_KEY=your_api_key`);
      }
    }
  }

  /**
   * 生成试题
   * @param params 试题参数
   * @returns 生成的试题
   */
  async generateQuestion(params: QuestionParams): Promise<Question> {
    // 如果没有API密钥，返回模拟数据
    if (!this.apiKey) {
      return this.createMockQuestion(params);
    }

    try {
      console.log(`开始生成试题，类型: ${params.questionType}，难度: ${params.difficulty}`);
      console.log(`使用AI服务: ${this.provider}，模型: ${this.model}`);

      // 构建请求数据
      const requestData = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '你是专业的HR考试命题专家，请根据教材内容生成高质量的考试题目，严格按照JSON格式返回。'
          },
          {
            role: 'user',
            content: this.buildPrompt(params)
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      };

      // 发送API请求
      const response = await this.callAPI(requestData);
      
      // 解析响应
      return this.parseResponse(response, params);
      
    } catch (error) {
      console.error(`❌ ${this.provider.toUpperCase()}生成试题失败:`, error);
      // 出错时返回模拟数据
      return this.createMockQuestion(params);
    }
  }

  /**
   * 调用AI API
   */
  private async callAPI(data: any): Promise<any> {
    console.log(`调用AI API: ${this.baseURL}/chat/completions`);
    console.log(`请求数据: ${JSON.stringify(data, null, 2).substring(0, 500)}...`);
    
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(data)
      });

      console.log(`API响应状态: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`API响应数据: ${JSON.stringify(result, null, 2).substring(0, 500)}...`);
      return result;
    } catch (error) {
      console.error(`调用AI API失败:`, error);
      throw error;
    }
  }

  /**
   * 构建AI提示词
   */
  private buildPrompt(params: QuestionParams): string {
    const { content, questionType, difficulty, knowledgePoint } = params;
    
    // 难度描述
    const difficultyMap = {
      '易': '简单，适合初学者',
      '中': '中等，需要理解分析',
      '难': '困难，需要综合运用'
    };

    // 题型格式和答案格式要求
    const typeMap = {
      '单选题': {
        description: '单选题，必须有且仅有4个选项（A、B、C、D），只有1个正确答案',
        optionFormat: '选项必须严格按照A、B、C、D的格式编排',
        answerFormat: '正确答案必须是单个字母：A、B、C或D'
      },
      '多选题': {
        description: '多选题，必须有4-5个选项（A、B、C、D、E），可能有2-4个正确答案',
        optionFormat: '选项必须严格按照A、B、C、D、E的格式编排',
        answerFormat: '正确答案必须是多个字母组合：如AB、ABC、ACD等（不含空格和分隔符）'
      },
      '判断题': {
        description: '判断题，必须有且仅有2个选项',
        optionFormat: '选项必须严格为：A. 正确  B. 错误',
        answerFormat: '正确答案必须是：A（表示正确）或B（表示错误）'
      }
    };

    // 截取教材内容的前1000字符作为上下文，避免token过多
    const materialContext = content.length > 1000 ? content.substring(0, 1000) + '...' : content;
    const currentType = typeMap[questionType];

    return `
你是专业的HR考试命题专家，请严格按照《第5届HR搏学考试辅导教材》的要求生成高质量试题。

📚 教材内容：
${materialContext}

📋 命题要求：
• 题型：${currentType.description}
• 难度：${difficultyMap[difficulty]}
${knowledgePoint ? `• 知识点：${knowledgePoint}` : ''}
• 必须基于上述教材内容设计考查题目
• 题干必须是原创的考查问题，不能直接引用教材原文
• 选项设计要有适当迷惑性
• 解析必须包含三段式格式

🎯 题干设计要求（严格执行）：
• 题干必须是完整的问句，以问号（？）结尾
• 题干应该是考查学生对教材知识点理解和应用的问题
• 不能直接复制教材中的句子或段落
• 可以设计情境题、概念辨析题、应用分析题等
• 题干要简洁明确，避免冗长的背景描述
• 禁止使用"以下说法正确的是"等模糊表述，要具体明确

🎯 选项格式要求（严格执行）：
• ${currentType.optionFormat}
• 选项内容要简洁明确，避免过长的描述
• 错误选项要有合理的迷惑性，但不能过于明显
• 所有选项长度应该相对均衡

🎯 正确答案格式要求（严格执行）：
• ${currentType.answerFormat}
• 答案必须与选项编号完全对应
• 不允许使用其他格式或符号

🎯 解析格式要求（严格按照规范）：
1. 教材原文：必须精准引用上述教材内容中与题目直接相关的原句或段落，注明"根据《第5届HR搏学考试辅导教材》"
2. 试题分析：用自己的话解释为什么正确答案是对的，其他选项为什么错误，说明干扰项的迷惑点
3. 答案结论：明确写出"【本题答案为 X】"

🎯 质量评分标准（0-100分）：
• 90-100分：题干规范（问号结尾）、选项格式正确、答案格式标准、解析完整准确
• 80-89分：基本符合要求，但可能存在1-2个小问题
• 70-79分：部分符合要求，存在格式或内容问题
• 60-69分：勉强合格，存在多个问题
• 60分以下：不合格，存在严重格式或内容错误

📝 请严格按照以下JSON格式返回：
{
  "stem": "完整的问句，必须以问号结尾",
  "options": ["A选项内容", "B选项内容", "C选项内容", "D选项内容"],
  "correct_answer": "${currentType.answerFormat.includes('单个字母') ? 'A' : currentType.answerFormat.includes('多个字母') ? 'AB' : 'A'}",
  "analysis": {
    "textbook": "教材原文：根据《第5届HR搏学考试辅导教材》，[具体引用上述教材内容中的相关原句]",
    "explanation": "试题分析：[详细解释正确答案的理由和其他选项的错误之处]",
    "conclusion": "【本题答案为 X】"
  },
  "quality_score": 90
}

⚠️ 重要提醒：
- 题干不能直接引用教材原文，必须是原创的考查问题
- textbook字段必须引用上述提供的具体教材内容，不能是泛泛而谈
- 不得使用"这是基于人力资源管理教材的模拟试题"等模糊表述
- 必须基于实际提供的教材内容进行命题
`;
  }

  /**
   * 解析AI响应
   */
  private parseResponse(response: any, params: QuestionParams): Question {
    try {
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI响应为空');
      }

      // 提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法找到JSON格式响应');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // 验证必需字段
      if (!parsed.stem || !parsed.options || !parsed.correct_answer) {
        throw new Error('响应缺少必需字段');
      }

      // 确保quality_score在0-1之间（数据库约束要求）
      let qualityScore = parsed.quality_score || 80;
      // 如果quality_score是0-100的范围，转换为0-1的范围
      if (qualityScore > 1) {
        qualityScore = qualityScore / 100;
      }
      // 确保在0-1范围内
      qualityScore = Math.max(0, Math.min(1, qualityScore));
      
      // 处理选项格式：将数组格式转换为对象格式
      let processedOptions: Record<string, string> = {};
      if (Array.isArray(parsed.options)) {
        // AI返回的是数组格式：["选项A内容", "选项B内容", "选项C内容", "选项D内容"]
        // 转换为对象格式：{A: "选项A内容", B: "选项B内容", C: "选项C内容", D: "选项D内容"}
        const optionLabels = ['A', 'B', 'C', 'D', 'E'];
        parsed.options.forEach((option: string, index: number) => {
          if (index < optionLabels.length) {
            processedOptions[optionLabels[index]] = option;
          }
        });
      } else if (typeof parsed.options === 'object' && parsed.options !== null) {
        // 如果已经是对象格式，直接使用
        processedOptions = parsed.options;
      }
      
      return {
        stem: parsed.stem,
        options: processedOptions,
        correct_answer: parsed.correct_answer,
        analysis: {
          textbook: parsed.analysis?.textbook || '',
          explanation: parsed.analysis?.explanation || '',
          conclusion: parsed.analysis?.conclusion || ''
        },
        quality_score: qualityScore
      };
      
    } catch (error) {
      console.error('解析AI响应失败:', error);
      return this.createMockQuestion(params);
    }
  }

  /**
   * 创建模拟试题（当AI服务不可用时）
   */
  private createMockQuestion(params: QuestionParams): Question {
    const { questionType, difficulty } = params;
    
    // 模拟试题模板 - 符合新的格式规范
    const templates = {
      '单选题': {
        stem: `人力资源管理在企业${difficulty === '易' ? '日常运营' : difficulty === '中' ? '战略发展' : '转型升级'}中的核心作用是什么？`,
        options: {
          A: '仅负责员工招聘和离职手续',
          B: '作为企业战略伙伴参与决策制定',
          C: '专门处理员工投诉和纠纷',
          D: '只负责薪酬发放和考勤管理'
        },
        correct_answer: 'B'
      },
      '多选题': {
        stem: '现代企业人力资源管理体系的核心模块包括哪些？',
        options: {
          A: '人力资源规划与预测',
          B: '招聘选拔与人才配置',
          C: '培训开发与能力提升',
          D: '绩效管理与激励机制',
          E: '薪酬福利与劳动关系'
        },
        correct_answer: 'ABCDE'
      },
      '判断题': {
        stem: '绩效管理的主要目的是为了淘汰不合格员工？',
        options: {
          A: '正确',
          B: '错误'
        },
        correct_answer: 'B'
      }
    };

    const template = templates[questionType];
    
    return {
      stem: template.stem,
      options: template.options,
      correct_answer: template.correct_answer,
      analysis: {
        textbook: '这是基于人力资源管理教材的模拟试题。',
        explanation: '此为模拟数据，实际使用时请配置AI服务。',
        conclusion: `正确答案是${template.correct_answer}。`
      },
      quality_score: (75 + Math.floor(Math.random() * 20)) / 100 // 0.75-0.95分
    };
  }

  /**
   * 批量生成试题
   * @param params 试题参数
   * @param count 生成数量
   * @param onProgress 进度回调
   */
  async generateBatchQuestions(
    params: QuestionParams,
    count: number,
    onProgress?: (progress: number) => void
  ): Promise<Question[]> {
    const questions: Question[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const question = await this.generateQuestion(params);
        questions.push(question);
        
        // 更新进度
        if (onProgress) {
          onProgress(Math.floor(((i + 1) / count) * 100));
        }
        
        // 避免API限制，添加延迟
        if (this.apiKey && i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`生成第${i + 1}道试题失败:`, error);
      }
    }
    
    return questions;
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      available: this.isAvailable(),
      provider: this.provider,
      model: this.model,
      hasApiKey: !!this.apiKey,
      message: this.apiKey ? 
        `✅ ${this.provider.toUpperCase()}服务已配置` : 
        `⚠️  ${this.provider.toUpperCase()}服务未配置，使用模拟数据`
    };
  }
}

// 导出服务实例
export const aiService = new AIService();
export default aiService;

// 导出类型
export type { QuestionParams, Question };