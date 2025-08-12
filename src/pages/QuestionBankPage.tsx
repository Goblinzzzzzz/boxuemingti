import React, { useState, useEffect } from 'react'
import { Search, Filter, Download, Eye, Edit, Trash2, Database, CheckSquare, Square, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import { supabase, type Question, type KnowledgePoint } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { QuestionBankSkeleton } from '@/components/common/SkeletonLoader'

interface QuestionWithKnowledge extends Question {
  knowledge_point: KnowledgePoint
}

interface FilterState {
  question_type: string
  difficulty: string
  level: string
  knowledge_point_id: string
}

interface ExportFormat {
  type: 'csv' | 'json' | 'word'
  label: string
  icon: React.ReactNode
}

const questionTypeOptions = [
  { value: '', label: '全部题型' },
  { value: '单选题', label: '单选题' },
  { value: '多选题', label: '多选题' },
  { value: '判断题', label: '判断题' }
]

const difficultyOptions = [
  { value: '', label: '全部难度' },
  { value: '易', label: '易' },
  { value: '中', label: '中' },
  { value: '难', label: '难' }
]

const levelOptions = [
  { value: '', label: '全部分级' },
  { value: 'HR掌握', label: 'HR掌握' },
  { value: '全员掌握', label: '全员掌握' },
  { value: '全员熟悉', label: '全员熟悉' },
  { value: '全员了解', label: '全员了解' }
]

const difficultyColors = {
  '易': 'bg-green-100 text-green-800',
  '中': 'bg-yellow-100 text-yellow-800',
  '难': 'bg-red-100 text-red-800'
}

const levelColors = {
  'HR掌握': 'bg-red-100 text-red-800',
  '全员掌握': 'bg-blue-100 text-blue-800',
  '全员熟悉': 'bg-green-100 text-green-800',
  '全员了解': 'bg-yellow-100 text-yellow-800'
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionWithKnowledge[]>([])
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithKnowledge | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [smartCategory, setSmartCategory] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    question_type: '',
    difficulty: '',
    level: '',
    knowledge_point_id: ''
  })

  // 获取试题列表
  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          knowledge_point:knowledge_points(*)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setQuestions(data || [])
    } catch (error) {
      console.error('获取试题失败:', error)
      toast.error('获取试题失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取知识点列表
  const fetchKnowledgePoints = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_points')
        .select('*')
        .order('title')
      
      if (error) throw error
      setKnowledgePoints(data || [])
    } catch (error) {
      console.error('获取知识点失败:', error)
    }
  }

  useEffect(() => {
    fetchQuestions()
    fetchKnowledgePoints()
  }, [])

  // 删除试题
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这道试题吗？')) return
    
    try {
      const response = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || '删除失败')
      }
      
      fetchQuestions()
      if (selectedQuestion?.id === id) {
        setSelectedQuestion(null)
      }
      setSelectedQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      toast.success('试题删除成功')
    } catch (error) {
      console.error('删除试题失败:', error)
      toast.error('删除试题失败')
    }
  }

  // 批量删除试题
  const handleBatchDelete = async () => {
    if (selectedQuestions.size === 0) return
    if (!confirm(`确定要删除选中的 ${selectedQuestions.size} 道试题吗？`)) return
    
    try {
      const response = await fetch('/api/questions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedQuestions)
        })
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || '批量删除失败')
      }
      
      fetchQuestions()
      setSelectedQuestions(new Set())
      setSelectedQuestion(null)
      toast.success(`成功删除 ${selectedQuestions.size} 道试题`)
    } catch (error) {
      console.error('批量删除失败:', error)
      toast.error('批量删除失败')
    }
  }

  // 智能分类
  const handleSmartCategory = (category: string) => {
    setSmartCategory(category)
    switch (category) {
      case 'recent':
        setFilters({ question_type: '', difficulty: '', level: '', knowledge_point_id: '' })
        break
      case 'easy':
        setFilters({ ...filters, difficulty: '易' })
        break
      case 'medium':
        setFilters({ ...filters, difficulty: '中' })
        break
      case 'hard':
        setFilters({ ...filters, difficulty: '难' })
        break
      case 'single':
        setFilters({ ...filters, question_type: '单选题' })
        break
      case 'multiple':
        setFilters({ ...filters, question_type: '多选题' })
        break
      case 'judge':
        setFilters({ ...filters, question_type: '判断题' })
        break
      default:
        break
    }
  }

  // 过滤试题
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = 
      question.stem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.knowledge_point?.title.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = !filters.question_type || question.question_type === filters.question_type
    const matchesDifficulty = !filters.difficulty || question.difficulty === filters.difficulty
    const matchesLevel = !filters.level || question.knowledge_point?.level === filters.level
    const matchesKnowledgePoint = !filters.knowledge_point_id || question.knowledge_point?.id === filters.knowledge_point_id

    return matchesSearch && matchesType && matchesDifficulty && matchesLevel && matchesKnowledgePoint
  })

  // 切换试题选择
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)))
    }
  }

  // 导出格式选项
  const exportFormats: ExportFormat[] = [
    { type: 'csv', label: 'CSV 表格', icon: <FileSpreadsheet className="h-4 w-4" /> },
    { type: 'json', label: 'JSON 数据', icon: <FileText className="h-4 w-4" /> },
    { type: 'word', label: 'Word 文档', icon: <FileText className="h-4 w-4" /> }
  ]

  // 导出试题
  const handleExport = async (format: 'csv' | 'json' | 'word') => {
    const questionsToExport = selectedQuestions.size > 0 
      ? filteredQuestions.filter(q => selectedQuestions.has(q.id))
      : filteredQuestions
    
    if (questionsToExport.length === 0) {
      toast.error('没有可导出的试题')
      return
    }

    setExporting(true)
    try {
      const exportData = questionsToExport.map(q => ({
        知识点: q.knowledge_point?.title || '',
        知识点分级: q.knowledge_point?.level || '',
        题型: q.question_type,
        难度: q.difficulty,
        题干: q.stem,
        选项A: q.options[0] || '',
        选项B: q.options[1] || '',
        选项C: q.options[2] || '',
        选项D: q.options[3] || '',
        正确答案: q.correct_answer,
        教材原文: q.analysis.textbook || '',
        试题分析: q.analysis.explanation || '',
        答案结论: q.analysis.conclusion || '',
        创建时间: new Date(q.created_at).toLocaleString()
      }))

      let blob: Blob
      let filename: string
      const timestamp = new Date().toISOString().split('T')[0]

      switch (format) {
        case 'csv':
          const csv = [
            Object.keys(exportData[0] || {}).join(','),
            ...exportData.map(row => Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
          ].join('\n')
          blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          filename = `试题库_${timestamp}.csv`
          break
        
        case 'json':
          blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' })
          filename = `试题库_${timestamp}.json`
          break
        
        case 'word':
          // 简化的Word格式（实际项目中可能需要使用专门的库）
          const wordContent = exportData.map((q, index) => 
            `${index + 1}. ${q.题干}\n` +
            `A. ${q.选项A}\nB. ${q.选项B}\nC. ${q.选项C}\nD. ${q.选项D}\n` +
            `正确答案：${q.正确答案}\n` +
            `解析：${q.试题分析}\n\n`
          ).join('')
          blob = new Blob([wordContent], { type: 'application/msword;charset=utf-8;' })
          filename = `试题库_${timestamp}.doc`
          break
        
        default:
          throw new Error('不支持的导出格式')
      }

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      
      toast.success(`成功导出 ${questionsToExport.length} 道试题`)
      setShowExportOptions(false)
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败')
    } finally {
      setExporting(false)
    }
  }



  // 统计信息
  const stats = {
    total: questions.length,
    byType: {
      '单选题': questions.filter(q => q.question_type === '单选题').length,
      '多选题': questions.filter(q => q.question_type === '多选题').length,
      '判断题': questions.filter(q => q.question_type === '判断题').length
    },
    byDifficulty: {
      '易': questions.filter(q => q.difficulty === '易').length,
      '中': questions.filter(q => q.difficulty === '中').length,
      '难': questions.filter(q => q.difficulty === '难').length
    }
  }

  if (loading) {
    return <QuestionBankSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">题库管理</h1>
          <p className="text-gray-600">查询和管理已创建的试题，支持智能分类和批量导出</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="h-4 w-4 mr-2" />
            筛选
          </button>
          {selectedQuestions.size > 0 && (
            <button
              onClick={handleBatchDelete}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除选中 ({selectedQuestions.size})
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              disabled={filteredQuestions.length === 0 || exporting}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              导出 ({selectedQuestions.size > 0 ? selectedQuestions.size : filteredQuestions.length})
            </button>
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  {exportFormats.map((format) => (
                    <button
                      key={format.type}
                      onClick={() => handleExport(format.type)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      {format.icon}
                      <span className="ml-2">{format.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">总试题数</div>
            </div>
          </div>
        </div>
        {Object.entries(stats.byType).map(([type, count]) => (
          <div key={type} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-sm text-gray-600">{type}</div>
          </div>
        ))}
      </div>

      {/* 智能分类 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">智能分类</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSmartCategory('recent')}
            className={cn(
              'px-3 py-1 text-sm rounded-full transition-colors',
              smartCategory === 'recent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            最新试题
          </button>
          <button
            onClick={() => handleSmartCategory('easy')}
            className={cn(
              'px-3 py-1 text-sm rounded-full transition-colors',
              smartCategory === 'easy' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            简单试题
          </button>
          <button
            onClick={() => handleSmartCategory('medium')}
            className={cn(
              'px-3 py-1 text-sm rounded-full transition-colors',
              smartCategory === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            中等试题
          </button>
          <button
            onClick={() => handleSmartCategory('hard')}
            className={cn(
              'px-3 py-1 text-sm rounded-full transition-colors',
              smartCategory === 'hard' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            困难试题
          </button>
          <button
            onClick={() => handleSmartCategory('single')}
            className={cn(
              'px-3 py-1 text-sm rounded-full transition-colors',
              smartCategory === 'single' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            单选题
          </button>
          <button
            onClick={() => handleSmartCategory('multiple')}
            className={cn(
              'px-3 py-1 text-sm rounded-full transition-colors',
              smartCategory === 'multiple' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            多选题
          </button>
          <button
            onClick={() => handleSmartCategory('judge')}
            className={cn(
              'px-3 py-1 text-sm rounded-full transition-colors',
              smartCategory === 'judge' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            判断题
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索试题内容或知识点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  题型
                </label>
                <select
                  value={filters.question_type}
                  onChange={(e) => setFilters({ ...filters, question_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {questionTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  难度
                </label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {difficultyOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  知识点分级
                </label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {levelOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  知识点
                </label>
                <select
                  value={filters.knowledge_point_id}
                  onChange={(e) => setFilters({ ...filters, knowledge_point_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">全部知识点</option>
                  {knowledgePoints.map(kp => (
                    <option key={kp.id} value={kp.id}>{kp.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setFilters({ question_type: '', difficulty: '', level: '', knowledge_point_id: '' })}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                清除筛选
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 试题列表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">试题列表</h2>
                <p className="text-sm text-gray-600">共 {filteredQuestions.length} 道试题</p>
              </div>
              {filteredQuestions.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedQuestions.size === filteredQuestions.length ? (
                    <CheckSquare className="h-4 w-4 mr-1" />
                  ) : (
                    <Square className="h-4 w-4 mr-1" />
                  )}
                  {selectedQuestions.size === filteredQuestions.length ? '取消全选' : '全选'}
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {filteredQuestions.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {questions.length === 0 ? '暂无试题数据' : '没有符合条件的试题'}
              </div>
            ) : (
              filteredQuestions.map((question) => (
                <div
                  key={question.id}
                  className={cn(
                    'p-4 hover:bg-gray-50 transition-colors',
                    selectedQuestion?.id === question.id && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleQuestionSelection(question.id)
                      }}
                      className="mt-1 text-gray-400 hover:text-blue-600"
                    >
                      {selectedQuestions.has(question.id) ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelectedQuestion(question)}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {question.stem.substring(0, 60)}...
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {question.knowledge_point?.title}
                        </span>
                        <span className={cn(
                          'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                          levelColors[question.knowledge_point?.level as keyof typeof levelColors]
                        )}>
                          {question.knowledge_point?.level}
                        </span>
                        <span className="text-xs text-gray-400">{question.question_type}</span>
                        <span className={cn(
                          'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                          difficultyColors[question.difficulty as keyof typeof difficultyColors]
                        )}>
                          {question.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedQuestion(question)
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(question.id)
                        }}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 试题详情 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">试题详情</h2>
            {selectedQuestion && (
              <p className="text-sm text-gray-600">
                {selectedQuestion.knowledge_point?.title} • {selectedQuestion.question_type}
              </p>
            )}
          </div>
          <div className="p-6">
            {selectedQuestion ? (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">基本信息</h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">知识点：</span>
                      <span className="text-sm text-gray-900">{selectedQuestion.knowledge_point?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">分级：</span>
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        levelColors[selectedQuestion.knowledge_point?.level as keyof typeof levelColors]
                      )}>
                        {selectedQuestion.knowledge_point?.level}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">题型：</span>
                      <span className="text-sm text-gray-900">{selectedQuestion.question_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">难度：</span>
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        difficultyColors[selectedQuestion.difficulty as keyof typeof difficultyColors]
                      )}>
                        {selectedQuestion.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 题干 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">题干</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-900">{selectedQuestion.stem}</p>
                  </div>
                </div>

                {/* 选项 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">选项</h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {selectedQuestion.options.map((option, index) => {
                      const label = String.fromCharCode(65 + index)
                      const isCorrect = selectedQuestion.correct_answer.includes(label)
                      return (
                        <div key={index} className={cn(
                          'flex items-start space-x-2 p-2 rounded',
                          isCorrect ? 'bg-green-100' : 'bg-white'
                        )}>
                          <span className={cn(
                            'text-sm font-medium',
                            isCorrect ? 'text-green-700' : 'text-gray-700'
                          )}>
                            {label}.
                          </span>
                          <span className={cn(
                            'text-sm',
                            isCorrect ? 'text-green-900' : 'text-gray-900'
                          )}>
                            {option}
                          </span>
                          {isCorrect && (
                            <span className="text-xs text-green-600 font-medium">✓</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 解析 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">解析</h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                    {selectedQuestion.analysis.textbook && (
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">教材原文：</div>
                        <div className="text-sm text-gray-900">{selectedQuestion.analysis.textbook}</div>
                      </div>
                    )}
                    {selectedQuestion.analysis.explanation && (
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">试题分析：</div>
                        <div className="text-sm text-gray-900">{selectedQuestion.analysis.explanation}</div>
                      </div>
                    )}
                    {selectedQuestion.analysis.conclusion && (
                      <div>
                        <div className="text-xs font-medium text-gray-600 mb-1">答案结论：</div>
                        <div className="text-sm text-gray-900">{selectedQuestion.analysis.conclusion}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 创建时间 */}
                <div className="text-xs text-gray-500">
                  创建时间：{new Date(selectedQuestion.created_at).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                请选择一道试题查看详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}