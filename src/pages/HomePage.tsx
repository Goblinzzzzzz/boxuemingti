import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Upload, 
  Bot, 
  CheckCircle, 
  Database,
  ArrowRight,
  Target,
  Zap,
  Shield,
  Brain
} from 'lucide-react'

const features = [
  {
    name: 'AI智能生成',
    description: '基于教材内容自动生成标准化试题',
    icon: Brain,
    color: 'text-purple-600 bg-purple-100'
  },
  {
    name: '智能分级识别',
    description: '自动识别并标注知识点分级',
    icon: Zap,
    color: 'text-yellow-600 bg-yellow-100'
  },
  {
    name: '规范严格遵循',
    description: '完全按照《第五届HR搏学命题要求规范》生成',
    icon: Shield,
    color: 'text-green-600 bg-green-100'
  }
]

const quickActions = [
  {
    name: '上传教材',
    description: '上传教材文档或输入文本内容',
    href: '/material-input',
    icon: Upload,
    color: 'bg-blue-600 hover:bg-blue-700'
  },
  {
    name: 'AI自动命题',
    description: '智能分析教材并自动生成试题',
    href: '/ai-generator',
    icon: Bot,
    color: 'bg-green-600 hover:bg-green-700'
  },
  {
    name: '查看题库',
    description: '浏览和管理生成的试题',
    href: '/question-bank',
    icon: Database,
    color: 'bg-purple-600 hover:bg-purple-700'
  }
]

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl">
          HR搏学AI自动命题系统
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-gray-600 max-w-4xl mx-auto">
          基于人工智能的智能命题平台，输入教材即可自动生成符合《第五届HR搏学命题要求规范》的标准试题
        </p>
      </div>

      {/* 系统特性 */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.name} className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start sm:items-center">
              <div className={`rounded-lg p-2 sm:p-3 ${feature.color} flex-shrink-0`}>
                <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="ml-3 sm:ml-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">{feature.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">快速开始</h2>
          <p className="text-sm text-gray-600">选择一个操作开始您的命题工作</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                className={`group relative rounded-lg p-4 sm:p-6 text-white transition-all hover:scale-105 ${action.color}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <action.icon className="h-6 w-6 sm:h-8 sm:w-8 mb-2 sm:mb-3" />
                    <h3 className="text-base sm:text-lg font-medium">{action.name}</h3>
                    <p className="text-xs sm:text-sm opacity-90 mt-1">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* AI命题流程说明 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">AI自动命题流程</h2>
          <p className="text-sm text-gray-600">一键生成，标准输出的智能命题流程</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flow-root">
            <ul className="-mb-8">
              {[
                { step: 1, title: '上传教材内容', desc: '支持PDF、Word、TXT文档或直接文本输入' },
                { step: 2, title: 'AI智能分析', desc: '自动识别教材结构和关键知识点' },
                { step: 3, title: '识别知识分级', desc: '智能判断HR掌握、全员掌握、全员熟悉、全员了解' },
                { step: 4, title: '确定题型分布', desc: '根据知识点特性自动选择合适题型' },
                { step: 5, title: '自动生成试题', desc: 'AI按规范生成题干、选项和三段式解析' },
                { step: 6, title: '质量检查验证', desc: '自动检查规范性、逻辑性和完整性' },
                { step: 7, title: '审核与入库', desc: '支持手动微调后批量保存到题库' }
              ].map((item, index, array) => (
                <li key={item.step}>
                  <div className="relative pb-6 sm:pb-8">
                    {index !== array.length - 1 && (
                      <span className="absolute left-3 sm:left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" />
                    )}
                    <div className="relative flex space-x-3">
                      <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-purple-600 text-white text-xs sm:text-sm font-medium flex-shrink-0">
                        {item.step}
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1 sm:pt-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm sm:text-base font-medium text-gray-900">{item.title}</p>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}