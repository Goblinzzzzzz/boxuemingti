/**
 * 路由守卫组件
 * 保护需要认证和特定权限的路由
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../stores/authStore';
import { RouteGuardConfig } from '../../types/auth';
import LoadingSpinner from '../common/LoadingSpinner';
import { authService } from '../../services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  config?: RouteGuardConfig;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  config = { requireAuth: true } 
}) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    user, 
    loading, 
    initialize, 
    hasRole, 
    hasPermission, 
    hasAnyRole, 
    hasAnyPermission 
  } = useAuth();
  
  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" text="正在验证身份..." />
      </div>
    );
  }
  
  // 检查是否需要认证
  if (config.requireAuth && !isAuthenticated) {
    return (
      <Navigate 
        to={config.redirectTo || '/login'} 
        state={{ from: location }} 
        replace 
      />
    );
  }
  
  // 如果已认证但用户信息不存在，重定向到登录页
  if (config.requireAuth && isAuthenticated && !user) {
    return (
      <Navigate 
        to={config.redirectTo || '/login'} 
        state={{ from: location }} 
        replace 
      />
    );
  }
  
  // 检查角色权限
  if (config.requiredRoles && config.requiredRoles.length > 0) {
    const hasRequiredRole = hasAnyRole(config.requiredRoles);
    if (!hasRequiredRole) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            from: location,
            message: `需要以下角色之一：${config.requiredRoles.join(', ')}` 
          }} 
          replace 
        />
      );
    }
  }
  
  // 检查权限
  if (config.requiredPermissions && config.requiredPermissions.length > 0) {
    const hasRequiredPermission = hasAnyPermission(config.requiredPermissions);
    if (!hasRequiredPermission) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            from: location,
            message: `需要以下权限之一：${config.requiredPermissions.join(', ')}` 
          }} 
          replace 
        />
      );
    }
  }
  
  // 所有检查通过，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute;