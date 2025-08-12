/**
 * 用户认证相关的类型定义
 */

// 用户信息接口
export interface User {
  id: string;
  email: string;
  name: string;
  organization?: string;
  avatar_url?: string;
  email_verified: boolean;
  created_at: string;
  last_login_at?: string;
  roles: string[];
  permissions: string[];
  statistics?: UserStatistics;
}

// 用户统计信息
export interface UserStatistics {
  total_materials: number;
  total_questions: number;
  approved_questions: number;
  pending_questions: number;
  rejected_questions: number;
  total_generation_tasks: number;
}

// 登录请求
export interface LoginRequest {
  email: string;
  password: string;
}

// 注册请求
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organization?: string;
}

// 认证响应
export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  access_token?: string;
  refresh_token?: string;
}

// 用户更新请求
export interface UpdateUserRequest {
  name: string;
  organization?: string;
  avatar_url?: string;
}

// 密码修改请求
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// 角色信息
export interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  created_at: string;
}

// 权限信息
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

// 用户列表项（管理员视图）
export interface UserListItem {
  id: string;
  email: string;
  name: string;
  organization?: string;
  email_verified: boolean;
  created_at: string;
  last_login_at?: string;
  roles: string[];
}

// 角色分配请求
export interface AssignRoleRequest {
  role_name: string;
}

// API 响应基础接口
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// 分页信息
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// 分页响应
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

// 认证状态
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// 认证上下文
export interface AuthContextType {
  // 状态
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  
  // 方法
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  updateProfile: (data: UpdateUserRequest) => Promise<boolean>;
  changePassword: (data: ChangePasswordRequest) => Promise<boolean>;
  clearError: () => void;
  
  // 权限检查
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

// 路由守卫配置
export interface RouteGuardConfig {
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  redirectTo?: string;
}

// 表单验证错误
export interface FormErrors {
  [key: string]: string;
}

// 用户更新请求
export interface UserUpdateRequest {
  name: string;
  email: string;
}

// 密码修改请求
export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// 登录表单状态
export interface LoginFormState {
  email: string;
  password: string;
  remember: boolean;
  loading: boolean;
  errors: FormErrors;
}

// 注册表单状态
export interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  organization: string;
  loading: boolean;
  errors: FormErrors;
}

// 用户资料表单状态
export interface ProfileFormState {
  name: string;
  organization: string;
  avatar_url: string;
  loading: boolean;
  errors: FormErrors;
}

// 密码修改表单状态
export interface PasswordFormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
  loading: boolean;
  errors: FormErrors;
}