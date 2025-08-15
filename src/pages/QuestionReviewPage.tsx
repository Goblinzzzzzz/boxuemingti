import React, { useState, useEffect } from 'react'
import { Search, CheckCircle, AlertTriangle, XCircle, RefreshCw, Edit, Save, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface GeneratedQuestion {
  id: string
  type: string
  knowledgeLevel?: string
  difficulty?: string
  stem: string
  options: { [key: string]: string }
  correctAnswer: string
  analysis?: {
    textbook?: string
    explanation?: string
    conclusion?: string
  }
  qualityScore?: number
  status?: 'ai_reviewing' | 'ai_approved' | 'ai_rejected' | 'pending' | 'approved' | 'rejected'
  issues?: string[]
  knowledge_points?: string[]
  created_at?: string
  material_id?: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  suggestions: string[]
}

// 模拟AI生成的试题数据
const mockQuestions: GeneratedQuestion[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    type: '单选题',
    knowledgeLevel: 'HR掌握',
    stem: '以下关于岗位价值评估的说法，哪项是正确的？（ ）',
    options: {
      A: '主要考虑岗位稀缺性',
      B: '以对组织目标的贡献为基础',
      C: '重点关注员工满意度',
      D: '依据薪资高低判断'
    },
    correctAnswer: 'B',
    analysis: {
      textbook: '根据《第5届HR搏学考试辅导教材》第82页',
      explanation: '岗位价值评估的核心在于评估岗位对组织目标实现的贡献程度，而不是简单的稀缺性或薪资水平',
      conclusion: '本题答案为B'
    },
    qualityScore: 0.95,
    status: 'pending',
    issues: ['题干表述清晰', '选项设计合理']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    type: '判断题',
    knowledgeLevel: '全员掌握',
    stem: '绩效管理是一个持续的循环过程。（ ）',
    options: {
      A: '正确',
      B: '错误'
    },
    correctAnswer: 'A',
    analysis: {
      textbook: '根据《第5届HR搏学考试辅导教材》第95页',
      explanation: '绩效管理包括绩效计划、绩效实施、绩效考核和绩效反馈四个环节，形成一个持续的循环过程',
      conclusion: '本题答案为正确'
    },
    qualityScore: 0.88,
    status: 'pending',
    issues: ['解析可以更详细']
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    type: '多选题',
    knowledgeLevel: '全员熟悉',
    stem: '以下哪些属于人力资源规划的主要内容？（ ）',
    options: {
      A: '人力资源需求预测',
      B: '人力资源供给预测',
      C: '人力资源平衡分析',
      D: '薪酬福利设计'
    },
    correctAnswer: 'ABC',
    analysis: {
      textbook: '根据《第5届HR搏学考试辅导教材》第45页',
      explanation: '人力资源规划主要包括需求预测、供给预测和平衡分析三个核心内容，薪酬福利设计属于薪酬管理范畴',
      conclusion: '本题答案为ABC'
    },
    qualityScore: 0.82,
    status: 'pending',
    issues: ['选项D可能存在干扰性不足的问题']
  }
]

// AI生成试题的规范检查规则
const validateAIQuestion = (question: GeneratedQuestion): ValidationResult => {
  const errors: string[] = []
  const suggestions: string[] = []

  // 题干检查
  if (!question.stem.trim()) {
    errors.push('题干不能为空')
  } else {
    if (!question.stem.includes('？') && !question.stem.includes('?') && !question.stem.includes('（ ）')) {
      errors.push('题干格式不规范')
      suggestions.push('单选题和多选题应以"（ ）"结尾，判断题应以"（ ）"结尾')
    }
    if (question.stem.length < 15) {
      errors.push('题干内容过短')
      suggestions.push('建议完善题干描述，确保表述清晰明确')
    }
  }

  // 选项检查
  const optionKeys = Object.keys(question.options)
  if (optionKeys.length === 0) {
    errors.push('选项不能为空')
  } else {
    // 检查选项标识规范性
    if (question.type === '判断题') {
      if (!optionKeys.includes('A') || !optionKeys.includes('B')) {
        errors.push('判断题选项应为A、B')
        suggestions.push('判断题选项应设置为A: 正确, B: 错误')
      }
    } else {
      const expectedKeys = ['A', 'B', 'C', 'D'].slice(0, optionKeys.length)
      if (!expectedKeys.every(key => optionKeys.includes(key))) {
        errors.push('选项标识不规范')
        suggestions.push('选项应按A、B、C、D顺序标识')
      }
    }

    // 检查选项内容
    const optionValues = Object.values(question.options)
    const emptyOptions = optionValues.filter(opt => {
      // 选项值现在都是字符串类型
      return !opt.trim()
    })
    if (emptyOptions.length > 0) {
      errors.push(`存在 ${emptyOptions.length} 个空选项`)
    }
  }

  // 答案检查
  if (!question.correctAnswer) {
    errors.push('未设置正确答案')
  } else {
    if (question.type === '多选题' && question.correctAnswer.length < 2) {
      errors.push('多选题应至少有两个正确答案')
    }
  }

  // 解析检查
  if (!question.analysis || !question.analysis.textbook || !question.analysis.textbook.trim()) {
    errors.push('缺少教材依据')
    suggestions.push('请在解析中添加教材页码和相关内容')
  }
  if (!question.analysis || !question.analysis.explanation || !question.analysis.explanation.trim()) {
    errors.push('缺少解题思路')
    suggestions.push('请在解析中添加详细的解题分析')
  }
  if (!question.analysis || !question.analysis.conclusion || !question.analysis.conclusion.trim()) {
    errors.push('缺少答案确认')
    suggestions.push('请在解析中明确说明正确答案')
  }

  // 质量评分检查
  if (question.qualityScore && question.qualityScore < 0.8) {
    errors.push('AI质量评分偏低')
    suggestions.push('建议人工审核并优化试题内容')
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  }
}

export default function QuestionReviewPage() {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedQuestion, setSelectedQuestion] = useState<GeneratedQuestion | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'ai_reviewing' | 'ai_approved' | 'ai_rejected' | 'pending' | 'approved' | 'rejected'>('ai_reviewing')
  const [activeTab, setActiveTab] = useState<'ai_reviewing' | 'ai_approved' | 'ai_rejected'>('ai_reviewing')
  const [filterKnowledgeLevel, setFilterKnowledgeLevel] = useState<string>('all')
  const [isEditing, setIsEditing] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<GeneratedQuestion | null>(null)
  const [saving, setSaving] = useState(false)
  const [batchReviewing, setBatchReviewing] = useState(false)

  // 获取试题列表
  useEffect(() => {
    fetchQuestions()
  }, [])

  // 当切换标签页时重新获取数据
  useEffect(() => {
    fetchQuestions(activeTab)
  }, [activeTab])

  // 切换标签页
  const handleTabChange = (tab: 'ai_reviewing' | 'ai_approved' | 'ai_rejected') => {
    setActiveTab(tab)
    setFilterStatus(tab)
  }

  const fetchQuestions = async (status: 'ai_reviewing' | 'ai_approved' | 'ai_rejected' = activeTab) => {
    try {
      setLoading(true)
      // 根据状态获取不同的试题
      let endpoint = '/api/review/ai-pending' // ai_reviewing
      if (status === 'ai_approved') {
        endpoint = '/api/review/pending' // ai_approved
      } else if (status === 'ai_rejected') {
        endpoint = '/api/review/ai-rejected' // ai_rejected
      }
      
      const token = localStorage.getItem('access_token')
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const result = await response.json()
        console.log('API返回数据:', result)
        
        // 适配后端返回的数据结构
        let questionsData = []
        if (result.success && result.data) {
          // 后端返回的结构是 { success: true, data: { questions: [...], pagination: {...} } }
          questionsData = result.data.questions || []
        } else if (Array.isArray(result.data)) {
          // 如果data直接是数组
          questionsData = result.data
        } else if (Array.isArray(result)) {
          // 如果直接返回数组
          questionsData = result
        }
        
        // 映射后端字段到前端字段
        const mappedQuestionsData = questionsData.map((question: any) => ({
          ...question,
          // 映射correct_answer到correctAnswer
          correctAnswer: question.correct_answer || question.correctAnswer,
          // 映射question_type到type
          type: question.question_type || question.type,
          // 确保options是对象格式
          options: question.options || {}
        }))
        
        const safeQuestionsData = Array.isArray(mappedQuestionsData) ? mappedQuestionsData : []
        console.log('处理后的试题数据:', safeQuestionsData.length, '条')
        
        // 添加调试信息，特别是对AI审核未通过的试题
        if (status === 'ai_rejected') {
          console.log('AI审核未通过试题详情:', {
            总数: safeQuestionsData.length,
            试题状态: safeQuestionsData.map(q => ({ id: q.id, status: q.status, quality_score: q.quality_score })),
            API端点: endpoint,
            原始响应: result
          })
          if (safeQuestionsData.length === 0) {
            toast.info('当前没有AI审核未通过的试题。如果您刚刚进行了AI审核，请检查试题是否都通过了审核。')
          } else {
            toast.success(`找到 ${safeQuestionsData.length} 道AI审核未通过的试题`)
          }
        } else {
          setQuestions(safeQuestionsData)
          if (safeQuestionsData.length === 0) {
            console.log('当前没有待审核试题')
            toast.info('当前没有待审核试题')
          } else {
            toast.success(`加载了 ${safeQuestionsData.length} 道待审核试题`)
          }
        }
        
        setQuestions(safeQuestionsData)
      } else {
        console.warn('API响应失败')
        setQuestions([])
        toast.error('获取待审核试题失败')
      }
    } catch (error) {
      console.error('获取试题列表失败:', error)
      setQuestions([])
      toast.error('获取试题列表失败')
    } finally {
      setLoading(false)
    }
  }

  // AI自动审核试题
  const handleCheck = async (question: GeneratedQuestion) => {
    setChecking(true)
    setSelectedQuestion(question)
    
    // 先显示本地验证结果，确保与左侧列表显示一致
    const localValidation = validateAIQuestion(question)
    setValidationResult(localValidation)
    
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/review/ai-review/${question.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setValidationResult({
          isValid: result.isValid,
          errors: result.issues?.filter((issue: any) => issue.severity === 'error').map((issue: any) => issue.message) || [],
          suggestions: result.suggestions || []
        })
        
        // 更新试题的AI审核结果
        setQuestions(prev => {
          const safePrev = Array.isArray(prev) ? prev : []
          return safePrev.map(q => 
            q.id === question.id ? { 
              ...q, 
              qualityScore: result.qualityScore,
              issues: result.issues?.map((issue: any) => issue.message) || []
            } : q
          )
        })
        
        toast.success('AI审核完成')
      } else {
        // 如果API调用失败，使用本地验证作为备选
        const result = validateAIQuestion(question)
        setValidationResult(result)
        toast.warning('AI审核服务暂不可用，使用本地验证')
      }
    } catch (error) {
      console.error('AI审核失败:', error)
      // 使用本地验证作为备选
      const result = validateAIQuestion(question)
      setValidationResult(result)
      toast.error('AI审核失败，使用本地验证')
    } finally {
      setChecking(false)
    }
  }

  // 批量AI审核
  const handleBatchReview = async () => {
    setBatchReviewing(true)
    
    try {
      const pendingQuestions = questions.filter(q => q.status === 'ai_approved')
      const questionIds = pendingQuestions.map(q => q.id)
      
      if (questionIds.length === 0) {
        toast.warning('没有待审核的试题')
        return
      }

      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/review/batch-ai-review', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionIds })
      })

      if (response.ok) {
        const results = await response.json()
        
        // 更新试题的AI审核结果
        setQuestions(prev => {
          const safePrev = Array.isArray(prev) ? prev : []
          return safePrev.map(q => {
            const result = results.find((r: any) => r.questionId === q.id)
            if (result) {
              return {
                ...q,
                qualityScore: result.qualityScore,
                issues: result.issues?.map((issue: any) => issue.message) || []
              }
            }
            return q
          })
        })
        
        toast.success(`批量AI审核完成，共审核 ${questionIds.length} 道试题`)
      } else {
        // 如果API调用失败，使用本地验证作为备选
        const localResults = pendingQuestions.map(question => {
          const result = validateAIQuestion(question)
          return {
            questionId: question.id,
            qualityScore: result.isValid ? 0.8 : 0.4,
            issues: result.errors
          }
        })
        
        // 更新试题的本地验证结果
        setQuestions(prev => {
          const safePrev = Array.isArray(prev) ? prev : []
          return safePrev.map(q => {
            const result = localResults.find(r => r.questionId === q.id)
            if (result) {
              return {
                ...q,
                qualityScore: result.qualityScore,
                issues: result.issues || []
              }
            }
            return q
          })
        })
        
        toast.warning('AI审核服务暂不可用，使用本地验证')
      }
    } catch (error) {
      console.error('批量AI审核失败:', error)
      
      // 使用本地验证作为备选
      const pendingQuestions = questions.filter(q => q.status === 'pending')
      const localResults = pendingQuestions.map(question => {
        const result = validateAIQuestion(question)
        return {
          questionId: question.id,
          qualityScore: result.isValid ? 0.8 : 0.4,
          issues: result.errors
        }
      })
      
      // 更新试题的本地验证结果
      setQuestions(prev => {
        const safePrev = Array.isArray(prev) ? prev : []
        return safePrev.map(q => {
          const result = localResults.find(r => r.questionId === q.id)
          if (result) {
            return {
              ...q,
              qualityScore: result.qualityScore,
              issues: result.issues || []
            }
          }
          return q
        })
      })
      
      toast.warning('AI审核服务暂不可用，使用本地验证')
    } finally {
      setBatchReviewing(false)
    }
  }

  // 过滤试题
  const filteredQuestions = (Array.isArray(questions) ? questions : []).filter(question => {
    const matchesSearch = question.stem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (question.knowledgeLevel && question.knowledgeLevel.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (question.difficulty && question.difficulty.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // 基于当前标签页过滤状态
    let matchesStatus = true
    if (filterStatus === activeTab) {
      // 显示当前标签页的所有试题
      matchesStatus = question.status === activeTab
    } else {
      // 显示特定状态的试题（仅在AI审核通过标签页中有额外选项）
      matchesStatus = question.status === filterStatus
    }
    
    const matchesKnowledge = filterKnowledgeLevel === 'all' || 
      question.knowledgeLevel === filterKnowledgeLevel ||
      question.difficulty === filterKnowledgeLevel
    return matchesSearch && matchesStatus && matchesKnowledge
  })
  
  // 人工审核操作
  const approveQuestion = async (questionId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/review/approve/${questionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // 从待审核列表中移除已通过的试题
        setQuestions(prev => {
          const safePrev = Array.isArray(prev) ? prev : []
          return safePrev.filter(q => q.id !== questionId)
        })
        toast.success('试题已通过审核，已进入题库')
      } else {
        toast.error('审核操作失败')
      }
    } catch (error) {
      console.error('审核操作失败:', error)
      toast.error('审核操作失败')
    }
  }

  // 批量通过审核
  const handleBatchApprove = async () => {
    const pendingQuestions = questions.filter(q => q.status === 'pending')
    if (pendingQuestions.length === 0) {
      toast.warning('没有待人工审核的试题')
      return
    }

    const confirmed = window.confirm(`确定要批量通过 ${pendingQuestions.length} 道试题的审核吗？通过后试题将进入题库。`)
    if (!confirmed) return

    try {
      const questionIds = pendingQuestions.map(q => q.id)
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/review/batch-approve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionIds })
      })

      if (response.ok) {
        // 从待审核列表中移除已通过的试题
        setQuestions(prev => {
          const safePrev = Array.isArray(prev) ? prev : []
          return safePrev.filter(q => !questionIds.includes(q.id))
        })
        toast.success(`成功通过 ${pendingQuestions.length} 道试题的审核，已进入题库`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || '批量审核失败')
      }
    } catch (error) {
      console.error('批量审核失败:', error)
      toast.error('批量审核失败，请重试')
    }
  }

  const rejectQuestion = async (questionId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/review/reject/${questionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // 从待审核列表中移除已拒绝的试题
        setQuestions(prev => {
          const safePrev = Array.isArray(prev) ? prev : []
          return safePrev.filter(q => q.id !== questionId)
        })
        toast.success('试题已拒绝')
      } else {
        toast.error('审核操作失败')
      }
    } catch (error) {
      console.error('审核操作失败:', error)
      toast.error('审核操作失败')
    }
  }

  // 编辑试题
  const startEditing = (question: GeneratedQuestion) => {
    setEditingQuestion({ ...question })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setEditingQuestion(null)
    setIsEditing(false)
  }

  const saveQuestion = async () => {
    if (!editingQuestion) return

    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingQuestion)
      })

      if (response.ok) {
        setQuestions(prev => {
          const safePrev = Array.isArray(prev) ? prev : []
          return safePrev.map(q => 
            q.id === editingQuestion.id ? editingQuestion : q
          )
        })
        setSelectedQuestion(editingQuestion)
        setIsEditing(false)
        setEditingQuestion(null)
        toast.success('试题已保存')
      } else {
        toast.error('保存失败')
      }
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 统计信息
  const safeQuestions = Array.isArray(questions) ? questions : []
  const questionsWithQuality = safeQuestions.filter(q => q.qualityScore)
  const stats = {
    total: safeQuestions.length,
    pending: safeQuestions.filter(q => q.status === 'pending').length,
    approved: safeQuestions.filter(q => q.status === 'approved').length,
    rejected: safeQuestions.filter(q => q.status === 'rejected').length,
    avgQuality: questionsWithQuality.length > 0 ? 
      questionsWithQuality.reduce((sum, q) => sum + (q.qualityScore || 0), 0) / questionsWithQuality.length
      : 0
  }

  // 获取严重程度颜色
  const getSeverityColor = (errorCount: number) => {
    if (errorCount === 0) return 'text-green-600 bg-green-100'
    if (errorCount <= 2) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  // 获取严重程度图标
  const getSeverityIcon = (errorCount: number) => {
    if (errorCount === 0) return CheckCircle
    if (errorCount <= 2) return AlertTriangle
    return XCircle
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI生成试题审核</h1>
        <p className="text-gray-600">审核AI生成的试题质量，确保符合《第五届HR搏学命题要求规范》</p>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('ai_reviewing')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'ai_reviewing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            AI审核中
          </button>
          <button
            onClick={() => handleTabChange('ai_approved')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'ai_approved'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            AI审核通过
          </button>
          <button
            onClick={() => handleTabChange('ai_rejected')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'ai_rejected'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            AI审核未通过
          </button>
        </nav>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">总试题数</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">待审核</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-gray-600">已通过</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-gray-600">已拒绝</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{(stats.avgQuality * 100).toFixed(1)}%</div>
          <div className="text-sm text-gray-600">平均质量分</div>
        </div>
      </div>

      {/* 搜索和过滤栏 */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索试题或知识点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={activeTab}>当前标签页全部</option>
          {activeTab === 'ai_approved' && (
            <>
              <option value="pending">待人工审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </>
          )}
        </select>
        <select
          value={filterKnowledgeLevel}
          onChange={(e) => setFilterKnowledgeLevel(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">全部级别</option>
          <option value="HR掌握">HR掌握</option>
          <option value="全员掌握">全员掌握</option>
          <option value="全员熟悉">全员熟悉</option>
          <option value="全员了解">全员了解</option>
          <option value="easy">易</option>
          <option value="medium">中</option>
          <option value="hard">难</option>
        </select>

        <button
          onClick={handleBatchApprove}
          disabled={questions.filter(q => q.status === 'pending').length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          批量通过审核
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 试题列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">试题列表</h2>
            <p className="text-sm text-gray-600">共 {filteredQuestions.length} 道试题</p>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {filteredQuestions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                暂无试题数据
              </div>
            ) : (
              filteredQuestions.map((question) => {
                const validation = validateAIQuestion(question)
                const SeverityIcon = getSeverityIcon(validation.errors.length)
                
                return (
                  <div
                    key={question.id}
                    className={cn(
                      'p-4 cursor-pointer hover:bg-gray-50 transition-colors',
                      selectedQuestion?.id === question.id && 'bg-blue-50'
                    )}
                    onClick={() => handleCheck(question)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {question.stem.substring(0, 50)}...
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {(question.knowledgeLevel || question.difficulty || '未知级别')} • {question.type}
                        </div>
                      </div>
                      <div className="ml-3 flex items-center">
                        <span className={cn(
                          'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
                          getSeverityColor(validation.errors.length)
                        )}>
                          <SeverityIcon className="h-3 w-3 mr-1" />
                          {validation.errors.length === 0 ? '通过' : `${validation.errors.length}个问题`}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 检查结果 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">检查结果</h2>
            {selectedQuestion && (
              <p className="text-sm text-gray-600">
                {(selectedQuestion.knowledgeLevel || selectedQuestion.difficulty || '未知级别')} • {selectedQuestion.type}
              </p>
            )}
          </div>
          <div className="p-6">
            {checking ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mr-2" />
                <span className="text-gray-600">正在检查规范性...</span>
              </div>
            ) : selectedQuestion && validationResult ? (
              <div className="space-y-6">
                {/* 本地验证结果 */}
                {(() => {
                  const localValidation = validateAIQuestion(selectedQuestion)
                  return (
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <AlertTriangle className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-medium text-blue-800">
                          本地验证结果：{localValidation.isValid ? '通过' : `发现 ${localValidation.errors.length} 个问题`}
                        </span>
                      </div>
                      {localValidation.errors.length > 0 && (
                        <div className="space-y-2">
                          {localValidation.errors.map((error, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-red-700">{error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {localValidation.suggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-sm font-medium text-blue-800">建议：</div>
                          {localValidation.suggestions.map((suggestion, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-yellow-700">{suggestion}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}



                {/* 试题预览/编辑 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      {isEditing ? '编辑试题' : '试题预览'}
                    </h3>
                    <div className="flex space-x-2">
                      {!isEditing ? (
                        <button
                          onClick={() => startEditing(selectedQuestion)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          编辑
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={cancelEditing}
                            disabled={saving}
                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                          >
                            <X className="h-3 w-3 mr-1" />
                            取消
                          </button>
                          <button
                            onClick={saveQuestion}
                            disabled={saving}
                            className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            保存
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {isEditing && editingQuestion ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      {/* 编辑题干 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">题干：</label>
                        <textarea
                          value={editingQuestion.stem}
                          onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, stem: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      </div>
                      
                      {/* 编辑选项 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">选项：</label>
                        <div className="space-y-2">
                          {Object.entries(editingQuestion.options).map(([key, value]) => {
                            return (
                              <div key={key} className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700 w-6">{key}.</span>
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => setEditingQuestion(prev => prev ? {
                                    ...prev,
                                    options: { ...prev.options, [key]: e.target.value }
                                  } : null)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      
                      {/* 编辑正确答案 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">正确答案：</label>
                        <input
                          type="text"
                          value={editingQuestion.correctAnswer}
                          onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, correctAnswer: e.target.value } : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="如：A 或 ABC"
                        />
                      </div>
                      
                      {/* 编辑解析 */}
                      {editingQuestion.analysis && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">解析：</label>
                          <textarea
                            value={editingQuestion.analysis.explanation || ''}
                            onChange={(e) => setEditingQuestion(prev => prev ? {
                              ...prev,
                              analysis: { ...prev.analysis, explanation: e.target.value }
                            } : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="请输入解题思路和解析"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700">题干：</div>
                        <div className="text-sm text-gray-900">{selectedQuestion.stem}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">选项：</div>
                        <div className="space-y-1">
                          {Object.entries(selectedQuestion.options).map(([key, value]) => {
                            return (
                              <div key={key} className="text-sm text-gray-900">
                                {key}. {value}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">正确答案：</div>
                        <div className="text-sm text-gray-900">{selectedQuestion.correctAnswer}</div>
                      </div>
                      {selectedQuestion.analysis?.explanation && (
                        <div>
                          <div className="text-sm font-medium text-gray-700">解析：</div>
                          <div className="text-sm text-gray-900">{selectedQuestion.analysis.explanation}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* 审核操作 */}
                {selectedQuestion && !isEditing && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => approveQuestion(selectedQuestion.id)}
                      disabled={selectedQuestion.status === 'approved'}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md',
                        selectedQuestion.status === 'approved'
                          ? 'bg-green-100 text-green-800 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      )}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {selectedQuestion.status === 'approved' ? '已通过' : '通过审核'}
                    </button>
                    <button
                      onClick={() => rejectQuestion(selectedQuestion.id)}
                      disabled={selectedQuestion.status === 'rejected'}
                      className={cn(
                        'flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md',
                        selectedQuestion.status === 'rejected'
                          ? 'bg-red-100 text-red-800 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      )}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {selectedQuestion.status === 'rejected' ? '已拒绝' : '拒绝审核'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                请选择一道试题进行规范检查
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}