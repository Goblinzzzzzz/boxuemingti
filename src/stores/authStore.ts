/**
 * 用户认证状态管理
 * 使用 Zustand 管理用户认证状态
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User,
  LoginRequest,
  RegisterRequest,
  UserUpdateRequest,
  PasswordChangeRequest
} from '../types/auth';
import { authService } from '../services/authService';

interface AuthStoreState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// 防重复调用的状态管理
let isGettingUser = false;
let getUserPromise: Promise<void> | null = null;
let isInitializing = false;
let initializePromise: Promise<void> | null = null;

interface AuthStore extends AuthStoreState {
  // 认证方法
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  getCurrentUser: () => Promise<void>;
  updateProfile: (data: UserUpdateRequest) => Promise<boolean>;
  changePassword: (data: PasswordChangeRequest) => Promise<boolean>;
  
  // 状态管理
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // 权限检查
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  
  // 初始化
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,

      // 登录
      login: async (credentials: LoginRequest): Promise<boolean> => {
        console.log('开始登录流程:', credentials.email);
        set({ loading: true, error: null });
        
        try {
          const response = await authService.login(credentials);
          console.log('登录API响应:', { success: response.success, hasUser: !!response.user });
          
          if (response.success && response.user) {
            console.log('登录成功，设置认证状态:', response.user.name);
            
            // 设置认证状态
            set({
              isAuthenticated: true,
              user: response.user,
              loading: false,
              error: null
            });
            
            console.log('认证状态已设置，用户已登录');
            return true;
          } else {
            console.log('登录失败:', response.message);
            set({
              isAuthenticated: false,
              user: null,
              loading: false,
              error: response.message || '登录失败'
            });
            return false;
          }
        } catch (error: any) {
          console.error('登录异常:', error);
          const errorMessage = error.response?.data?.message || error.message || '登录过程中发生错误';
          set({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: errorMessage
          });
          return false;
        }
      },

      // 注册
      register: async (userData: RegisterRequest): Promise<boolean> => {
        set({ loading: true, error: null });
        
        try {
          const response = await authService.register(userData);
          
          if (response.success) {
            set({
              loading: false,
              error: null
            });
            return true;
          } else {
            set({
              loading: false,
              error: response.message || '注册失败'
            });
            return false;
          }
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || '注册过程中发生错误'
          });
          return false;
        }
      },

      // 登出
      logout: () => {
        authService.logout();
        set({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null
        });
      },

      // 刷新令牌
      refreshToken: async (): Promise<boolean> => {
        try {
          const success = await authService.refreshToken();
          
          if (success) {
            // 刷新成功后重新获取用户信息
            await get().getCurrentUser();
            return true;
          } else {
            // 刷新失败，登出用户
            get().logout();
            return false;
          }
        } catch (error) {
          get().logout();
          return false;
        }
      },

      // 获取当前用户信息
      getCurrentUser: async (): Promise<void> => {
        // 防重复调用机制
        if (isGettingUser && getUserPromise) {
          console.log('getCurrentUser已在执行中，等待现有请求完成');
          return getUserPromise;
        }

        // 首先检查token是否有效
        if (!authService.isAuthenticated()) {
          console.log('Token无效或已过期，设置为未认证状态');
          set({ 
            isAuthenticated: false, 
            user: null, 
            loading: false,
            error: null 
          });
          return;
        }

        isGettingUser = true;
        set({ loading: true });
        
        getUserPromise = (async () => {
          try {
            const response = await authService.getCurrentUser();
            
            if (response.success && response.data) {
              console.log('成功获取用户信息:', response.data.name);
              set({
                isAuthenticated: true,
                user: response.data,
                loading: false,
                error: null
              });
            } else {
              console.error('获取用户信息失败:', response.message);
              // API返回失败，可能是token无效，清除认证状态
              set({
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null // 不显示错误，直接跳转到登录页
              });
            }
          } catch (error: any) {
            console.error('获取用户信息异常:', error);
            
            // 如果是网络错误或401错误，清除认证状态
            if (error.response?.status === 401 || error.code === 'ERR_ABORTED') {
              console.log('认证失败，清除用户状态');
              set({
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null
              });
            } else {
              // 其他错误，保持认证状态但显示错误
              set({
                loading: false,
                error: error.message || '获取用户信息失败'
              });
            }
          } finally {
            isGettingUser = false;
            getUserPromise = null;
          }
        })();

        return getUserPromise;
      },

      // 更新用户资料
      updateProfile: async (data: UserUpdateRequest): Promise<boolean> => {
        set({ loading: true, error: null });
        
        try {
          const response = await authService.updateProfile(data);
          
          if (response.success && response.data) {
            set({
              user: { ...get().user!, ...response.data },
              loading: false,
              error: null
            });
            return true;
          } else {
            set({
              loading: false,
              error: response.message || '更新失败'
            });
            return false;
          }
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || '更新过程中发生错误'
          });
          return false;
        }
      },

      // 修改密码
      changePassword: async (data: PasswordChangeRequest): Promise<boolean> => {
        set({ loading: true, error: null });
        
        try {
          const response = await authService.changePassword(data);
          
          if (response.success) {
            set({
              loading: false,
              error: null
            });
            return true;
          } else {
            set({
              loading: false,
              error: response.message || '密码修改失败'
            });
            return false;
          }
        } catch (error: any) {
          set({
            loading: false,
            error: error.message || '密码修改过程中发生错误'
          });
          return false;
        }
      },

      // 设置用户
      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ loading });
      },

      // 设置错误
      setError: (error: string | null) => {
        set({ error });
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },

      // 检查用户角色
      hasRole: (role: string): boolean => {
        const { user } = get();
        return user?.roles?.includes(role) || false;
      },

      // 检查用户权限
      hasPermission: (permission: string): boolean => {
        const { user } = get();
        return user?.permissions?.includes(permission) || false;
      },

      // 检查是否拥有任一角色
      hasAnyRole: (roles: string[]): boolean => {
        const { user } = get();
        if (!user?.roles) return false;
        return roles.some(role => user.roles.includes(role));
      },

      // 检查是否拥有任一权限
      hasAnyPermission: (permissions: string[]): boolean => {
        const { user } = get();
        if (!user?.permissions) return false;
        return permissions.some(permission => user.permissions.includes(permission));
      },

      // 初始化认证状态
      initialize: async (): Promise<void> => {
        // 防重复初始化机制
        if (isInitializing && initializePromise) {
          console.log('认证初始化已在进行中，等待现有初始化完成');
          return initializePromise;
        }
        
        console.log('=== 开始认证状态初始化 ===');
        const currentState = get();
        console.log('当前认证状态:', { 
          isAuthenticated: currentState.isAuthenticated, 
          hasUser: !!currentState.user,
          userName: currentState.user?.name 
        });
        
        isInitializing = true;
        set({ loading: true, error: null });
        
        initializePromise = (async () => {
          try {
            // 检查token是否有效
            const hasValidToken = authService.isAuthenticated();
            console.log('Token验证结果:', hasValidToken);
            
            if (hasValidToken) {
              console.log('发现有效token，获取用户信息...');
              await get().getCurrentUser();
              console.log('用户信息获取完成');
            } else {
              console.log('未发现有效token，清除认证状态');
              // 清除可能存在的无效数据
              authService.clearInvalidTokens();
              set({ 
                isAuthenticated: false, 
                user: null, 
                loading: false,
                error: null 
              });
            }
          } catch (error: any) {
            console.error('认证初始化异常:', error);
            // 初始化失败时，清除认证状态和无效token
            authService.clearInvalidTokens();
            set({ 
              isAuthenticated: false, 
              user: null, 
              loading: false,
              error: null // 不显示错误，让用户正常进入登录流程
            });
          } finally {
            isInitializing = false;
            initializePromise = null;
          }
          
          const finalState = get();
          console.log('=== 认证初始化完成 ===', {
            isAuthenticated: finalState.isAuthenticated,
            hasUser: !!finalState.user,
            userName: finalState.user?.name
          });
        })();
        
        return initializePromise;
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // 只持久化用户信息，不持久化 loading 和 error 状态
        isAuthenticated: state.isAuthenticated,
        user: state.user
      })
    }
  )
);

// 导出常用的选择器
export const useAuth = () => {
  const store = useAuthStore();
  return {
    isAuthenticated: store.isAuthenticated,
    user: store.user,
    loading: store.loading,
    error: store.error,
    login: store.login,
    register: store.register,
    logout: store.logout,
    updateProfile: store.updateProfile,
    changePassword: store.changePassword,
    clearError: store.clearError,
    hasRole: store.hasRole,
    hasPermission: store.hasPermission,
    hasAnyRole: store.hasAnyRole,
    hasAnyPermission: store.hasAnyPermission,
    initialize: store.initialize
  };
};

// 导出权限检查钩子
export const usePermissions = () => {
  const { hasRole, hasPermission, hasAnyRole, hasAnyPermission } = useAuthStore();
  return {
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAnyPermission,
    isAdmin: () => hasRole('admin'),
    isReviewer: () => hasRole('reviewer'),
    isUser: () => hasRole('user'),
    canManageUsers: () => hasPermission('users:manage'),
    canReviewQuestions: () => hasPermission('questions:review'),
    canCreateQuestions: () => hasPermission('questions:create')
  };
};