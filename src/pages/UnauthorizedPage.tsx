/**
 * 未授权页面
 * 当用户权限不足时显示
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../stores/authStore';

const UnauthorizedPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const message = location.state?.message || '您没有权限访问此页面';
  const from = location.state?.from?.pathname || '/';
  
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };
  
  const handleGoHome = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* 图标 */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <ShieldX className="h-8 w-8 text-red-600" />
            </div>
            
            {/* 标题 */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              访问被拒绝
            </h2>
            
            {/* 消息 */}
            <p className="text-gray-600 mb-2">
              {message}
            </p>
            
            {/* 用户信息 */}
            {user && (
              <p className="text-sm text-gray-500 mb-6">
                当前用户：{user.name} ({user.email})
              </p>
            )}
            
            {/* 操作按钮 */}
            <div className="space-y-3">
              <button
                onClick={handleGoBack}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回上一页
              </button>
              
              <button
                onClick={handleGoHome}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Home className="w-4 h-4 mr-2" />
                回到首页
              </button>
            </div>
            
            {/* 帮助信息 */}
            <div className="mt-6 text-sm text-gray-500">
              <p>如果您认为这是一个错误，请联系系统管理员。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;