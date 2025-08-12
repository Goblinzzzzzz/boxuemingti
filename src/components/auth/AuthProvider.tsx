/**
 * 认证提供者组件
 * 在应用启动时初始化认证状态
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../stores/authStore';
import LoadingSpinner from '../common/LoadingSpinner';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initialize, loading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const initAuth = async () => {
      console.log('AuthProvider: 开始认证初始化');
      
      // 设置超时机制，防止无限等待
      timeoutId = setTimeout(() => {
        console.warn('AuthProvider: 认证初始化超时，强制完成初始化');
        setInitTimeout(true);
        setIsInitialized(true);
      }, 10000); // 10秒超时
      
      try {
        await initialize();
        console.log('AuthProvider: 认证初始化成功');
      } catch (error) {
        console.error('AuthProvider: 认证初始化失败:', error);
      } finally {
        clearTimeout(timeoutId);
        setIsInitialized(true);
        console.log('AuthProvider: 认证初始化完成');
      }
    };
    
    initAuth();
    
    // 清理函数
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // 移除initialize依赖，只在组件挂载时执行一次
  
  // 如果正在初始化且未超时，显示加载状态
  if (!isInitialized && !initTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" text="正在初始化应用..." />
      </div>
    );
  }
  
  // 如果超时，显示提示信息
  if (initTimeout) {
    console.warn('AuthProvider: 初始化超时，继续渲染应用');
  }
  
  return <>{children}</>;
};

export default AuthProvider;