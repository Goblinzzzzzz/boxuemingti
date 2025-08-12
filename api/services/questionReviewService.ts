/**
 * 试题自动审核服务
 * 根据《第五届HR搏学命题要求规范》进行AI自动审核
 */

import fs from 'fs';
import path from 'path';

interface Question {
  id: string;
  stem: string;
  options: any;
  correct_answer: string;
  question_type: string;
  analysis: any;
  quality_score: number;
}

interface ReviewResult {
  score: number; // 0-100分
  passed: boolean; // 是否通过自动审核
  issues: ReviewIssue[];
  suggestions: string[];
}

interface ReviewIssue {
  type: 'error' | 'warning';
  category: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export class QuestionReviewService {
  private static guidelineContent: string | null = null;

  /**
   * 读取规范文档内容
   */
  private static loadGuidelines(): string {
    if (this.guidelineContent) {
      return this.guidelineContent;
    }

    try {
      const guidelinePath = path.join(process.cwd(), '规范.md');
      this.guidelineContent = fs.readFileSync(guidelinePath, 'utf-8');
      return this.guidelineContent;
    } catch (error) {
      console.error('无法读取规范文档:', error);
      return '';
    }
  }

  /**
   * 对试题进行自动审核
   */
  async reviewQuestion(question: Question): Promise<ReviewResult> {
    const issues: ReviewIssue[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // 1. 题干规范性检查
    const stemIssues = this.checkStemCompliance(question);
    issues.push(...stemIssues);
    score -= stemIssues.filter(i => i.severity === 'high').length * 15;
    score -= stemIssues.filter(i => i.severity === 'medium').length * 8;
    score -= stemIssues.filter(i => i.severity === 'low').length * 3;

    // 2. 选项规范性检查
    const optionIssues = this.checkOptionsCompliance(question);
    issues.push(...optionIssues);
    score -= optionIssues.filter(i => i.severity === 'high').length * 12;
    score -= optionIssues.filter(i => i.severity === 'medium').length * 6;
    score -= optionIssues.filter(i => i.severity === 'low').length * 2;

    // 3. 解析规范性检查
    const analysisIssues = this.checkAnalysisCompliance(question);
    issues.push(...analysisIssues);
    score -= analysisIssues.filter(i => i.severity === 'high').length * 10;
    score -= analysisIssues.filter(i => i.severity === 'medium').length * 5;
    score -= analysisIssues.filter(i => i.severity === 'low').length * 2;

    // 4. 生成改进建议
    suggestions.push(...this.generateSuggestions(issues));

    // 确保分数在0-100范围内
    score = Math.max(0, Math.min(100, score));

    // 通过标准：分数>=70且无高严重性错误
    const passed = score >= 70 && !issues.some(i => i.severity === 'high');

    return {
      score,
      passed,
      issues,
      suggestions
    };
  }

  /**
   * 检查题干规范性
   */
  private checkStemCompliance(question: Question): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const stem = question.stem.trim();

    // 1. 题干不能为空
    if (!stem) {
      issues.push({
        type: 'error',
        category: '题干规范',
        description: '题干不能为空',
        severity: 'high'
      });
      return issues;
    }

    // 2. 句式结构检查
    if (question.question_type === '判断题') {
      if (!stem.endsWith('。（ ）')) {
        issues.push({
          type: 'error',
          category: '题干格式',
          description: '判断题题干应以"。（ ）"结尾',
          severity: 'high'
        });
      }
    } else if (question.question_type === '单选题' || question.question_type === '多选题') {
      if (!stem.includes('？（ ）') && !stem.includes('?（ ）')) {
        issues.push({
          type: 'error',
          category: '题干格式',
          description: '选择题题干应以"？（ ）"结尾',
          severity: 'high'
        });
      }
    }

    // 3. 长度检查
    if (stem.length < 15) {
      issues.push({
        type: 'warning',
        category: '题干内容',
        description: '题干内容过短，建议完善描述',
        severity: 'medium'
      });
    }

    if (stem.length > 120) {
      issues.push({
        type: 'warning',
        category: '题干内容',
        description: '题干过长，建议控制在40字以内',
        severity: 'medium'
      });
    }

    // 4. 语言规范检查
    const problematicPhrases = ['可能', '一定程度上', '或许', '部分情况', '不一定不是'];
    for (const phrase of problematicPhrases) {
      if (stem.includes(phrase)) {
        issues.push({
          type: 'warning',
          category: '语言表达',
          description: `避免使用模糊表达"${phrase}"`,
          severity: 'medium'
        });
      }
    }

    // 5. 双重否定检查
    if (stem.includes('不是不') || stem.includes('不能不') || stem.includes('不会不')) {
      issues.push({
        type: 'warning',
        category: '语言表达',
        description: '避免使用双重否定结构',
        severity: 'medium'
      });
    }

    return issues;
  }

  /**
   * 检查选项规范性
   */
  private checkOptionsCompliance(question: Question): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const options = question.options;

    if (!options || typeof options !== 'object') {
      issues.push({
        type: 'error',
        category: '选项结构',
        description: '选项格式错误',
        severity: 'high'
      });
      return issues;
    }

    const optionKeys = Object.keys(options);
    const optionValues = Object.values(options) as string[];

    // 1. 选项数量检查
    if (question.question_type === '判断题' && optionKeys.length !== 2) {
      issues.push({
        type: 'error',
        category: '选项数量',
        description: '判断题应有2个选项',
        severity: 'high'
      });
    } else if ((question.question_type === '单选题' || question.question_type === '多选题') && optionKeys.length !== 4) {
      issues.push({
        type: 'error',
        category: '选项数量',
        description: '选择题应有4个选项',
        severity: 'high'
      });
    }

    // 2. 选项长度检查
    for (const [key, value] of Object.entries(options)) {
      const optionText = value as string;
      if (optionText.length < 2) {
        issues.push({
          type: 'warning',
          category: '选项内容',
          description: `选项${key}内容过短`,
          severity: 'low'
        });
      }
      if (optionText.length > 60) {
        issues.push({
          type: 'warning',
          category: '选项内容',
          description: `选项${key}过长，建议控制在12-20字`,
          severity: 'medium'
        });
      }
    }

    // 3. 选项结构一致性检查
    const optionLengths = optionValues.map(v => v.length);
    const avgLength = optionLengths.reduce((a, b) => a + b, 0) / optionLengths.length;
    const hasInconsistentLength = optionLengths.some(len => Math.abs(len - avgLength) > avgLength * 0.5);
    
    if (hasInconsistentLength) {
      issues.push({
        type: 'warning',
        category: '选项结构',
        description: '选项长度差异较大，建议保持结构一致',
        severity: 'low'
      });
    }

    // 4. 正确答案检查
    if (!question.correct_answer || !optionKeys.includes(question.correct_answer)) {
      issues.push({
        type: 'error',
        category: '正确答案',
        description: '正确答案不在选项范围内',
        severity: 'high'
      });
    }

    return issues;
  }

  /**
   * 检查解析规范性
   */
  private checkAnalysisCompliance(question: Question): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const analysis = question.analysis;

    if (!analysis || typeof analysis !== 'object') {
      issues.push({
        type: 'error',
        category: '解析结构',
        description: '解析格式错误',
        severity: 'high'
      });
      return issues;
    }

    // 1. 三段式解析检查
    const requiredFields = ['textbook', 'explanation', 'conclusion'];
    for (const field of requiredFields) {
      if (!analysis[field] || typeof analysis[field] !== 'string' || analysis[field].trim().length === 0) {
        issues.push({
          type: 'error',
          category: '解析完整性',
          description: `缺少${field === 'textbook' ? '教材原文' : field === 'explanation' ? '试题分析' : '答案结论'}段`,
          severity: 'high'
        });
      }
    }

    // 2. 教材原文段检查
    if (analysis.textbook) {
      const textbook = analysis.textbook.trim();
      if (!textbook.includes('第5届HR搏学考试辅导教材') && !textbook.includes('教材')) {
        issues.push({
          type: 'warning',
          category: '教材引用',
          description: '教材原文段应明确引用教材名称',
          severity: 'medium'
        });
      }
      
      if (!textbook.includes('页')) {
        issues.push({
          type: 'warning',
          category: '教材引用',
          description: '教材原文段应注明页码',
          severity: 'medium'
        });
      }
    }

    // 3. 答案结论段检查
    if (analysis.conclusion) {
      const conclusion = analysis.conclusion.trim();
      const expectedAnswer = `本题答案为 ${question.correct_answer}`;
      if (!conclusion.includes(expectedAnswer) && !conclusion.includes(`答案为${question.correct_answer}`)) {
        issues.push({
          type: 'warning',
          category: '答案结论',
          description: '答案结论段格式不规范，应明确写出"本题答案为 X"',
          severity: 'medium'
        });
      }
    }

    // 4. 解析长度检查
    const totalLength = (analysis.textbook || '').length + (analysis.explanation || '').length + (analysis.conclusion || '').length;
    if (totalLength > 900) {
      issues.push({
        type: 'warning',
        category: '解析长度',
        description: '解析总长度过长，建议控制在300字以内',
        severity: 'low'
      });
    }

    return issues;
  }

  /**
   * 生成改进建议
   */
  private generateSuggestions(issues: ReviewIssue[]): string[] {
    const suggestions: string[] = [];
    
    const errorCategories = [...new Set(issues.filter(i => i.type === 'error').map(i => i.category))];
    const warningCategories = [...new Set(issues.filter(i => i.type === 'warning').map(i => i.category))];

    if (errorCategories.includes('题干格式')) {
      suggestions.push('请检查题干格式，确保符合规范要求的句式结构和标点符号');
    }

    if (errorCategories.includes('选项数量') || errorCategories.includes('选项结构')) {
      suggestions.push('请检查选项设置，确保数量正确且结构规范');
    }

    if (errorCategories.includes('解析完整性')) {
      suggestions.push('请完善解析内容，确保包含教材原文、试题分析、答案结论三个部分');
    }

    if (warningCategories.includes('语言表达')) {
      suggestions.push('建议优化语言表达，避免使用模糊词汇和双重否定');
    }

    if (warningCategories.includes('选项内容')) {
      suggestions.push('建议调整选项长度，保持12-20字的合理范围');
    }

    if (warningCategories.includes('教材引用')) {
      suggestions.push('建议完善教材引用，明确标注教材名称和页码');
    }

    return suggestions;
  }

  /**
   * 批量审核试题
   */
  async batchReviewQuestions(questions: Question[]): Promise<Map<string, ReviewResult>> {
    const results = new Map<string, ReviewResult>();
    
    for (const question of questions) {
      try {
        const result = await this.reviewQuestion(question);
        results.set(question.id, result);
      } catch (error) {
        console.error(`审核试题 ${question.id} 失败:`, error);
        results.set(question.id, {
          score: 0,
          passed: false,
          issues: [{
            type: 'error',
            category: '系统错误',
            description: '自动审核失败',
            severity: 'high'
          }],
          suggestions: ['请联系管理员检查系统状态']
        });
      }
    }
    
    return results;
  }
}

export const questionReviewService = new QuestionReviewService();