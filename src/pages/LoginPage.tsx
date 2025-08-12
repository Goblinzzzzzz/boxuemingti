/**
 * 登录页面
 * 用户登录界面，包含表单验证和错误处理
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../stores/authStore';
import { LoginFormState } from '../types/auth';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading, error, clearError } = useAuth();
  
  const [formState, setFormState] = useState<LoginFormState>({
    email: '',
    password: '',
    remember: false,
    loading: false,
    errors: {}
  });
  
  const [showPassword, setShowPassword] = useState(false);
  
  // 获取重定向路径
  const from = (location.state as any)?.from?.pathname || '/dashboard';
  
  // 如果已登录，重定向到目标页面
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);
  
  // 清除错误信息
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);
  
  // 表单验证
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (!formState.email) {
      errors.email = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    if (!formState.password) {
      errors.password = '请输入密码';
    } else if (formState.password.length < 6) {
      errors.password = '密码长度至少为6位';
    }
    
    setFormState(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };
  
  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setFormState(prev => ({ ...prev, loading: true }));
    
    try {
      const success = await login({
        email: formState.email,
        password: formState.password
      });
      
      if (success) {
        // 登录成功，导航将由 useEffect 处理
      }
    } finally {
      setFormState(prev => ({ ...prev, loading: false }));
    }
  };
  
  // 处理输入变化
  const handleInputChange = (field: keyof LoginFormState, value: string | boolean) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
      errors: {
        ...prev.errors,
        [field]: '' // 清除该字段的错误
      }
    }));
    
    // 清除全局错误
    if (error) {
      clearError();
    }
  };
  
  const isSubmitting = loading || formState.loading;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 头部 */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            登录您的账户
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            欢迎回到 HR搏学命题系统
          </p>
        </div>
        
        {/* 登录表单 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            {/* 全局错误信息 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            
            {/* 邮箱输入 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱地址
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formState.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formState.errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入您的邮箱地址"
                  disabled={isSubmitting}
                />
              </div>
              {formState.errors.email && (
                <p className="mt-1 text-sm text-red-600">{formState.errors.email}</p>
              )}
            </div>
            
            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formState.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formState.errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入您的密码"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {formState.errors.password && (
                <p className="mt-1 text-sm text-red-600">{formState.errors.password}</p>
              )}
            </div>
            
            {/* 记住我 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={formState.remember}
                  onChange={(e) => handleInputChange('remember', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                  记住我
                </label>
              </div>
              
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  忘记密码？
                </Link>
              </div>
            </div>
            
            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>登录中...</span>
                </div>
              ) : (
                '登录'
              )}
            </button>
          </div>
          
          {/* 注册链接 */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              还没有账户？{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                立即注册
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;