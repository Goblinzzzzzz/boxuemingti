/**
 * 注册页面
 * 用户注册界面，包含表单验证和错误处理
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Building, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../stores/authStore';
import { RegisterFormState } from '../types/auth';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, loading, error, clearError } = useAuth();
  
  const [formState, setFormState] = useState<RegisterFormState>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    organization: '',
    loading: false,
    errors: {}
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  // 如果已登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  // 清除错误信息
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);
  
  // 表单验证
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    // 邮箱验证
    if (!formState.email) {
      errors.email = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    // 姓名验证
    if (!formState.name) {
      errors.name = '请输入姓名';
    } else if (formState.name.length < 2) {
      errors.name = '姓名长度至少为2位';
    }
    
    // 密码验证
    if (!formState.password) {
      errors.password = '请输入密码';
    } else if (formState.password.length < 6) {
      errors.password = '密码长度至少为6位';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(formState.password)) {
      errors.password = '密码必须包含字母和数字';
    }
    
    // 确认密码验证
    if (!formState.confirmPassword) {
      errors.confirmPassword = '请确认密码';
    } else if (formState.password !== formState.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
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
      const success = await register({
        email: formState.email,
        password: formState.password,
        name: formState.name,
        organization: formState.organization || undefined
      });
      
      if (success) {
        setRegistrationSuccess(true);
        // 3秒后跳转到登录页
        setTimeout(() => {
          navigate('/login', {
            state: { message: '注册成功，请登录您的账户' }
          });
        }, 3000);
      }
    } finally {
      setFormState(prev => ({ ...prev, loading: false }));
    }
  };
  
  // 处理输入变化
  const handleInputChange = (field: keyof RegisterFormState, value: string) => {
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
  
  // 注册成功页面
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              注册成功！
            </h2>
            <p className="text-gray-600 mb-4">
              您的账户已创建成功，正在跳转到登录页面...
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 头部 */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            创建新账户
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            加入 HR搏学命题系统
          </p>
        </div>
        
        {/* 注册表单 */}
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
                邮箱地址 <span className="text-red-500">*</span>
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
            
            {/* 姓名输入 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                姓名 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formState.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formState.errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入您的姓名"
                  disabled={isSubmitting}
                />
              </div>
              {formState.errors.name && (
                <p className="mt-1 text-sm text-red-600">{formState.errors.name}</p>
              )}
            </div>
            
            {/* 组织机构输入 */}
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                组织机构
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="organization"
                  name="organization"
                  type="text"
                  autoComplete="organization"
                  value={formState.organization}
                  onChange={(e) => handleInputChange('organization', e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入您的组织机构（可选）"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formState.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formState.errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入密码（至少6位，包含字母和数字）"
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
            
            {/* 确认密码输入 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formState.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formState.errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请再次输入密码"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {formState.errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{formState.errors.confirmPassword}</p>
              )}
            </div>
            
            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>注册中...</span>
                </div>
              ) : (
                '注册账户'
              )}
            </button>
          </div>
          
          {/* 登录链接 */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              已有账户？{' '}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                立即登录
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;