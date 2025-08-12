import React, { useState, useEffect } from 'react'
import { Save, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase, type KnowledgePoint, type Question } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface QuestionFormData {
  knowledge_point_id: string
  question_type: Question['question_type']
  stem: string
  options: string[]
  correct_answer: string
  difficulty: Question['difficulty']
  analysis: {
    textbook: string
    explanation: string
    conclusion: string
  }
}

const questionTypeOptions = [
  { value: '单选题', label: '单选题', description: '4个选项，1个正确答案' },
  { value: '多选题', label: '多选题', description: '4个选项，多个正确答案' },
  { value: '判断题', label: '判断题', description: '2个选项，正确或错误' }
]

const difficultyOptions = [
  { value: '易', label: '易', color: 'bg-green-100 text-green-800' },
  { value: '中', label: '中', color: 'bg-yellow-100 text-yellow-800' },
  { value: '难', label: '难', color: 'bg-red-100 text-red-800' }
]

export default function QuestionEditorPage() {
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<QuestionFormData>({
    knowledge_point_id: '',
    question_type: '单选题',
    stem: '',
    options: ['', '', '', ''],
    correct_answer: 'A',
    difficulty: '中',
    analysis: {
      textbook: '',
      explanation: '',
      conclusion: ''
    }
  })

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKnowledgePoints()
  }, [])

  // 根据题型调整选项数量
  useEffect(() => {
    if (formData.question_type === '判断题') {
      setFormData(prev => ({
        ...prev,
        options: ['正确', '错误'],
        correct_answer: 'A'
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        options: prev.options.length === 2 ? ['', '', '', ''] : prev.options
      }))
    }
  }, [formData.question_type])

  // 保存试题
  const handleSave = async () => {
    if (!formData.knowledge_point_id || !formData.stem.trim()) {
      alert('请填写必要信息')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('questions')
        .insert([{
          ...formData,
          options: formData.options.filter(opt => opt.trim())
        }])
      
      if (error) throw error
      
      alert('试题保存成功！')
      handleReset()
    } catch (error) {
      console.error('保存试题失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 重置表单
  const handleReset = () => {
    setFormData({
      knowledge_point_id: '',
      question_type: '单选题',
      stem: '',
      options: ['', '', '', ''],
      correct_answer: 'A',
      difficulty: '中',
      analysis: {
        textbook: '',
        explanation: '',
        conclusion: ''
      }
    })
  }

  // 更新选项
  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  // 获取选项标签
  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index) // A, B, C, D
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">命题工作台</h1>
          <p className="text-gray-600">创建标准化、规范化的考试试题</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存试题'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主编辑区域 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">基本信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  关联知识点 *
                </label>
                <select
                  value={formData.knowledge_point_id}
                  onChange={(e) => setFormData({ ...formData, knowledge_point_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择知识点</option>
                  {knowledgePoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.title} ({point.level})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  题型 *
                </label>
                <select
                  value={formData.question_type}
                  onChange={(e) => setFormData({ ...formData, question_type: e.target.value as Question['question_type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {questionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                难度等级
              </label>
              <div className="flex space-x-3">
                {difficultyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, difficulty: option.value as Question['difficulty'] })}
                    className={cn(
                      'px-3 py-1 text-sm font-medium rounded-full transition-colors',
                      formData.difficulty === option.value
                        ? option.color
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 题干编辑 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">题干编辑</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                题干内容 *
              </label>
              <textarea
                value={formData.stem}
                onChange={(e) => setFormData({ ...formData, stem: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入题干内容，建议以问号结尾，如：以下关于组织设计方法的说法，哪项是正确的？（ ）"
              />
              <div className="mt-2 text-sm text-gray-500">
                字数统计: {formData.stem.length} 字
              </div>
            </div>
          </div>

          {/* 选项设计 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">选项设计</h2>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <input
                      type={formData.question_type === '多选题' ? 'checkbox' : 'radio'}
                      name="correct_answer"
                      checked={
                        formData.question_type === '多选题'
                          ? formData.correct_answer.includes(getOptionLabel(index))
                          : formData.correct_answer === getOptionLabel(index)
                      }
                      onChange={(e) => {
                        if (formData.question_type === '多选题') {
                          const label = getOptionLabel(index)
                          const currentAnswers = formData.correct_answer.split('')
                          if (e.target.checked) {
                            setFormData({ ...formData, correct_answer: [...currentAnswers, label].sort().join('') })
                          } else {
                            setFormData({ ...formData, correct_answer: currentAnswers.filter(a => a !== label).join('') })
                          }
                        } else {
                          setFormData({ ...formData, correct_answer: getOptionLabel(index) })
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700 w-6">
                      {getOptionLabel(index)}.
                    </span>
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`选项 ${getOptionLabel(index)}`}
                    disabled={formData.question_type === '判断题'}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-gray-500">
              {formData.question_type === '多选题' ? '请选择多个正确答案' : '请选择唯一正确答案'}
            </div>
          </div>

          {/* 解析编辑 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">解析编辑</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  教材原文
                </label>
                <textarea
                  value={formData.analysis.textbook}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    analysis: { ...formData.analysis, textbook: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="引用教材中的相关原文内容"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  试题分析
                </label>
                <textarea
                  value={formData.analysis.explanation}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    analysis: { ...formData.analysis, explanation: e.target.value }
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="分析各选项的正确性和错误原因"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  答案结论
                </label>
                <textarea
                  value={formData.analysis.conclusion}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    analysis: { ...formData.analysis, conclusion: e.target.value }
                  })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="明确说明正确答案，如：本题答案为A"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 题型说明 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">题型说明</h3>
            <div className="space-y-3">
              {questionTypeOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    'p-3 rounded-lg border',
                    formData.question_type === option.value
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200'
                  )}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-600">{option.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 规范提示 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">规范提示</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  题干应以问号结尾，表述清晰明确
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  选项长度应基本一致，避免明显差异
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  解析应包含教材原文、分析和结论三部分
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  避免使用绝对化词语如"一定"、"绝对"等
                </div>
              </div>
            </div>
          </div>

          {/* 进度提示 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">完成进度</h3>
            <div className="space-y-2">
              {[
                { label: '选择知识点', completed: !!formData.knowledge_point_id },
                { label: '编写题干', completed: !!formData.stem.trim() },
                { label: '设计选项', completed: formData.options.some(opt => opt.trim()) },
                { label: '选择答案', completed: !!formData.correct_answer },
                { label: '撰写解析', completed: !!formData.analysis.conclusion.trim() }
              ].map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center',
                    item.completed ? 'bg-green-500' : 'bg-gray-300'
                  )}>
                    {item.completed && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className={cn(
                    'text-sm',
                    item.completed ? 'text-gray-900' : 'text-gray-500'
                  )}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}