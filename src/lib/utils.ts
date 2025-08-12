import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 格式化日期
export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 截断文本
export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 验证试题规范
export function validateQuestion(question: {
  stem: string
  options: string[]
  correct_answer: string
  question_type: string
}) {
  const errors: string[] = []
  
  // 题干检查
  if (!question.stem.trim()) {
    errors.push('题干不能为空')
  } else if (question.stem.length < 10) {
    errors.push('题干内容过短，建议至少10个字符')
  }
  
  // 选项检查
  if (question.question_type !== '判断题') {
    if (question.options.length < 2) {
      errors.push('选择题至少需要2个选项')
    }
    
    const validOptions = question.options.filter(opt => opt.trim())
    if (validOptions.length !== question.options.length) {
      errors.push('所有选项都不能为空')
    }
    
    // 检查选项重复
    const uniqueOptions = new Set(question.options.map(opt => opt.trim().toLowerCase()))
    if (uniqueOptions.size !== question.options.length) {
      errors.push('选项内容不能重复')
    }
  }
  
  // 答案检查
  if (!question.correct_answer.trim()) {
    errors.push('必须设置正确答案')
  } else if (question.question_type === '单选题' && question.correct_answer.length > 1) {
    errors.push('单选题只能有一个正确答案')
  } else if (question.question_type === '多选题' && question.correct_answer.length < 2) {
    errors.push('多选题至少需要两个正确答案')
  } else if (question.question_type === '判断题' && !['对', '错', '正确', '错误'].includes(question.correct_answer)) {
    errors.push('判断题答案只能是"对"或"错"')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}