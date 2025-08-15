/**
 * 角色分配模态框组件
 * 提供可视化的用户角色选择和修改界面
 */
import React, { useState, useEffect } from 'react';
import { X, Shield, User, Eye, Settings, Check } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface User {
  id: string;
  email: string;
  name: string;
  organization?: string;
  roles: string[];
  permissions: string[];
  created_at: string;
  last_login_at?: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface RoleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  users?: User[];
  roles: Role[];
  onAssignRole: (userId: string, roleIds: string[]) => Promise<void>;
  loading?: boolean;
  isBatch?: boolean;
}

const RoleAssignmentModal: React.FC<RoleAssignmentModalProps> = ({
  isOpen,
  onClose,
  user,
  users = [],
  roles,
  onAssignRole,
  loading = false,
  isBatch = false
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isBatch) {
        setSelectedRoles([]);
      } else if (user) {
        // 根据用户当前角色名称找到对应的角色ID
        const userRoles = user.roles && Array.isArray(user.roles) ? user.roles : [];
        const currentRoleIds = userRoles
          .map(roleName => roles.find(role => role.name === roleName)?.id)
          .filter(Boolean) as string[];
        setSelectedRoles(currentRoleIds);
      }
    }
  }, [user, users, roles, isOpen, isBatch]);

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const handleSubmit = async () => {
    if (isBatch && users.length === 0) return;
    if (!isBatch && !user) return;
    
    setSubmitting(true);
    try {
      if (isBatch) {
        for (const u of users) {
          await onAssignRole(u.id, selectedRoles);
        }
      } else if (user) {
        await onAssignRole(user.id, selectedRoles);
      }
      onClose();
    } catch (error) {
      console.error('角色分配失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return <Shield className="h-5 w-5 text-red-600" />;
      case 'reviewer':
        return <Eye className="h-5 w-5 text-yellow-600" />;
      case 'user':
        return <User className="h-5 w-5 text-blue-600" />;
      default:
        return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return 'border-red-200 bg-red-50';
      case 'reviewer':
        return 'border-yellow-200 bg-yellow-50';
      case 'user':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getSelectedPermissions = () => {
    const allPermissions = new Set<string>();
    selectedRoles.forEach(roleId => {
      const role = roles.find(r => r.id === roleId);
      if (role && role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach(permission => allPermissions.add(permission));
      }
    });
    return Array.from(allPermissions);
  };

  if (!isOpen || (!user && !isBatch)) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">角色分配</h3>
            <p className="text-sm text-gray-600 mt-1">
              {isBatch ? (
                `批量为 ${users.length} 个用户分配角色`
              ) : (
                <>为用户 <span className="font-medium">{user?.name}</span> ({user?.email}) 分配角色</>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 当前角色显示 */}
          {!isBatch && user && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">当前角色</h4>
              <div className="flex flex-wrap gap-2">
                {(user.roles && Array.isArray(user.roles) ? user.roles : []).length > 0 ? (
                  (user.roles && Array.isArray(user.roles) ? user.roles : []).map((roleName, index) => {
                    const role = roles.find(r => r.name === roleName);
                    return (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                      >
                        {getRoleIcon(roleName)}
                        {role?.description || roleName}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-gray-500">暂无角色</span>
                )}
              </div>
            </div>
          )}

          {/* 批量操作用户列表 */}
          {isBatch && users.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">选中用户</h4>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {users.map((u, index) => (
                  <div key={u.id} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700">{u.name} ({u.email})</span>
                    <div className="flex flex-wrap gap-1">
                      {(u.roles && Array.isArray(u.roles) ? u.roles : []).slice(0, 2).map(roleName => (
                        <span key={roleName} className="text-xs bg-gray-200 text-gray-600 px-1 rounded">
                          {roleName}
                        </span>
                      ))}
                      {(u.roles && Array.isArray(u.roles) && u.roles.length > 2) && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-1 rounded">
                          +{u.roles.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 角色选择 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">选择角色</h4>
            <div className="grid grid-cols-1 gap-3">
              {roles.map(role => {
                const isSelected = selectedRoles.includes(role.id);
                return (
                  <div
                    key={role.id}
                    className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? `${getRoleColor(role.name)} border-current`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => handleRoleToggle(role.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getRoleIcon(role.name)}
                        <div>
                          <h5 className="font-medium text-gray-900">{role.description}</h5>
                          <p className="text-sm text-gray-600 mt-1">{role.name}</p>
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">权限:</p>
                            <div className="flex flex-wrap gap-1">
                              {(role.permissions && Array.isArray(role.permissions) ? role.permissions : []).slice(0, 3).map(permission => (
                                <span
                                  key={permission}
                                  className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                                >
                                  {permission}
                                </span>
                              ))}
                              {(role.permissions && Array.isArray(role.permissions) && role.permissions.length > 3) && (
                                <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                  +{role.permissions.length - 3} 更多
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 权限预览 */}
          {selectedRoles.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">权限预览</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {getSelectedPermissions().map(permission => (
                    <span
                      key={permission}
                      className="inline-block px-2 py-1 text-xs bg-white text-gray-700 rounded border"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
                {getSelectedPermissions().length === 0 && (
                  <p className="text-sm text-gray-500">选择角色后将显示对应权限</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedRoles.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                分配中...
              </>
            ) : (
              '确认分配'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleAssignmentModal;