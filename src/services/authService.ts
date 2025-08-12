/**
 * 用户认证服务
 * 处理用户登录、注册、权限验证等功能
 */
import axios, { AxiosResponse, AxiosInstance } from 'axios';
import { cachedFetch, apiCache } from '../utils/apiCache';
import { performanceMonitor } from '../utils/performance';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  UserUpdateRequest,
  PasswordChangeRequest,
  Role,
  UserListItem,
  AssignRoleRequest,
  ApiResponse,
  PaginatedResponse
} from '../types/auth';

const API_BASE_URL = '/api';

// 创建 axios 实例
const authApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加认证令牌
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理token刷新
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // 如果是401错误且不是刷新token的请求，尝试刷新token
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          console.log('No refresh token available');
          throw new Error('No refresh token');
        }
        
        console.log('Token刷新中...');
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('refresh_token', data.refresh_token);
            }
            // 更新原始请求的Authorization头
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
            console.log('Token刷新成功，重试原始请求');
            return authApi(originalRequest);
          }
        }
        
        throw new Error('Token refresh failed');
      } catch (refreshError) {
        console.error('Token刷新异常:', refreshError);
        // 清除无效的token
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        
        // 重定向到登录页
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * 用户认证服务类
 */
export class AuthService {
  private api: AxiosInstance;
  private getUserPromise: Promise<ApiResponse<User>> | null = null;
  private lastGetUserTime = 0;
  private readonly GET_USER_DEBOUNCE_TIME = 1000; // 1秒防抖

  constructor() {
    this.api = authApi;
  }
  /**
   * 用户登录
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return performanceMonitor.measureFunction('auth-login', async () => {
      try {
        console.log('开始登录请求:', credentials.email);
        const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
        
        if (response.data.success && response.data.access_token) {
          console.log('登录成功，保存token');
          
          // 清除相关缓存
          apiCache.clearCacheByUrl('/api/users');
          
          // 原子性保存token
          try {
            localStorage.setItem('access_token', response.data.access_token);
            if (response.data.refresh_token) {
              localStorage.setItem('refresh_token', response.data.refresh_token);
            }
            console.log('Token保存成功');
          } catch (storageError) {
            console.error('Token保存失败:', storageError);
            throw new Error('登录成功但token保存失败');
          }
        }
        
        return response.data;
      } catch (error: any) {
        console.error('登录请求失败:', error);
        return {
          success: false,
          message: error.response?.data?.message || error.message || '登录失败，请稍后重试'
        };
      }
    });
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '注册失败，请稍后重试'
      };
    }
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.error('登出请求失败:', error);
    } finally {
      // 无论请求是否成功，都清除本地令牌
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.log('No refresh token available for refresh');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        console.log('Token刷新成功');
        return true;
      }

      console.log('Token刷新失败:', data.message);
      return false;
    } catch (error) {
      console.error('Token刷新异常:', error);
      return false;
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const now = Date.now();
    
    // 防抖机制：如果距离上次请求时间小于防抖时间，且有正在进行的请求，则返回现有请求
    if (this.getUserPromise && (now - this.lastGetUserTime) < this.GET_USER_DEBOUNCE_TIME) {
      console.log('getCurrentUser防抖：返回现有请求');
      return this.getUserPromise;
    }
    
    this.lastGetUserTime = now;
    
    this.getUserPromise = (async () => {
      try {
        console.log('发起获取用户信息请求');
        const response: AxiosResponse<{ success: boolean; data: User }> = await this.api.get('/users/profile');
        
        return {
          success: response.data.success,
          data: response.data.data,
          message: 'success'
        };
      } catch (error: any) {
        console.error('获取用户信息失败:', error);
        return {
          success: false,
          data: null as any,
          message: error.response?.data?.message || '获取用户信息失败'
        };
      } finally {
        // 请求完成后清除promise引用
        setTimeout(() => {
          this.getUserPromise = null;
        }, this.GET_USER_DEBOUNCE_TIME);
      }
    })();
    
    return this.getUserPromise;
  }

  /**
   * 更新用户资料
   */
  async updateProfile(data: UserUpdateRequest): Promise<ApiResponse<User>> {
    try {
      const response: AxiosResponse<ApiResponse<User>> = await this.api.put('/users/profile', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '更新失败，请稍后重试'
      };
    }
  }

  /**
   * 修改密码
   */
  async changePassword(data: PasswordChangeRequest): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.put('/users/password', data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '密码修改失败，请稍后重试'
      };
    }
  }

  /**
   * 获取用户权限
   */
  async getUserPermissions(): Promise<ApiResponse<string[]>> {
    try {
      const response: AxiosResponse<{ success: boolean; data: string[] }> = await this.api.get('/auth/permissions');
      
      return {
        success: response.data.success,
        data: response.data.data || [],
        message: 'success'
      };
    } catch (error: any) {
      console.error('获取用户权限失败:', error);
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || '获取用户权限失败'
      };
    }
  }

  /**
   * 强制清除所有无效的认证数据
   */
  clearInvalidTokens(): void {
    console.log('清除无效token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    // 清除zustand持久化存储
    localStorage.removeItem('auth-storage');
  }

  /**
   * 验证JWT token格式
   */
  private isValidJWTFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      console.log('Token验证失败: token为空或类型错误');
      return false;
    }
    
    // JWT应该有3个部分，用.分隔
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('Token验证失败: JWT格式错误，应该有3个部分');
      return false;
    }
    
    // 检查每个部分是否是有效的base64
    try {
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part || part.length === 0) {
          console.log(`Token验证失败: 第${i + 1}部分为空`);
          return false;
        }
        
        // 处理base64url编码（JWT标准）
        let base64 = part.replace(/-/g, '+').replace(/_/g, '/');
        
        // 添加必要的填充
        while (base64.length % 4) {
          base64 += '=';
        }
        
        // 尝试解码base64
        atob(base64);
      }
      console.log('Token格式验证通过');
      return true;
    } catch (error) {
      console.log('Token验证失败: base64解码错误', error);
      return false;
    }
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.log('认证检查: 未找到access_token');
        return false;
      }

      console.log('认证检查: 开始验证token格式');
      
      // 首先验证JWT格式
      if (!this.isValidJWTFormat(token)) {
        console.warn('认证检查: Token格式无效，清除认证数据');
        this.clearInvalidTokens();
        return false;
      }

      // 解析JWT token检查是否过期
      const parts = token.split('.');
      let base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      
      // 添加必要的填充
      while (base64Payload.length % 4) {
        base64Payload += '=';
      }
      
      const payload = JSON.parse(atob(base64Payload));
      const currentTime = Math.floor(Date.now() / 1000);
      
      console.log('认证检查: Token解析成功，检查过期时间');
      
      // 如果token已过期，清除本地存储
      if (payload.exp && payload.exp < currentTime) {
        console.log('认证检查: Token已过期，清除本地存储');
        this.clearInvalidTokens();
        return false;
      }
      
      console.log('认证检查: Token有效');
      return true;
    } catch (error) {
      // 如果token解析失败，清除本地存储
      console.error('认证检查: Token解析失败:', error);
      this.clearInvalidTokens();
      return false;
    }
  }

  /**
   * 获取访问令牌
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * 获取刷新令牌
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  // 管理员功能

  /**
   * 获取用户列表（管理员）
   */
  async getUserList(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<PaginatedResponse<UserListItem>> {
    try {
      const response: AxiosResponse<PaginatedResponse<UserListItem>> = await this.api.get('/users/admin/list', {
        params
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '获取用户列表失败',
        data: [],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          pages: 0
        }
      };
    }
  }

  /**
   * 分配用户角色（管理员）
   */
  async assignUserRole(userId: string, data: AssignRoleRequest): Promise<ApiResponse> {
    try {
      const response: AxiosResponse<ApiResponse> = await this.api.put(`/users/admin/${userId}/role`, data);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '角色分配失败'
      };
    }
  }

  /**
   * 获取角色列表（管理员）
   */
  async getRoleList(): Promise<ApiResponse<Role[]>> {
    try {
      const response: AxiosResponse<{ success: boolean; roles: Role[] }> = await this.api.get('/users/admin/roles');
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.roles
        };
      }
      
      return {
        success: false,
        message: '获取角色列表失败'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '获取角色列表失败'
      };
    }
  }
}

// 导出单例实例
export const authService = new AuthService();
export default authService;