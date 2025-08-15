/**
 * 权限调试页面
 * 用于检查用户权限数据和权限检查逻辑
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../stores/authStore';
import { authService } from '../services/authService';
import PermissionGuard from '../components/auth/PermissionGuard';
import { Shield, User, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface PermissionCheckResult {
  permission: string;
  hasPermission: boolean;
  description: string;
}

interface RoleCheckResult {
  role: string;
  hasRole: boolean;
  description: string;
}

export default function DebugPermissionsPage() {
  const { user, isAuthenticated, loading, hasPermission, hasRole } = useAuth();
  const [rawUserData, setRawUserData] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 需要检查的权限列表
  const permissionsToCheck: PermissionCheckResult[] = [
    { permission: 'materials.create', hasPermission: false, description: '创建教材权限（教材输入菜单）' },
    { permission: 'questions.generate', hasPermission: false, description: '生成试题权限（AI工作台菜单）' },
    { permission: 'questions.review', hasPermission: false, description: '审核试题权限（试题审核菜单）' },
    { permission: 'users.manage', hasPermission: false, description: '用户管理权限（用户管理菜单）' },
    { permission: 'system.manage', hasPermission: false, description: '系统管理权限（系统管理菜单）' }
  ];

  // 需要检查的角色列表
  const rolesToCheck: RoleCheckResult[] = [
    { role: 'user', hasRole: false, description: '普通用户角色' },
    { role: 'reviewer', hasRole: false, description: '审核员角色' },
    { role: 'admin', hasRole: false, description: '管理员角色' }
  ];

  // 更新权限检查结果
  const updatePermissionChecks = () => {
    console.log('🔍 更新权限检查结果...');
    console.log('当前用户数据:', user);
    console.log('用户权限数组:', user?.permissions);
    console.log('用户角色数组:', user?.roles);
    
    if (user?.permissions) {
      permissionsToCheck.forEach(check => {
        const hasPermission = user.permissions.includes(check.permission);
        check.hasPermission = hasPermission;
        console.log(`权限检查 ${check.permission}: ${hasPermission}`);
      });
    } else {
      console.log('⚠️ 用户权限数据为空');
    }
    
    if (user?.roles) {
      rolesToCheck.forEach(check => {
        const hasRole = user.roles.includes(check.role);
        check.hasRole = hasRole;
        console.log(`角色检查 ${check.role}: ${hasRole}`);
      });
    } else {
      console.log('⚠️ 用户角色数据为空');
    }
  };

  // 刷新用户数据
  const refreshUserData = async () => {
    setRefreshing(true);
    setApiError(null);
    
    try {
      // 直接调用API获取最新用户数据
      const response = await authService.getCurrentUser();
      setRawUserData(response);
      
      if (!response.success) {
        setApiError(response.message || '获取用户数据失败');
      }
    } catch (error: any) {
      setApiError(error.message || '网络请求失败');
      console.error('刷新用户数据失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    updatePermissionChecks();
    if (isAuthenticated) {
      refreshUserData();
    }
  }, [user, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">未登录</h2>
          <p className="text-gray-600">请先登录后再查看权限信息</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">权限调试页面</h1>
          </div>
          <p className="mt-2 text-gray-600">检查当前用户的权限数据和权限检查逻辑</p>
        </div>

        {/* 刷新按钮 */}
        <div className="mb-6">
          <button
            onClick={refreshUserData}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                刷新中...
              </>
            ) : (
              '刷新用户数据'
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 用户基本信息 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-4">
              <User className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">用户基本信息</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">用户ID:</span>
                <p className="text-sm text-gray-900">{user?.id || '未知'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">邮箱:</span>
                <p className="text-sm text-gray-900">{user?.email || '未知'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">姓名:</span>
                <p className="text-sm text-gray-900">{user?.name || '未知'}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">组织:</span>
                <p className="text-sm text-gray-900">{user?.organization || '未设置'}</p>
              </div>
            </div>
          </div>

          {/* 角色信息 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">角色检查</h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">当前角色:</span>
                <div className="mt-1">
                  {user?.roles && user.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role: string) => (
                        <span key={role} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {role}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-red-600">无角色数据</span>
                  )}
                </div>
              </div>
              
              {rolesToCheck.map((roleCheck) => (
                <div key={roleCheck.role} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{roleCheck.role}</p>
                    <p className="text-xs text-gray-500">{roleCheck.description}</p>
                  </div>
                  <div className="flex items-center">
                    {roleCheck.hasRole ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 权限信息 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">权限检查</h2>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">权限总数:</span>
                <p className="text-sm text-gray-900">{user?.permissions?.length || 0}</p>
              </div>
              
              {user?.permissions && user.permissions.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">所有权限:</span>
                  <div className="mt-1 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.map((permission: string) => (
                        <span key={permission} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-500">关键权限检查:</span>
                {permissionsToCheck.map((permCheck) => (
                  <div key={permCheck.permission} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{permCheck.permission}</p>
                      <p className="text-xs text-gray-500">{permCheck.description}</p>
                    </div>
                    <div className="flex items-center">
                      {permCheck.hasPermission ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* useAuth 钩子测试 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">useAuth 钩子权限检查测试</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">权限检查结果</h3>
                  <div className="space-y-2">
                    <div className={`p-2 rounded ${hasPermission('materials.create') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      materials.create: {hasPermission('materials.create') ? '✅ 有权限' : '❌ 无权限'}
                    </div>
                    <div className={`p-2 rounded ${hasPermission('questions.generate') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      questions.generate: {hasPermission('questions.generate') ? '✅ 有权限' : '❌ 无权限'}
                    </div>
                    <div className={`p-2 rounded ${hasRole('admin') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      admin角色: {hasRole('admin') ? '✅ 有角色' : '❌ 无角色'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">认证状态</h3>
                  <div className="space-y-2">
                    <div className={`p-2 rounded ${isAuthenticated ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      认证状态: {isAuthenticated ? '✅ 已登录' : '❌ 未登录'}
                    </div>
                    <div className={`p-2 rounded ${user ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      用户对象: {user ? '✅ 存在' : '❌ 不存在'}
                    </div>
                    <div className={`p-2 rounded ${user?.permissions?.length ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      权限数组: {user?.permissions?.length ? `✅ ${user.permissions.length}个权限` : '❌ 无权限数据'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PermissionGuard 测试 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">PermissionGuard 组件测试</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">教材输入权限测试</h3>
                <PermissionGuard permissions={['materials.create']}>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">✅ 可以看到教材输入菜单</p>
                  </div>
                </PermissionGuard>
                <PermissionGuard permissions={['materials.create']} fallback={
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">❌ 无法看到教材输入菜单</p>
                  </div>
                } hideOnNoPermission={false}>
                  <></>
                </PermissionGuard>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">AI工作台权限测试</h3>
                <PermissionGuard permissions={['questions.generate']}>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">✅ 可以看到AI工作台菜单</p>
                  </div>
                </PermissionGuard>
                <PermissionGuard permissions={['questions.generate']} fallback={
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">❌ 无法看到AI工作台菜单</p>
                  </div>
                } hideOnNoPermission={false}>
                  <></>
                </PermissionGuard>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">管理员角色测试</h3>
                <PermissionGuard roles={['admin']}>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">✅ 拥有管理员权限</p>
                  </div>
                </PermissionGuard>
                <PermissionGuard roles={['admin']} fallback={
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">❌ 非管理员用户</p>
                  </div>
                } hideOnNoPermission={false}>
                  <></>
                </PermissionGuard>
              </div>
            </div>
          </div>
        </div>

        {/* API 响应数据 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API 响应数据</h2>
          
          {apiError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">API 错误: {apiError}</p>
            </div>
          )}
          
          <div className="bg-gray-50 rounded-md p-4 overflow-auto">
            <pre className="text-xs text-gray-800">
              {JSON.stringify(rawUserData, null, 2)}
            </pre>
          </div>
        </div>

        {/* authStore 数据 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">authStore 用户数据</h2>
          
          <div className="bg-gray-50 rounded-md p-4 overflow-auto">
            <pre className="text-xs text-gray-800">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}