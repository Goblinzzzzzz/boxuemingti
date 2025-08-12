/**
 * 用户个人资料页面
 * 允许用户查看和编辑个人信息
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Edit, 
  Save, 
  X,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { useAuth } from '../stores/authStore';
import { authService } from '../services/authService';
import { UserUpdateRequest, PasswordChangeRequest, FormErrors } from '../types/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'sonner';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  
  // 个人信息编辑状态
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<UserUpdateRequest>({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [profileErrors, setProfileErrors] = useState<FormErrors>({});
  const [profileLoading, setProfileLoading] = useState(false);
  
  // 密码修改状态
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordChangeRequest>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<FormErrors>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // 用户权限信息
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name,
        email: user.email
      });
    }
  }, [user]);
  
  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        setPermissionsLoading(true);
        const response = await authService.getUserPermissions();
        if (response.success && response.data) {
          setUserPermissions(response.data);
        }
      } catch (error) {
        console.error('获取用户权限失败:', error);
      } finally {
        setPermissionsLoading(false);
      }
    };
    
    fetchUserPermissions();
  }, []);
  
  const validateProfileForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!profileForm.name.trim()) {
      errors.name = '姓名不能为空';
    }
    
    if (!profileForm.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
      errors.email = '邮箱格式不正确';
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const validatePasswordForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!passwordForm.current_password) {
      errors.current_password = '请输入当前密码';
    }
    
    if (!passwordForm.new_password) {
      errors.new_password = '请输入新密码';
    } else if (passwordForm.new_password.length < 6) {
      errors.new_password = '新密码至少需要6个字符';
    }
    
    if (!passwordForm.confirm_password) {
      errors.confirm_password = '请确认新密码';
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = '两次输入的密码不一致';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }
    
    try {
      setProfileLoading(true);
      await updateProfile(profileForm);
      setIsEditingProfile(false);
      toast.success('个人信息更新成功');
    } catch (error: any) {
      console.error('更新个人信息失败:', error);
      toast.error(error.message || '更新个人信息失败');
    } finally {
      setProfileLoading(false);
    }
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    try {
      setPasswordLoading(true);
      const response = await authService.changePassword(passwordForm);
      
      if (response.success) {
        setIsChangingPassword(false);
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        toast.success('密码修改成功');
      } else {
        toast.error(response.message || '密码修改失败');
      }
    } catch (error: any) {
      console.error('修改密码失败:', error);
      toast.error(error.message || '修改密码失败');
    } finally {
      setPasswordLoading(false);
    }
  };
  
  const handleCancelProfileEdit = () => {
    setIsEditingProfile(false);
    setProfileForm({
      name: user?.name || '',
      email: user?.email || ''
    });
    setProfileErrors({});
  };
  
  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setPasswordErrors({});
  };
  
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" text="正在加载用户信息..." />
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">个人资料</h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          返回
        </button>
      </div>
      
      {/* 基本信息卡片 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
          {!isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-1" />
              编辑
            </button>
          )}
        </div>
        
        {isEditingProfile ? (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名
              </label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  profileErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入姓名"
              />
              {profileErrors.name && (
                <p className="mt-1 text-sm text-red-600">{profileErrors.name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  profileErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="请输入邮箱"
              />
              {profileErrors.email && (
                <p className="mt-1 text-sm text-red-600">{profileErrors.email}</p>
              )}
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={profileLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {profileLoading ? (
                  <LoadingSpinner size="small" className="mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                保存
              </button>
              <button
                type="button"
                onClick={handleCancelProfileEdit}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                取消
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">姓名</p>
                <p className="font-medium text-gray-900">{user.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">邮箱</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">注册时间</p>
                <p className="font-medium text-gray-900">
                  {new Date(user.created_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">用户角色</p>
                <div className="flex flex-wrap gap-1">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((role, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          role === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : role === 'reviewer'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {role === 'admin' ? '管理员' : role === 'reviewer' ? '审核员' : role === 'user' ? '普通用户' : role}
                      </span>
                    ))
                  ) : (
                    <span className="font-medium text-gray-900">普通用户</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 密码修改卡片 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">密码设置</h2>
          {!isChangingPassword && (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Lock className="w-4 h-4 mr-1" />
              修改密码
            </button>
          )}
        </div>
        
        {isChangingPassword ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                当前密码
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    passwordErrors.current_password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入当前密码"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.current_password && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.current_password}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新密码
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    passwordErrors.new_password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入新密码（至少6个字符）"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.new_password && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.new_password}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                确认新密码
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    passwordErrors.confirm_password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请再次输入新密码"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordErrors.confirm_password && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.confirm_password}</p>
              )}
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {passwordLoading ? (
                  <LoadingSpinner size="small" className="mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                保存
              </button>
              <button
                type="button"
                onClick={handleCancelPasswordChange}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4 mr-2" />
                取消
              </button>
            </div>
          </form>
        ) : (
          <div className="text-gray-600">
            <p>为了账户安全，建议定期更换密码。</p>
          </div>
        )}
      </div>
      
      {/* 权限信息卡片 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">权限信息</h2>
        {permissionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="medium" text="正在加载权限信息..." />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">当前角色</p>
              <div className="flex flex-wrap gap-2">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map((role, index) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        role === 'admin' 
                          ? 'bg-red-100 text-red-800' 
                          : role === 'reviewer'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {role === 'admin' ? '管理员' : role === 'reviewer' ? '审核员' : role === 'user' ? '普通用户' : role}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    普通用户
                  </span>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-2">拥有权限</p>
              {userPermissions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userPermissions.map((permission) => (
                    <span
                      key={permission}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">暂无特殊权限</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;