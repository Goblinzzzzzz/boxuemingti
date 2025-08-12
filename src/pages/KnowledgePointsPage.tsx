import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, BookOpen } from 'lucide-react'
import { supabase, type KnowledgePoint } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const levelColors = {
  'HR掌握': 'bg-red-100 text-red-800',
  '全员掌握': 'bg-blue-100 text-blue-800',
  '全员熟悉': 'bg-green-100 text-green-800',
  '全员了解': 'bg-yellow-100 text-yellow-800'
}

interface CreateFormData {
  title: string
  description: string
  level: KnowledgePoint['level']
  textbook_page: string
}

export default function KnowledgePointsPage() {
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPoint, setEditingPoint] = useState<KnowledgePoint | null>(null)
  const [formData, setFormData] = useState<CreateFormData>({
    title: '',
    description: '',
    level: '全员掌握',
    textbook_page: ''
  })

  // 获取知识点列表
  const fetchKnowledgePoints = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_points')
        .select('*')
        .order('created_at', { ascending: false })
      
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

  // 创建或更新知识点
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingPoint) {
        // 更新
        const { error } = await supabase
          .from('knowledge_points')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPoint.id)
        
        if (error) throw error
      } else {
        // 创建
        const { error } = await supabase
          .from('knowledge_points')
          .insert([formData])
        
        if (error) throw error
      }
      
      // 重置表单
      setFormData({
        title: '',
        description: '',
        level: '全员掌握',
        textbook_page: ''
      })
      setShowCreateForm(false)
      setEditingPoint(null)
      fetchKnowledgePoints()
    } catch (error) {
      console.error('保存知识点失败:', error)
    }
  }

  // 删除知识点
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个知识点吗？')) return
    
    try {
      const { error } = await supabase
        .from('knowledge_points')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      fetchKnowledgePoints()
    } catch (error) {
      console.error('删除知识点失败:', error)
    }
  }

  // 开始编辑
  const handleEdit = (point: KnowledgePoint) => {
    setEditingPoint(point)
    setFormData({
      title: point.title,
      description: point.description || '',
      level: point.level,
      textbook_page: point.textbook_page || ''
    })
    setShowCreateForm(true)
  }

  // 过滤知识点
  const filteredPoints = knowledgePoints.filter(point =>
    point.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    point.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold text-gray-900">知识点管理</h1>
          <p className="text-gray-600">创建和管理考试知识点，设置分级和教材关联</p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true)
            setEditingPoint(null)
            setFormData({
              title: '',
              description: '',
              level: '全员掌握',
              textbook_page: ''
            })
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建知识点
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索知识点..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 创建/编辑表单 */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingPoint ? '编辑知识点' : '创建新知识点'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  知识点标题 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入知识点标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  知识点分级 *
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as KnowledgePoint['level'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="HR掌握">HR掌握</option>
                  <option value="全员掌握">全员掌握</option>
                  <option value="全员熟悉">全员熟悉</option>
                  <option value="全员了解">全员了解</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                知识点描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入知识点的详细描述"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                教材页码
              </label>
              <input
                type="text"
                value={formData.textbook_page}
                onChange={(e) => setFormData({ ...formData, textbook_page: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：第82页"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingPoint(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingPoint ? '更新' : '创建'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 知识点列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredPoints.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无知识点</h3>
            <p className="text-gray-600 mb-4">开始创建您的第一个知识点</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建知识点
            </button>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    知识点
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    分级
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    教材页码
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPoints.map((point) => (
                  <tr key={point.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{point.title}</div>
                        {point.description && (
                          <div className="text-sm text-gray-500">{point.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        levelColors[point.level]
                      )}>
                        {point.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {point.textbook_page || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(point.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(point)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(point.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}