import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Home, 
  Upload, 
  Bot, 
  CheckCircle, 
  Database,
  Brain,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '../stores/authStore'
import PermissionGuard from './auth/PermissionGuard'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: '工作台', href: '/', icon: Home },
  { name: '教材输入', href: '/material-input', icon: Upload },
  { name: 'AI生成工作台', href: '/ai-generator', icon: Bot },
  { name: '试题审核', href: '/question-review', icon: CheckCircle },
  { name: '题库管理', href: '/question-bank', icon: Database },
  { name: '用户管理', href: '/admin/users', icon: Users },
  { name: '系统管理', href: '/admin/system', icon: Shield },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900 hidden sm:block">HR搏学AI命题</span>
            <span className="text-lg font-bold text-gray-900 sm:hidden">HR搏学</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              
              // 根据权限控制导航项显示
              let permissionConfig = {}
              if (item.href === '/material-input') {
                permissionConfig = { permissions: ['materials.create'] }
              } else if (item.href === '/ai-generator') {
                permissionConfig = { permissions: ['questions.generate'] }
              } else if (item.href === '/question-review') {
                permissionConfig = { roles: ['reviewer', 'admin'] }
              } else if (item.href === '/admin/users') {
                permissionConfig = { roles: ['admin'] }
              } else if (item.href === '/admin/system') {
                permissionConfig = { roles: ['admin'] }
              }
              
              const navItem = (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0',
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              )
              
              // 如果需要权限控制，使用PermissionGuard包装
              if (Object.keys(permissionConfig).length > 0) {
                return (
                  <PermissionGuard key={item.name} {...permissionConfig}>
                    {navItem}
                  </PermissionGuard>
                )
              }
              
              return navItem
            })}
          </ul>
        </nav>
        
        {/* 用户信息区域 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || '用户'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {/* 用户下拉菜单 */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    navigate('/profile')
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  个人设置
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="lg:pl-64">
        {/* 移动端顶部导航栏 */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-900">HR搏学AI命题</span>
            </div>
            
            {/* 移动端用户菜单 */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 p-1 rounded-md text-gray-400 hover:text-gray-600"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/profile')
                    }}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    个人设置
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="py-4 lg:py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}