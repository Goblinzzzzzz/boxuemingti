/**
 * 用户管理页面
 * 管理员可以查看用户列表、分配角色、管理权限
 */
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  UserCheck, 
  UserX,
  MoreVertical,
  Eye,
  Settings
} from 'lucide-react';
import { useAuth } from '../stores/authStore';
import { UserManagementSkeleton } from '@/components/common/SkeletonLoader';
import { VirtualTable } from '@/components/common/VirtualList';

interface User {
  id: string;
  email: string;
  name: string;
  organization?: string;
  roles: string[];
  permissions: string[];
  created_at: string;
  last_login?: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 模拟数据
  const mockUsers: User[] = [
    {
      id: '1',
      email: 'zhaodan@ke.com',
      name: '赵丹',
      organization: 'HR搏学',
      roles: ['admin', 'user'],
      permissions: ['materials.create', 'questions.generate', 'users.manage', 'system.manage'],
      created_at: '2024-01-15T08:00:00Z',
      last_login: '2024-01-20T10:30:00Z',
      status: 'active'
    },
    {
      id: '2',
      email: 'reviewer@example.com',
      name: '审核员',
      organization: 'HR搏学',
      roles: ['reviewer', 'user'],
      permissions: ['questions.review', 'questions.view'],
      created_at: '2024-01-16T09:00:00Z',
      last_login: '2024-01-19T14:20:00Z',
      status: 'active'
    },
    {
      id: '3',
      email: 'user@example.com',
      name: '普通用户',
      organization: 'HR搏学',
      roles: ['user'],
      permissions: ['questions.view'],
      created_at: '2024-01-17T10:00:00Z',
      last_login: '2024-01-18T16:45:00Z',
      status: 'active'
    }
  ];

  const mockRoles: Role[] = [
    {
      id: '1',
      name: 'admin',
      description: '系统管理员',
      permissions: ['materials.create', 'questions.generate', 'users.manage', 'system.manage', 'questions.review']
    },
    {
      id: '2',
      name: 'reviewer',
      description: '审核员',
      permissions: ['questions.review', 'questions.view']
    },
    {
      id: '3',
      name: 'user',
      description: '普通用户',
      permissions: ['questions.view']
    }
  ];

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/users/admin/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
        } else {
          console.error('获取用户列表失败:', data.message);
          setUsers(mockUsers); // 降级到模拟数据
        }
      } else {
        console.error('API请求失败:', response.status);
        setUsers(mockUsers); // 降级到模拟数据
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
      setUsers(mockUsers); // 降级到模拟数据
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/users/admin/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRoles(data.roles || []);
        } else {
          console.error('获取角色列表失败:', data.message);
          setRoles(mockRoles); // 降级到模拟数据
        }
      } else {
        console.error('API请求失败:', response.status);
        setRoles(mockRoles); // 降级到模拟数据
      }
    } catch (error) {
      console.error('加载角色列表失败:', error);
      setRoles(mockRoles); // 降级到模拟数据
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.roles.includes(selectedRole);
    return matchesSearch && matchesRole;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'reviewer':
        return 'bg-yellow-100 text-yellow-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleSaveUser = async (userData: { name: string; email: string; organization?: string }) => {
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/users/admin/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 更新本地用户信息
          setUsers(users.map(user => 
            user.id === selectedUser.id 
              ? { ...user, ...userData }
              : user
          ));
          setShowUserModal(false);
          setSelectedUser(null);
          alert('用户信息更新成功');
        } else {
          alert('更新失败: ' + data.message);
        }
      } else {
        alert('更新失败: 服务器错误');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      alert('更新失败: 网络错误');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('确定要删除这个用户吗？此操作不可恢复。')) {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/users/admin/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // 从列表中移除已删除的用户
            setUsers(users.filter(user => user.id !== userId));
            alert('用户删除成功');
          } else {
            alert('删除失败: ' + data.message);
          }
        } else {
          alert('删除失败: 服务器错误');
        }
      } catch (error) {
        console.error('删除用户失败:', error);
        alert('删除失败: 网络错误');
      }
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/users/admin/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roleId })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 更新本地用户角色信息
          const selectedRole = roles.find(role => role.id === roleId);
          setUsers(users.map(user => 
            user.id === userId 
              ? { ...user, roles: selectedRole ? [selectedRole.name] : user.roles }
              : user
          ));
          alert('角色分配成功');
          setShowRoleModal(false);
        } else {
          alert('角色分配失败: ' + data.message);
        }
      } else {
        alert('角色分配失败: 服务器错误');
      }
    } catch (error) {
      console.error('分配角色失败:', error);
      alert('角色分配失败: 网络错误');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/users/admin/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 更新本地用户状态
          setUsers(users.map(user => 
            user.id === userId 
              ? { ...user, status: newStatus as 'active' | 'inactive' | 'suspended' }
              : user
          ));
          alert('用户状态更新成功');
        } else {
          alert('状态更新失败: ' + data.message);
        }
      } else {
        alert('状态更新失败: 服务器错误');
      }
    } catch (error) {
      console.error('切换用户状态失败:', error);
      alert('状态更新失败: 网络错误');
    }
  };

  const handleAddUser = async (userData: { name: string; email: string; organization?: string; password: string }) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/users/admin/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 重新加载用户列表
          await loadUsers();
          setShowAddUserModal(false);
          alert('用户添加成功');
        } else {
          alert('添加失败: ' + data.message);
        }
      } else {
        alert('添加失败: 服务器错误');
      }
    } catch (error) {
      console.error('添加用户失败:', error);
      alert('添加失败: 网络错误');
    }
  };

  if (loading) {
    return <UserManagementSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            用户管理
          </h1>
          <p className="text-gray-600 mt-1">管理系统用户、角色和权限</p>
        </div>
        <button 
          onClick={() => setShowAddUserModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          添加用户
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有角色</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>{role.description}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* 使用虚拟滚动表格优化性能 */}
        <VirtualTable
          items={paginatedUsers}
          itemHeight={72}
          containerHeight={600}
          columns={[
            {
              key: 'userInfo',
              title: '用户信息',
              width: '25%',
              render: (user) => (
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.organization && (
                      <div className="text-xs text-gray-400">{user.organization}</div>
                    )}
                  </div>
                </div>
              )
            },
            {
              key: 'roles',
              title: '角色',
              width: '15%',
              render: (user) => (
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getRoleColor(role)
                      }`}
                    >
                      {roles.find(r => r.name === role)?.description || role}
                    </span>
                  ))}
                </div>
              )
            },
            {
              key: 'status',
              title: '状态',
              width: '10%',
              render: (user) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  getStatusColor(user.status)
                }`}>
                  {user.status === 'active' ? '正常' : user.status === 'suspended' ? '已停用' : '未激活'}
                </span>
              )
            },
            {
              key: 'lastLogin',
              title: '最后登录',
              width: '15%',
              render: (user) => user.last_login ? formatDate(user.last_login) : '从未登录'
            },
            {
              key: 'createdAt',
              title: '创建时间',
              width: '15%',
              render: (user) => formatDate(user.created_at)
            },
            {
              key: 'actions',
              title: '操作',
              width: '20%',
              render: (user) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="text-blue-600 hover:text-blue-900 p-1 rounded"
                    title="编辑用户"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleUserStatus(user.id, user.status)}
                    className={`p-1 rounded ${
                      user.status === 'active' 
                        ? 'text-red-600 hover:text-red-900' 
                        : 'text-green-600 hover:text-green-900'
                    }`}
                    title={user.status === 'active' ? '停用用户' : '启用用户'}
                  >
                    {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-600 hover:text-red-900 p-1 rounded"
                    title="删除用户"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            }
          ]}
          loading={loading}
          emptyText="暂无用户数据"
          className="rounded-lg"
        />

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> 到{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                  </span>{' '}
                  条，共 <span className="font-medium">{filteredUsers.length}</span> 条记录
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">总用户数</p>
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">管理员</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.roles.includes('admin')).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">活跃用户</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Settings className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">角色数量</p>
              <p className="text-2xl font-semibold text-gray-900">{roles.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 用户编辑模态框 */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">编辑用户信息</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSaveUser({
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                organization: formData.get('organization') as string || undefined
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={selectedUser.name}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱 *
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={selectedUser.email}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    组织机构
                  </label>
                  <input
                    type="text"
                    name="organization"
                    defaultValue={selectedUser.organization || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 添加用户模态框 */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">添加新用户</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddUser({
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                organization: formData.get('organization') as string || undefined,
                password: formData.get('password') as string
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入用户姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱 *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入邮箱地址"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密码 *
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入密码（至少6位）"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    组织机构
                  </label>
                  <input
                    type="text"
                    name="organization"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入组织机构（可选）"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  添加用户
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;