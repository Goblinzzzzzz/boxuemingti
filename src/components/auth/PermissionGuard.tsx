/**
 * 权限检查组件
 * 用于在组件级别进行权限控制
 */
import React from 'react';
import { useAuth } from '../../stores/authStore';

interface PermissionGuardProps {
  children: React.ReactNode;
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean; // 是否需要满足所有条件，默认为false（满足任一条件即可）
  fallback?: React.ReactNode; // 权限不足时显示的内容
  hideOnNoPermission?: boolean; // 权限不足时是否隐藏，默认为true
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  roles = [],
  permissions = [],
  requireAll = false,
  fallback = null,
  hideOnNoPermission = true
}) => {
  const { hasRole, hasPermission, hasAnyRole, hasAnyPermission, isAuthenticated } = useAuth();
  
  // 如果未登录，根据hideOnNoPermission决定是否显示
  if (!isAuthenticated) {
    return hideOnNoPermission ? null : (fallback || <></>);
  }
  
  let hasAccess = true;
  
  // 检查角色权限
  if (roles.length > 0) {
    if (requireAll) {
      // 需要拥有所有指定角色
      hasAccess = roles.every(role => hasRole(role));
    } else {
      // 只需要拥有任一指定角色
      hasAccess = hasAnyRole(roles);
    }
  }
  
  // 检查操作权限
  if (hasAccess && permissions.length > 0) {
    if (requireAll) {
      // 需要拥有所有指定权限
      hasAccess = permissions.every(permission => hasPermission(permission));
    } else {
      // 只需要拥有任一指定权限
      hasAccess = hasAnyPermission(permissions);
    }
  }
  
  // 如果没有权限
  if (!hasAccess) {
    if (hideOnNoPermission) {
      return null;
    }
    return fallback || <></>;
  }
  
  // 有权限，渲染子组件
  return <>{children}</>;
};

export default PermissionGuard;