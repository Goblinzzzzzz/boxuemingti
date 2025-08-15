import React, { useState, useEffect } from 'react'
import { Bot, Brain, Zap, CheckCircle, AlertTriangle, Play, Pause, RotateCcw, Loader2, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import AIModelSelector from '@/components/AIModelSelector'

interface GenerationTask {
  id: string
  status: 'pending' | 'analyzing' | 'generating' | 'completed' | 'error'
  progress: number
  currentStep: string
  materialTitle: string
  materialId?: string
  startTime: Date
  parameters: {
    questionCount: number
    questionTypes: string[]
    difficulty: string
  }
}

interface GeneratedQuestion {
  id: string
  type: string
  stem: string
  options: Record<string, string>
  correctAnswer: string
  knowledgeLevel?: string
  difficulty?: string
  qualityScore?: number
  status?: 'ai_reviewing' | 'ai_approved' | 'ai_rejected' | 'pending' | 'approved' | 'rejected'
  analysis?: {
    textbook?: string
    explanation?: string
    conclusion?: string
  }
  knowledge_points?: string[]
  created_at?: string
}

const mockQuestions: GeneratedQuestion[] = [
  {
    id: 'q1',
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
    qualityScore: 0.95
  },
  {
    id: 'q2',
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
    qualityScore: 0.88
  }
]

interface AIServiceStatus {
  available: boolean
  provider: string
  model: string
  lastCheck: string
  error?: string
}

export default function AIGeneratorPage() {
  const [currentTask, setCurrentTask] = useState<GenerationTask | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState<GeneratedQuestion | null>(null)
  const [showParameters, setShowParameters] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [materials, setMaterials] = useState<any[]>([])
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [aiStatus, setAiStatus] = useState<AIServiceStatus | null>(null)
  const [checkingAiStatus, setCheckingAiStatus] = useState(false)
  const [parameters, setParameters] = useState({
    questionCount: 5,
    questionTypes: ['单选题', '判断题'],
    difficulty: '中'
  })

  // 获取教材列表和AI服务状态
  useEffect(() => {
    fetchMaterials()
    checkAIServiceStatus()
  }, [])

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/materials', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMaterials(data.data || [])
      } else {
        toast.error('获取教材列表失败')
      }
    } catch (error) {
      console.error('获取教材列表失败:', error)
      toast.error('获取教材列表失败')
    }
  }

  // 检查AI服务状态
  const checkAIServiceStatus = async () => {
    setCheckingAiStatus(true)
    try {
      // 添加时间戳参数强制刷新缓存
      const timestamp = Date.now()
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/generation/ai-status?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setAiStatus(data.data)
        if (!data.data.available) {
          toast.warning('AI服务当前不可用，将使用模拟数据生成试题')
        }
      } else {
        setAiStatus({
          available: false,
          provider: 'unknown',
          model: 'unknown',
          lastCheck: new Date().toISOString(),
          error: '无法连接AI服务'
        })
        toast.error('AI服务检查失败')
      }
    } catch (error) {
      console.error('检查AI服务状态失败:', error)
      setAiStatus({
        available: false,
        provider: 'unknown',
        model: 'unknown',
        lastCheck: new Date().toISOString(),
        error: '网络连接失败'
      })
      toast.error('AI服务检查失败')
    } finally {
      setCheckingAiStatus(false)
    }
  }

  // 开始AI生成
  const startGeneration = async () => {
    if (!selectedMaterial) {
      toast.error('请先选择教材')
      return
    }

    if (parameters.questionTypes.length === 0) {
      toast.error('请至少选择一种题型')
      return
    }

    console.log('开始AI生成，参数:', {
      materialId: selectedMaterial,
      questionCount: parameters.questionCount,
      questionTypes: parameters.questionTypes,
      difficulty: parameters.difficulty
    })

    setIsLoading(true)
    setGeneratedQuestions([])
    setShowParameters(false)

    try {
      // 创建生成任务
      console.log('创建生成任务...')
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/generation/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          materialId: selectedMaterial,
          questionCount: parameters.questionCount,
          questionTypes: parameters.questionTypes,
          difficulty: parameters.difficulty
        })
      })

      console.log(`创建任务响应: ${response.status} ${response.statusText}`)
      if (!response.ok) {
        throw new Error('创建生成任务失败')
      }

      const data = await response.json()
      console.log('创建任务响应数据:', data)
      const taskId = data.data.id
      console.log(`获取到的任务ID: ${taskId}`)
      const selectedMaterialData = materials.find(m => m.id === selectedMaterial)

      const task: GenerationTask = {
        id: taskId,
        status: 'pending',
        progress: 0,
        currentStep: '正在初始化生成任务...',
        materialTitle: selectedMaterialData?.title || '未知教材',
        materialId: selectedMaterial,
        startTime: new Date(),
        parameters
      }

      setCurrentTask(task)
      toast.success('生成任务已创建，正在处理中...')

      // 轮询任务状态
      pollTaskStatus(taskId)
    } catch (error) {
      console.error('创建生成任务失败:', error)
      toast.error('创建生成任务失败')
      setIsLoading(false)
      setShowParameters(true)
    }
  }

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    console.log(`开始轮询任务状态，任务ID: ${taskId}`)
    const pollInterval = setInterval(async () => {
      try {
        console.log(`轮询任务状态: ${taskId}`)
        const token = localStorage.getItem('access_token')
        const response = await fetch(`/api/generation/tasks/${taskId}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        console.log(`任务状态响应: ${response.status} ${response.statusText}`)
        if (!response.ok) {
          throw new Error('获取任务状态失败')
        }

        const data = await response.json()
        console.log(`任务状态数据:`, data)
        const taskData = data.data

        setCurrentTask(prev => prev ? {
          ...prev,
          status: taskData.status,
          progress: taskData.progress || 0,
          currentStep: getStepMessage(taskData.status, taskData.progress)
        } : null)

        if (taskData.status === 'completed') {
          console.log(`任务已完成: ${taskId}`)
          clearInterval(pollInterval)
          setIsLoading(false)
          
          // 获取生成的试题
          console.log(`获取生成的试题: ${taskId}`)
          const questionsResponse = await fetch(`/api/generation/tasks/${taskId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          console.log(`获取试题响应: ${questionsResponse.status} ${questionsResponse.statusText}`)
          if (questionsResponse.ok) {
            const questionsData = await questionsResponse.json()
            console.log(`获取到的试题数据:`, questionsData)
            if (questionsData.data.result && questionsData.data.result.questions) {
              setGeneratedQuestions(questionsData.data.result.questions)
              toast.success(`成功生成 ${questionsData.data.result.questions.length} 道试题`)
            } else {
              console.error('试题数据格式不正确:', questionsData)
              toast.error('获取生成的试题失败')
            }
          }
        } else if (taskData.status === 'error') {
          console.log(`任务失败: ${taskId}`)
          clearInterval(pollInterval)
          setIsLoading(false)
          toast.error('生成任务失败，请重试')
          setCurrentTask(null)
          setShowParameters(true)
        } else {
          console.log(`任务状态: ${taskData.status}, 进度: ${taskData.progress || 0}`)
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error)
        clearInterval(pollInterval)
        setIsLoading(false)
        toast.error('获取任务状态失败')
      }
    }, 2000)

    // 设置超时
    setTimeout(() => {
      clearInterval(pollInterval)
      if (currentTask?.status !== 'completed') {
        setIsLoading(false)
        toast.error('生成任务超时，请重试')
        setShowParameters(true)
      }
    }, 300000) // 5分钟超时
  }

  // 获取步骤消息
  const getStepMessage = (status: string, progress: number) => {
    switch (status) {
      case 'pending':
        return '正在初始化生成任务...'
      case 'analyzing':
        if (progress < 30) return '正在分析教材内容...'
        if (progress < 60) return '正在提取知识点...'
        return '正在准备生成试题...'
      case 'generating':
        if (progress < 80) return '正在生成试题...'
        return '正在优化试题质量...'
      case 'completed':
        return '生成完成'
      case 'error':
        return '生成失败'
      default:
        return '处理中...'
    }
  }

  const resetGeneration = () => {
    setCurrentTask(null)
    setGeneratedQuestions([])
    setSelectedQuestion(null)
    setShowParameters(true)
    setIsLoading(false)
  }

  const getKnowledgeLevelColor = (level?: string) => {
    switch (level) {
      case 'HR掌握': return 'bg-red-100 text-red-800'
      case '全员掌握': return 'bg-blue-100 text-blue-800'
      case '全员熟悉': return 'bg-green-100 text-green-800'
      case '全员了解': return 'bg-yellow-100 text-yellow-800'
      case '易':
      case 'easy': return 'bg-green-100 text-green-800'
      case '中':
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case '难':
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getQualityScoreColor = (score?: number) => {
    if (!score) return 'text-gray-600'
    if (score >= 0.9) return 'text-green-600'
    if (score >= 0.8) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return '易'
      case 'medium': return '中'
      case 'hard': return '难'
      default: return difficulty || '未知'
    }
  }

  // 导出试题功能
  const handleExportQuestions = () => {
    if (generatedQuestions.length === 0) {
      toast.error('没有可导出的试题')
      return
    }

    try {
      const exportData = generatedQuestions.map(q => ({
        题型: q.type,
        难度: q.difficulty || q.knowledgeLevel || '',
        题干: q.stem,
        选项A: q.options['A'] || '',
        选项B: q.options['B'] || '',
        选项C: q.options['C'] || '',
        选项D: q.options['D'] || '',
        正确答案: q.correctAnswer,
        教材原文: q.analysis?.textbook || '',
        试题分析: q.analysis?.explanation || '',
        答案结论: q.analysis?.conclusion || '',
        创建时间: q.created_at ? new Date(q.created_at).toLocaleString() : new Date().toLocaleString()
      }))

      const timestamp = new Date().toISOString().split('T')[0]
      
      // 导出为CSV格式
      const csv = [
        Object.keys(exportData[0] || {}).join(','),
        ...exportData.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const filename = `AI生成试题_${timestamp}.csv`
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      
      toast.success(`成功导出 ${generatedQuestions.length} 道试题`)
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败')
    }
  }

  // 提交审核功能
  const handleSubmitForReview = async () => {
    if (generatedQuestions.length === 0) {
      toast.error('没有可提交的试题')
      return
    }

    try {
      // 将生成的试题格式转换为待审核格式
      const questionsToSubmit = generatedQuestions.map(q => {
        console.log('前端原始试题数据:', q);
        
        const submissionData = {
          question_type: q.type,
          difficulty: q.difficulty || '中',
          stem: q.stem,
          options: q.options, // 保持options为对象格式
          correct_answer: q.correctAnswer,
          analysis: {
            textbook: q.analysis?.textbook || '',
            explanation: q.analysis?.explanation || '',
            conclusion: q.analysis?.conclusion || ''
          },
          quality_score: q.qualityScore || 0.8,
          knowledge_level: q.knowledgeLevel || 'HR掌握',
          knowledge_points: q.knowledge_points || [],
          task_id: currentTask?.id // 关联生成任务
        };
        
        console.log('转换后的提交数据:', submissionData);
        return submissionData;
      })

      // 调用提交审核API
      const token = localStorage.getItem('access_token')
      if (!token) {
        throw new Error('未提供认证token')
      }
      
      const response = await fetch('/api/questions/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questions: questionsToSubmit })
      })

      // 解析响应数据
      const responseData = await response.json()
      
      // 检查后端返回的success字段来判断是否真正成功
      if (responseData.success) {
        toast.success(`成功提交 ${generatedQuestions.length} 道试题到审核队列`)
        // 清空当前生成的试题，引导用户到审核页面
        setTimeout(() => {
          toast.info('试题已保存，请前往"试题审核"页面进行审核')
        }, 2000)
      } else {
        // 只有在后端明确返回失败时才抛出错误
        throw new Error(responseData.error || '提交失败')
      }
    } catch (error) {
      console.error('提交审核失败:', error)
      toast.error('提交审核失败，请重试')
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI命题工作台</h1>
          <p className="mt-2 text-sm text-gray-600">
            基于教材内容智能分析并自动生成符合规范的试题
          </p>
        </div>
        {currentTask && (
          <button
            onClick={resetGeneration}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            重新生成
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* 左侧：参数设置和生成控制 */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Bot className="h-5 w-5 mr-2 text-blue-600" />
                  AI生成设置
                </h2>
                <div className="flex items-center space-x-2">
                  {checkingAiStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : aiStatus?.available ? (
                    <div className="flex items-center text-green-600">
                      <Wifi className="h-4 w-4 mr-1" />
                      <span className="text-xs">AI在线</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <WifiOff className="h-4 w-4 mr-1" />
                      <span className="text-xs">AI离线</span>
                    </div>
                  )}
                  <button
                    onClick={checkAIServiceStatus}
                    disabled={checkingAiStatus}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    检查状态
                  </button>
                </div>
              </div>
              {aiStatus && (
                <div className="mt-2 text-xs text-gray-500">
                  {aiStatus.available ? (
                    <span>使用 {aiStatus.provider} - {aiStatus.model}</span>
                  ) : (
                    <span className="text-red-600">{aiStatus.error || '服务不可用'}</span>
                  )}
                </div>
              )}
              
              {/* AI模型选择器 */}
              <div className="mt-4">
                <AIModelSelector 
                  className="w-full"
                  onModelChange={(provider, model) => {
                    console.log('AI模型已切换:', { provider, model });
                    // 重新检查AI服务状态
                    checkAIServiceStatus();
                    toast.success(`已切换到 ${provider} - ${model}`);
                  }}
                />
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {showParameters && (
                <>
                  {/* 教材选择 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选择教材
                    </label>
                    <select
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">请选择教材</option>
                      {materials.map(material => (
                        <option key={material.id} value={material.id}>
                          {material.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 生成数量 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      生成试题数量
                    </label>
                    <select
                      value={parameters.questionCount}
                      onChange={(e) => setParameters(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={5}>5道题</option>
                      <option value={10}>10道题</option>
                      <option value={15}>15道题</option>
                      <option value={20}>20道题</option>
                    </select>
                  </div>

                  {/* 题型选择 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      题型要求
                    </label>
                    <div className="space-y-2">
                      {['单选题', '多选题', '判断题'].map(type => (
                        <label key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={parameters.questionTypes.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setParameters(prev => ({
                                  ...prev,
                                  questionTypes: [...prev.questionTypes, type]
                                }))
                              } else {
                                setParameters(prev => ({
                                  ...prev,
                                  questionTypes: prev.questionTypes.filter(t => t !== type)
                                }))
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 难度选择 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      难度要求
                    </label>
                    <div className="flex flex-wrap gap-2 sm:gap-4">
                      {['易', '中', '难'].map(level => (
                        <label key={level} className="flex items-center">
                          <input
                            type="radio"
                            name="difficulty"
                            value={level}
                            checked={parameters.difficulty === level}
                            onChange={(e) => setParameters(prev => ({ ...prev, difficulty: e.target.value }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={startGeneration}
                    disabled={parameters.questionTypes.length === 0 || !selectedMaterial || isLoading}
                    className={cn(
                      'w-full flex items-center justify-center px-4 py-3 rounded-md font-medium text-sm transition-colors',
                      parameters.questionTypes.length > 0 && selectedMaterial && !isLoading
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? '生成中...' : '开始AI生成'}
                  </button>
                </>
              )}

              {/* 生成进度 */}
              {currentTask && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">生成进度</span>
                    <span className="text-sm text-gray-500">{currentTask.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${currentTask.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    {currentTask.status === 'analyzing' && <Brain className="h-4 w-4 mr-2 text-blue-500 animate-pulse" />}
                    {currentTask.status === 'generating' && <Zap className="h-4 w-4 mr-2 text-yellow-500 animate-pulse" />}
                    {currentTask.status === 'completed' && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
                    {currentTask.currentStep}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：生成结果 */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">生成结果</h2>
              {generatedQuestions.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  已生成 {generatedQuestions.length} 道试题
                </p>
              )}
            </div>
            
            <div className="p-6">
              {generatedQuestions.length === 0 && !currentTask && (
                <div className="text-center py-12">
                  <Bot className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">等待AI生成</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    设置生成参数后点击"开始AI生成"按钮
                  </p>
                </div>
              )}

              {currentTask && generatedQuestions.length === 0 && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">AI正在生成中...</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {currentTask.currentStep}
                  </p>
                </div>
              )}

              {generatedQuestions.length > 0 && (
                <div className="space-y-3 sm:space-y-4">
                  {generatedQuestions.map((question, index) => (
                    <div 
                      key={question.id}
                      className={cn(
                        'border rounded-lg p-3 sm:p-4 cursor-pointer transition-colors',
                        selectedQuestion?.id === question.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      onClick={() => setSelectedQuestion(question)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">第{index + 1}题</span>
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                              {question.type}
                            </span>
                            {(question.difficulty || question.knowledgeLevel) && (
                              <span className={cn('px-2 py-1 text-xs font-medium rounded', getKnowledgeLevelColor(question.difficulty || question.knowledgeLevel))}>
                                {getDifficultyLabel(question.difficulty) || question.knowledgeLevel}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{question.stem}</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-2 sm:ml-4 flex-shrink-0">
                          {question.qualityScore && (
                            <>
                              <span className={cn('text-xs sm:text-sm font-medium', getQualityScoreColor(question.qualityScore))}>
                                {(question.qualityScore * 100).toFixed(0)}%
                              </span>
                              {question.qualityScore >= 0.9 ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {generatedQuestions.length > 0 && (
              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div className="text-sm text-gray-500">
                    {generatedQuestions.some(q => q.qualityScore) ? (
                      `平均质量评分: ${(generatedQuestions.filter(q => q.qualityScore).reduce((acc, q) => acc + (q.qualityScore || 0), 0) / generatedQuestions.filter(q => q.qualityScore).length * 100).toFixed(0)}%`
                    ) : (
                      `共生成 ${generatedQuestions.length} 道试题`
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button 
                      onClick={() => handleExportQuestions()} 
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      导出试题
                    </button>
                    <button 
                      onClick={() => handleSubmitForReview()} 
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      提交审核
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 试题详情弹窗 */}
      {selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">试题详情</h3>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 试题信息 */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded">
                  {selectedQuestion.type}
                </span>
                {(selectedQuestion.difficulty || selectedQuestion.knowledgeLevel) && (
                  <span className={cn('px-3 py-1 text-sm font-medium rounded', getKnowledgeLevelColor(selectedQuestion.difficulty || selectedQuestion.knowledgeLevel))}>
                    {getDifficultyLabel(selectedQuestion.difficulty) || selectedQuestion.knowledgeLevel}
                  </span>
                )}
                {selectedQuestion.qualityScore && (
                  <span className={cn('text-sm font-medium', getQualityScoreColor(selectedQuestion.qualityScore))}>
                    质量评分: {(selectedQuestion.qualityScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* 题干 */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">题干</h4>
                <p className="text-gray-700">{selectedQuestion.stem}</p>
              </div>

              {/* 选项 */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">选项</h4>
                <div className="space-y-2">
                  {Object.entries(selectedQuestion.options).map(([key, value]) => (
                    <div key={key} className={cn(
                      'p-3 rounded border',
                      key === selectedQuestion.correctAnswer
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200'
                    )}>
                      <span className="font-medium">{key}. </span>
                      <span>{value}</span>
                      {key === selectedQuestion.correctAnswer && (
                        <span className="ml-2 text-green-600 text-sm">(正确答案)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 解析 */}
              {selectedQuestion.analysis && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">解析</h4>
                  <div className="space-y-3 text-sm text-gray-700">
                    {selectedQuestion.analysis.textbook && (
                      <p><strong>教材依据：</strong>{selectedQuestion.analysis.textbook}</p>
                    )}
                    {selectedQuestion.analysis.explanation && (
                      <p><strong>解题思路：</strong>{selectedQuestion.analysis.explanation}</p>
                    )}
                    {selectedQuestion.analysis.conclusion && (
                      <p><strong>答案确认：</strong>{selectedQuestion.analysis.conclusion}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* 知识点 */}
              {selectedQuestion.knowledge_points && selectedQuestion.knowledge_points.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">相关知识点</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuestion.knowledge_points.map((point, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}