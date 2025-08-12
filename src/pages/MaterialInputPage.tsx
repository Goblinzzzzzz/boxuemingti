import React, { useState, useEffect } from 'react'
import { Upload, FileText, File, AlertCircle, CheckCircle, Loader2, Edit, Trash2, RefreshCw, List, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MaterialInputSkeleton } from '@/components/common/SkeletonLoader'

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  content?: string
  file?: File
}

interface Material {
  id: string
  title: string
  file_type: string
  created_at: string
  metadata?: {
    originalName?: string
    size?: number
    uploadTime?: string
    inputMethod?: string
    length?: number
    createTime?: string
  }
  content?: string
}

export default function MaterialInputPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'upload' | 'text' | 'manage'>('upload')
  const [textContent, setTextContent] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [materialTitle, setMaterialTitle] = useState('')
  
  // 已上传教材管理相关状态
  const [materials, setMaterials] = useState<Material[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    const validFiles: File[] = []
    const invalidFiles: {name: string, reason: string}[] = []
    
    // 验证文件类型和大小
    for (const file of files) {
      // 检查文件类型
      const isValidType = validTypes.includes(file.type) || file.name.endsWith('.txt')
      if (!isValidType) {
        invalidFiles.push({name: file.name, reason: '不支持的文件类型'})
        continue
      }
      
      // 检查文件大小（10MB限制）
      if (file.size > 10 * 1024 * 1024) {
        invalidFiles.push({name: file.name, reason: '文件大小超过10MB限制'})
        continue
      }
      
      // 特殊检查PDF文件
      if (file.type === 'application/pdf') {
        // 检查文件名是否包含中文（可能导致编码问题）
        const hasChinese = /[\u4e00-\u9fa5]/.test(file.name)
        if (hasChinese) {
          console.warn(`警告: PDF文件名 ${file.name} 包含中文字符，可能导致编码问题`)
        }
      }
      
      validFiles.push(file)
    }
    
    // 显示无效文件的错误信息
    if (invalidFiles.length > 0) {
      const errorMessage = invalidFiles.map(f => `${f.name}: ${f.reason}`).join('\n')
      alert(`以下文件无法上传:\n${errorMessage}`)
    }

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])
    
    // 记录上传文件信息
    console.log(`添加了 ${validFiles.length} 个有效文件，拒绝了 ${invalidFiles.length} 个无效文件`)
    validFiles.forEach(file => {
      console.log(`有效文件: ${file.name}, 类型: ${file.type}, 大小: ${formatFileSize(file.size)}`)
    })
  }

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string, name: string) => {
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return <File className="h-8 w-8 text-red-500" />
    }
    if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) {
      return <File className="h-8 w-8 text-blue-500" />
    }
    return <FileText className="h-8 w-8 text-gray-500" />
  }

  // 获取已上传的教材列表
  const fetchMaterials = async () => {
    setLoadingMaterials(true)
    try {
      const response = await fetch('/api/materials')
      if (response.ok) {
        const result = await response.json()
        setMaterials(result.data || [])
      } else {
        throw new Error('获取教材列表失败')
      }
    } catch (error) {
      console.error('获取教材列表失败:', error)
      toast.error('获取教材列表失败')
    } finally {
      setLoadingMaterials(false)
    }
  }

  // 在组件挂载时获取教材列表
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchMaterials()
    }
  }, [activeTab])

  // 打开编辑模态框
  const handleEdit = async (material: Material) => {
    setEditingMaterial(material)
    setEditTitle(material.title)
    
    // 如果没有内容，则获取详细信息
    if (!material.content) {
      try {
        const response = await fetch(`/api/materials/${material.id}`)
        if (response.ok) {
          const result = await response.json()
          setEditContent(result.data.content || '')
        } else {
          throw new Error('获取教材详情失败')
        }
      } catch (error) {
        console.error('获取教材详情失败:', error)
        toast.error('获取教材详情失败')
        setEditContent('')
      }
    } else {
      setEditContent(material.content)
    }
    
    setShowEditModal(true)
  }

  // 保存编辑的教材
  const handleSaveEdit = async () => {
    if (!editingMaterial) return
    
    try {
      const response = await fetch(`/api/materials/${editingMaterial.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle,
          content: editContent
        })
      })
      
      if (response.ok) {
        toast.success('教材更新成功')
        setShowEditModal(false)
        fetchMaterials() // 刷新列表
      } else {
        throw new Error('更新教材失败')
      }
    } catch (error) {
      console.error('更新教材失败:', error)
      toast.error('更新教材失败')
    }
  }

  // 删除教材
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个教材吗？此操作不可恢复。')) return
    
    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('教材删除成功')
        fetchMaterials() // 刷新列表
      } else {
        throw new Error('删除教材失败')
      }
    } catch (error) {
      console.error('删除教材失败:', error)
      toast.error('删除教材失败')
    }
  }

  const handleSubmit = async () => {
    if (!materialTitle.trim()) {
      alert('请输入教材标题')
      return
    }

    setIsSubmitting(true)
    
    try {
      if (activeTab === 'text' && textContent.trim()) {
        // 提交文本内容
        console.log('提交文本内容，标题:', materialTitle, '内容长度:', textContent.length)
        try {
          const response = await fetch('/api/materials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: materialTitle,
              content: textContent,
              type: 'text'
            })
          })
          
          console.log('文本提交响应状态:', response.status, response.statusText)
          if (response.ok) {
            const result = await response.json()
            console.log('文本提交成功，响应数据:', result)
            console.log('文本提交成功，准备导航到AI生成页面')
            toast.success('教材提交成功！')
            // 确保使用正确的路由路径
            navigate('/ai-generator')
          } else {
            // 处理非200响应
            let errorMessage = '文本提交失败'
            try {
              const errorData = await response.json()
              console.error('文本提交失败，服务器返回:', errorData)
              errorMessage = errorData.message || errorData.error || `提交失败: ${response.status} ${response.statusText}`
            } catch (parseError) {
              // 如果响应不是JSON格式
              const errorText = await response.text()
              console.error('文本提交失败，错误响应:', errorText)
              errorMessage = `提交失败: ${response.status} ${response.statusText} - ${errorText}`
            }
            throw new Error(errorMessage)
          }
        } catch (fetchError) {
          console.error('文本提交网络错误:', fetchError)
          throw new Error(`文本提交网络错误: ${fetchError instanceof Error ? fetchError.message : '连接服务器失败'}`)
        }
      } else if (activeTab === 'upload' && uploadedFiles.length > 0) {
        // 提交文件
        for (const uploadedFile of uploadedFiles) {
          if (uploadedFile.file) {
            console.log('准备上传文件:', uploadedFile.name, '类型:', uploadedFile.type, '大小:', formatFileSize(uploadedFile.size))
            const formData = new FormData()
            formData.append('title', materialTitle)
            formData.append('file', uploadedFile.file)
            formData.append('type', 'file')
            
            try {
              console.log('发送文件上传请求...')
              const response = await fetch('/api/materials/upload', {
                method: 'POST',
                body: formData
              })
              
              console.log('文件上传响应状态:', response.status, response.statusText)
              if (response.ok) {
                const result = await response.json()
                console.log('文件上传成功，响应数据:', result)
              } else {
                // 处理非200响应
                let errorMessage = '文件上传失败'
                try {
                  const errorData = await response.json()
                  console.error('文件上传失败，服务器返回:', errorData)
                  errorMessage = errorData.message || errorData.error || `文件 ${uploadedFile.name} 上传失败: ${response.status}`
                } catch (parseError) {
                  // 如果响应不是JSON格式
                  const errorText = await response.text()
                  console.error('文件上传失败，错误响应:', errorText)
                  errorMessage = `文件 ${uploadedFile.name} 上传失败: ${response.status} - ${errorText}`
                }
                throw new Error(errorMessage)
              }
            } catch (fetchError) {
              console.error(`文件 ${uploadedFile.name} 上传网络错误:`, fetchError)
              throw new Error(`文件 ${uploadedFile.name} 上传失败: ${fetchError instanceof Error ? fetchError.message : '连接服务器失败'}`)
            }
          }
        }
        
        console.log('所有文件上传成功，准备导航到AI生成页面')
        toast.success('文件上传成功！')
        // 确保使用正确的路由路径
        navigate('/ai-generator')
      }
    } catch (error) {
      console.error('提交失败:', error)
      toast.error(`提交失败，请重试: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = activeTab !== 'manage' && materialTitle.trim().length > 0 && (
    (activeTab === 'text' && textContent.trim().length > 0) || 
    (activeTab === 'upload' && uploadedFiles.length > 0)
  )

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">教材输入</h1>
        <p className="mt-2 text-sm text-gray-600">
          上传教材文档或直接输入文本内容，系统将基于此内容进行AI自动命题
        </p>
      </div>

      {/* 选项卡 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('upload')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              文档上传
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'text'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              文本输入
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'manage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <List className="h-4 w-4 inline mr-2" />
              教材管理
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* 教材标题输入 - 仅在上传和文本输入模式显示 */}
          {activeTab !== 'manage' && (
            <div className="mb-6">
              <label htmlFor="material-title" className="block text-sm font-medium text-gray-700 mb-2">
                教材标题 *
              </label>
              <input
                id="material-title"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入教材标题，例如：人力资源管理基础知识"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
              />
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              {/* 文件上传区域 */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-medium text-gray-900">
                      拖拽文件到此处或
                      <span className="text-blue-600 hover:text-blue-500"> 点击上传</span>
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileInput}
                    />
                  </label>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  支持 PDF、Word、TXT 格式，单个文件最大 10MB
                </p>
              </div>

              {/* 已上传文件列表 */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">已上传文件</h3>
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file.type, file.name)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <button
                            onClick={() => removeFile(file.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="text-content" className="block text-sm font-medium text-gray-700 mb-2">
                  教材文本内容
                </label>
                <textarea
                  id="text-content"
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入或粘贴教材文本内容...\n\n例如：\n人力资源管理是指企业运用现代管理方法，对人力资源的获取、开发、保持和利用等方面所进行的计划、组织、指挥、控制和协调等一系列活动..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>支持直接粘贴教材内容，系统将自动分析并生成试题</span>
                  <span>{textContent.length} 字符</span>
                </div>
              </div>

              {textContent.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">内容预览</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>已输入 {textContent.length} 个字符</p>
                        <p>预计可生成 {Math.max(1, Math.floor(textContent.length / 200))} 道试题</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 教材管理列表 */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">已上传教材列表</h3>
                <button
                  onClick={fetchMaterials}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  disabled={loadingMaterials}
                >
                  {loadingMaterials ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  刷新列表
                </button>
              </div>
              
              {loadingMaterials ? (
                <MaterialInputSkeleton />
              ) : materials.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">暂无教材</h3>
                  <p className="mt-1 text-sm text-gray-500">您还没有上传任何教材，请使用文档上传或文本输入功能添加教材</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materials.map((material) => (
                    <div key={material.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-3">
                            {material.file_type === 'application/pdf' ? (
                              <File className="h-8 w-8 text-red-500 flex-shrink-0" />
                            ) : material.file_type === 'text' ? (
                              <FileText className="h-8 w-8 text-gray-500 flex-shrink-0" />
                            ) : (
                              <File className="h-8 w-8 text-blue-500 flex-shrink-0" />
                            )}
                            <div>
                              <h4 className="text-base font-medium text-gray-900">{material.title}</h4>
                              <div className="mt-1 flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                  {new Date(material.created_at).toLocaleString()}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                  {material.file_type === 'application/pdf' ? 'PDF文档' : 
                                   material.file_type === 'text' ? '文本内容' : 
                                   material.file_type === 'application/msword' ? 'Word文档' : 
                                   '文档'}
                                </span>
                                {material.metadata?.size && (
                                  <span className="text-xs text-gray-500">
                                    {formatFileSize(material.metadata.size)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(material)}
                              className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                              title="编辑教材"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(material.id)}
                              className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                              title="删除教材"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 提交按钮 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {activeTab === 'upload' 
                ? `已选择 ${uploadedFiles.length} 个文件`
                : activeTab === 'text' 
                ? `已输入 ${textContent.length} 个字符`
                : `已加载 ${materials.length} 个教材`
              }
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={cn(
                'px-6 py-2 rounded-md font-medium text-sm transition-colors flex items-center space-x-2',
                canSubmit && !isSubmitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isSubmitting ? '提交中...' : '开始AI分析'}</span>
            </button>
          </div>
        </div>
        
        {/* 编辑教材模态框 */}
        {showEditModal && editingMaterial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">编辑教材</h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-2">
                      教材标题
                    </label>
                    <input
                      id="edit-title"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  
                  {editingMaterial.file_type === 'text' && (
                    <div>
                      <label htmlFor="edit-content" className="block text-sm font-medium text-gray-700 mb-2">
                        教材内容
                      </label>
                      <textarea
                        id="edit-content"
                        rows={15}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                      />
                      <div className="mt-2 text-xs text-gray-500 text-right">
                        {editContent.length} 字符
                      </div>
                    </div>
                  )}
                  
                  {editingMaterial.file_type !== 'text' && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                        <p className="text-sm text-gray-700">
                          上传的文档内容不支持在线编辑，仅可修改标题。如需修改内容，请重新上传文档。
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  disabled={!editTitle.trim()}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}