import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from './components/Layout'
import AuthProvider from './components/auth/AuthProvider'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoadingSpinner from './components/common/LoadingSpinner'
import { GlobalStateProvider, ErrorBoundary } from './components/common/LoadingIndicator'
import { performanceMonitor } from './utils/performance'

// 懒加载页面组件
const HomePage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-home-page', () => import('./pages/HomePage'))
})
const MaterialInputPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-material-input-page', () => import('./pages/MaterialInputPage'))
})
const AIGeneratorPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-ai-generator-page', () => import('./pages/AIGeneratorPage'))
})
const QuestionReviewPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-question-review-page', () => import('./pages/QuestionReviewPage'))
})
const QuestionBankPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-question-bank-page', () => import('./pages/QuestionBankPage'))
})
const UserManagementPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-user-management-page', () => import('./pages/UserManagementPage'))
})
const SystemManagementPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-system-management-page', () => import('./pages/SystemManagementPage'))
})
const LoginPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-login-page', () => import('./pages/LoginPage'))
})
const RegisterPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-register-page', () => import('./pages/RegisterPage'))
})
const UnauthorizedPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-unauthorized-page', () => import('./pages/UnauthorizedPage'))
})
const DashboardPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-dashboard-page', () => import('./pages/DashboardPage'))
})
const ProfilePage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-profile-page', () => import('./pages/ProfilePage'))
})
const DebugPermissionsPage = React.lazy(() => {
  return performanceMonitor.measureFunction('load-debug-permissions-page', () => import('./pages/DebugPermissionsPage'))
})

// 页面加载组件
const PageLoader = ({ text = '页面加载中...' }: { text?: string }) => (
  <div className="flex items-center justify-center min-h-96">
    <LoadingSpinner size="large" text={text} />
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <GlobalStateProvider>
        <Router>
          <AuthProvider>
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={
            <Suspense fallback={<PageLoader text="登录页面加载中..." />}>
              <LoginPage />
            </Suspense>
          } />
          <Route path="/register" element={
            <Suspense fallback={<PageLoader text="注册页面加载中..." />}>
              <RegisterPage />
            </Suspense>
          } />
          <Route path="/unauthorized" element={
            <Suspense fallback={<PageLoader text="页面加载中..." />}>
              <UnauthorizedPage />
            </Suspense>
          } />
          
          {/* 需要认证的路由 */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                     <Route path="/" element={<DashboardPage />} />
                     <Route path="/dashboard" element={<DashboardPage />} />
                     <Route path="/profile" element={<ProfilePage />} />
                     <Route path="/debug-permissions" element={<DebugPermissionsPage />} />
                     <Route path="/home" element={<HomePage />} />
                     <Route path="/material-input" element={
                       <ProtectedRoute config={{ 
                         requireAuth: true,
                         requiredPermissions: ['materials.create']
                       }}>
                         <MaterialInputPage />
                       </ProtectedRoute>
                     } />
                     <Route path="/ai-generator" element={
                       <ProtectedRoute config={{ 
                         requireAuth: true,
                         requiredPermissions: ['questions.generate']
                       }}>
                         <AIGeneratorPage />
                       </ProtectedRoute>
                     } />
                     <Route path="/question-review" element={
                       <ProtectedRoute config={{ 
                         requireAuth: true,
                         requiredPermissions: ['questions.review']
                       }}>
                         <QuestionReviewPage />
                       </ProtectedRoute>
                     } />
                     <Route path="/question-bank" element={<QuestionBankPage />} />
                     <Route path="/admin/users" element={
                       <ProtectedRoute config={{ 
                         requireAuth: true,
                         requiredRoles: ['admin']
                       }}>
                         <UserManagementPage />
                       </ProtectedRoute>
                     } />
                     <Route path="/admin/system" element={
                       <ProtectedRoute config={{ 
                         requireAuth: true,
                         requiredRoles: ['admin']
                       }}>
                         <SystemManagementPage />
                       </ProtectedRoute>
                     } />
                   </Routes>
                </Suspense>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
        <Toaster position="top-right" richColors />
          </AuthProvider>
        </Router>
      </GlobalStateProvider>
    </ErrorBoundary>
  )
}

export default App
