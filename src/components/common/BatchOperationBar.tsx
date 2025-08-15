/**
 * 批量操作工具栏组件
 * 支持批量选择用户并进行状态修改、角色分配等操作
 */
import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  Trash2, 
  X,
  ChevronDown
} from 'lucide-react';

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

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface BatchOperationBarProps {
  selectedUsers: string[];
  allUsers: User[];
  roles: Role[];
  onSelectAll: (selected: boolean) => void;
  onClearSelection: () => void;
  onBatchStatusChange: (userIds: string[], status: 'active' | 'suspended') => Promise<void>;
  onBatchRoleAssign: (userIds: string[], roleIds: string[]) => Promise<void>;
  onBatchDelete: (userIds: string[]) => Promise<void>;
  loading?: boolean;
}

const BatchOperationBar: React.FC<BatchOperationBarProps> = ({
  selectedUsers,
  allUsers,
  roles,
  onSelectAll,
  onClearSelection,
  onBatchStatusChange,
  onBatchRoleAssign,
  onBatchDelete,
  loading = false
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [operating, setOperating] = useState(false);

  const isAllSelected = selectedUsers.length === allUsers.length && allUsers.length > 0;
  const isPartialSelected = selectedUsers.length > 0 && selectedUsers.length < allUsers.length;

  const handleSelectAll = () => {
    onSelectAll(!isAllSelected);
  };

  const handleBatchOperation = async (operation: () => Promise<void>) => {
    setOperating(true);
    try {
      await operation();
      onClearSelection();
    } catch (error) {
      console.error('批量操作失败:', error);
    } finally {
      setOperating(false);
      setShowRoleMenu(false);
      setShowStatusMenu(false);
    }
  };

  const handleStatusChange = (status: 'active' | 'suspended') => {
    handleBatchOperation(() => onBatchStatusChange(selectedUsers, status));
  };

  const handleRoleAssign = (roleId: string) => {
    handleBatchOperation(() => onBatchRoleAssign(selectedUsers, [roleId]));
  };

  const handleBatchDeleteConfirm = () => {
    if (window.confirm(`确定要删除选中的 ${selectedUsers.length} 个用户吗？此操作不可恢复。`)) {
      handleBatchOperation(() => onBatchDelete(selectedUsers));
    }
  };

  if (selectedUsers.length === 0) {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            disabled={loading}
          >
            {isAllSelected ? (
              <CheckSquare className="h-4 w-4" />
            ) : isPartialSelected ? (
              <div className="h-4 w-4 border-2 border-blue-600 bg-blue-600 rounded flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-sm"></div>
              </div>
            ) : (
              <Square className="h-4 w-4" />
            )}
            全选
          </button>
          <span className="text-sm text-gray-500">
            共 {allUsers.length} 个用户
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 transition-colors"
              disabled={loading || operating}
            >
              <CheckSquare className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-blue-900">
              已选择 {selectedUsers.length} 个用户
            </span>
          </div>
          
          <button
            onClick={onClearSelection}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            disabled={loading || operating}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 状态操作菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={loading || operating}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Users className="h-4 w-4" />
              状态操作
              <ChevronDown className="h-3 w-3" />
            </button>
            
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleStatusChange('active')}
                  disabled={operating}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserCheck className="h-4 w-4 text-green-600" />
                  批量启用
                </button>
                <button
                  onClick={() => handleStatusChange('suspended')}
                  disabled={operating}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserX className="h-4 w-4 text-red-600" />
                  批量停用
                </button>
              </div>
            )}
          </div>

          {/* 角色分配菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              disabled={loading || operating}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Shield className="h-4 w-4" />
              角色分配
              <ChevronDown className="h-3 w-3" />
            </button>
            
            {showRoleMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleAssign(role.id)}
                    disabled={operating}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Shield className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">{role.description}</div>
                      <div className="text-xs text-gray-500">{role.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 删除按钮 */}
          <button
            onClick={handleBatchDeleteConfirm}
            disabled={loading || operating}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            删除
          </button>
        </div>
      </div>

      {operating && (
        <div className="mt-2 flex items-center gap-2 text-sm text-blue-700">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          正在处理批量操作...
        </div>
      )}
    </div>
  );
};

export default BatchOperationBar;