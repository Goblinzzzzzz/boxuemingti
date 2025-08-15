/**
 * 系统管理页面
 * 管理员可以查看系统配置、数据统计、日志管理等
 */
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  BarChart3, 
  FileText, 
  Database, 
  Server, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  HelpCircle, 
  Download,
  RefreshCw,
  Eye,
  Trash2
} from 'lucide-react';
import { useAuth } from '../stores/authStore';
import { SystemManagementSkeleton } from '@/components/common/SkeletonLoader';
import AIModelSelector from '@/components/AIModelSelector';

interface SystemStats {
  totalUsers: number;
  totalQuestions: number;
  totalMaterials: number;
  totalReviews: number;
  activeUsers: number;
  pendingReviews: number;
  systemUptime: string;
  databaseSize: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  user?: string;
  action?: string;
  details?: string;
}

interface SystemConfig {
  siteName: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  sessionTimeout: number;
  enableRegistration: boolean;
  enableEmailVerification: boolean;
  maintenanceMode: boolean;
}

const SystemManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'logs' | 'database'>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(20);

  // 模拟数据
  const mockStats: SystemStats = {
    totalUsers: 156,
    totalQuestions: 2847,
    totalMaterials: 89,
    totalReviews: 1234,
    activeUsers: 45,
    pendingReviews: 23,
    systemUptime: '15天 8小时 32分钟',
    databaseSize: '2.3 GB'
  };

  const mockLogs: LogEntry[] = [
    {
      id: '1',
      timestamp: '2024-01-20T10:30:00Z',
      level: 'info',
      message: '用户登录成功',
      user: 'zhaodan@ke.com',
      action: 'login',
      details: 'IP: 192.168.1.100'
    },
    {
      id: '2',
      timestamp: '2024-01-20T10:25:00Z',
      level: 'warning',
      message: '文件上传失败',
      user: 'user@example.com',
      action: 'upload',
      details: '文件大小超过限制: 15MB'
    },
    {
      id: '3',
      timestamp: '2024-01-20T10:20:00Z',
      level: 'error',
      message: '数据库连接超时',
      action: 'database',
      details: 'Connection timeout after 30s'
    },
    {
      id: '4',
      timestamp: '2024-01-20T10:15:00Z',
      level: 'info',
      message: '新用户注册',
      user: 'newuser@example.com',
      action: 'register',
      details: '邮箱验证已发送'
    },
    {
      id: '5',
      timestamp: '2024-01-20T10:10:00Z',
      level: 'info',
      message: '试题审核完成',
      user: 'reviewer@example.com',
      action: 'review',
      details: '审核通过 5 道题目'
    }
  ];

  const mockConfig: SystemConfig = {
    siteName: 'HR搏学AI命题系统',
    maxFileSize: 10, // MB
    allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt'],
    sessionTimeout: 30, // minutes
    enableRegistration: true,
    enableEmailVerification: true,
    maintenanceMode: false
  };

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // 加载系统统计
      const statsResponse = await fetch('/api/users/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.stats || mockStats);
        } else {
          setStats(mockStats);
        }
      } else {
        setStats(mockStats);
      }
      
      // 加载系统日志
      const logsResponse = await fetch('/api/system/logs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        if (logsData.success) {
          setLogs(logsData.logs || mockLogs);
        } else {
          setLogs(mockLogs);
        }
      } else {
        setLogs(mockLogs);
      }
      
      // 加载系统配置
      const configResponse = await fetch('/api/system/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (configResponse.ok) {
        const configData = await configResponse.json();
        if (configData.success) {
          setConfig(configData.config || mockConfig);
        } else {
          setConfig(mockConfig);
        }
      } else {
        setConfig(mockConfig);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('加载系统数据失败:', error);
      // 降级到模拟数据
      setStats(mockStats);
      setLogs(mockLogs);
      setConfig(mockConfig);
      setLoading(false);
    }
  };

  const handleConfigSave = async (newConfig: SystemConfig) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/system/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(newConfig);
          alert('配置保存成功！');
        } else {
          alert('配置保存失败: ' + data.message);
        }
      } else {
        alert('配置保存失败: 服务器错误');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('配置保存失败: 网络错误');
    }
  };

  const handleExportLogs = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/system/logs/export', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('导出日志失败');
      }
    } catch (error) {
      console.error('导出日志失败:', error);
      alert('导出日志失败: 网络错误');
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('确定要清空所有日志吗？此操作不可恢复。')) {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/system/logs', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setLogs([]);
            alert('日志清空成功！');
          } else {
            alert('清空日志失败: ' + data.message);
          }
        } else {
          alert('清空日志失败: 服务器错误');
        }
      } catch (error) {
        console.error('清空日志失败:', error);
        alert('清空日志失败: 网络错误');
      }
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const paginatedLogs = logs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const totalPages = Math.ceil(logs.length / logsPerPage);

  if (loading) {
    return <SystemManagementSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            系统管理
          </h1>
          <p className="text-gray-600 mt-1">系统配置、监控和日志管理</p>
        </div>
        <button 
          onClick={loadSystemData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          刷新数据
        </button>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: '系统概览', icon: BarChart3 },
            { id: 'config', name: '系统配置', icon: Settings },
            { id: 'logs', name: '系统日志', icon: FileText },
            { id: 'database', name: '数据库管理', icon: Database }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 系统概览 */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">总用户数</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <HelpCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">总题目数</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalQuestions}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">教材数量</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalMaterials}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">活跃用户</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeUsers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 系统状态 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Server className="h-5 w-5" />
                系统状态
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">系统运行时间</span>
                  <span className="text-sm font-medium text-gray-900">{stats.systemUptime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">数据库大小</span>
                  <span className="text-sm font-medium text-gray-900">{stats.databaseSize}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">待审核题目</span>
                  <span className="text-sm font-medium text-orange-600">{stats.pendingReviews}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">系统状态</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    正常运行
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                最近活动
              </h3>
              <div className="space-y-3">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 p-1 rounded-full ${getLevelColor(log.level)}`}>
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{log.message}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(log.timestamp)}
                        {log.user && ` • ${log.user}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 系统配置 */}
      {activeTab === 'config' && config && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">系统配置</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  站点名称
                </label>
                <input
                  type="text"
                  value={config.siteName}
                  onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大文件大小 (MB)
                </label>
                <input
                  type="number"
                  value={config.maxFileSize}
                  onChange={(e) => setConfig({ ...config, maxFileSize: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  会话超时时间 (分钟)
                </label>
                <input
                  type="number"
                  value={config.sessionTimeout}
                  onChange={(e) => setConfig({ ...config, sessionTimeout: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  允许的文件类型
                </label>
                <input
                  type="text"
                  value={config.allowedFileTypes?.join(', ') || ''}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    allowedFileTypes: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder=".pdf, .doc, .docx, .txt"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">允许用户注册</h4>
                  <p className="text-sm text-gray-500">是否允许新用户自主注册账号</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableRegistration}
                    onChange={(e) => setConfig({ ...config, enableRegistration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">邮箱验证</h4>
                  <p className="text-sm text-gray-500">新用户注册时是否需要邮箱验证</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableEmailVerification}
                    onChange={(e) => setConfig({ ...config, enableEmailVerification: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">维护模式</h4>
                  <p className="text-sm text-gray-500">启用后只有管理员可以访问系统</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.maintenanceMode}
                    onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* AI模型配置 */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">AI模型配置</h4>
              <AIModelSelector />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleConfigSave(config)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 系统日志 */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">系统日志</h3>
            <div className="flex gap-2">
              <button
                onClick={handleExportLogs}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                导出日志
              </button>
              <button
                onClick={handleClearLogs}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                清空日志
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      级别
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      消息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      详情
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getLevelColor(log.level)
                        }`}>
                          {getLevelIcon(log.level)}
                          <span className="ml-1">
                            {log.level === 'error' ? '错误' : log.level === 'warning' ? '警告' : '信息'}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.user || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
                      显示第 <span className="font-medium">{(currentPage - 1) * logsPerPage + 1}</span> 到{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * logsPerPage, logs.length)}
                      </span>{' '}
                      条，共 <span className="font-medium">{logs.length}</span> 条记录
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
        </div>
      )}

      {/* 数据库管理 */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Database className="h-5 w-5" />
              数据库管理
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">数据备份</h4>
                <p className="text-sm text-gray-600 mb-4">创建数据库完整备份</p>
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  开始备份
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">数据恢复</h4>
                <p className="text-sm text-gray-600 mb-4">从备份文件恢复数据</p>
                <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  选择文件
                </button>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">数据清理</h4>
                <p className="text-sm text-gray-600 mb-4">清理过期和无用数据</p>
                <button className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
                  开始清理
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">数据库统计</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">表大小统计</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">users</span>
                    <span className="text-sm font-medium">1.2 MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">questions</span>
                    <span className="text-sm font-medium">850 KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">materials</span>
                    <span className="text-sm font-medium">2.1 GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">reviews</span>
                    <span className="text-sm font-medium">450 KB</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">记录数统计</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">用户</span>
                    <span className="text-sm font-medium">{stats?.totalUsers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">题目</span>
                    <span className="text-sm font-medium">{stats?.totalQuestions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">教材</span>
                    <span className="text-sm font-medium">{stats?.totalMaterials || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">审核记录</span>
                    <span className="text-sm font-medium">{stats?.totalReviews || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemManagementPage;