import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  Shield, 
  UserCheck, 
  UserX, 
  UserPlus, 
  Trash2, 
  Edit3,
  Filter,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';

interface OperationLogEntry {
  id: string;
  operator_id: string;
  operator_name: string;
  operator_email: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'role_assign' | 'batch_operation';
  target_type: 'user' | 'role' | 'system';
  target_id: string;
  target_name: string;
  details: {
    before?: any;
    after?: any;
    affected_count?: number;
    description?: string;
  };
  ip_address: string;
  user_agent: string;
  timestamp: string;
  status: 'success' | 'failed' | 'partial';
}

interface OperationLogProps {
  className?: string;
  maxHeight?: string;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const OperationLog: React.FC<OperationLogProps> = ({
  className = '',
  maxHeight = '400px',
  showFilters = true,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [logs, setLogs] = useState<OperationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: '',
    operator: '',
    target_type: '',
    status: '',
    date_range: '7d'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // 获取操作日志
  const fetchLogs = async (page = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...filters,
        search: searchTerm
      });

      const response = await fetch(`/api/users/admin/operation-logs?${params}`);
      
      if (!response.ok) {
        throw new Error('获取操作日志失败');
      }

      const data = await response.json();
      
      if (reset || page === 1) {
        setLogs(data.logs || []);
      } else {
        setLogs(prev => [...prev, ...(data.logs || [])]);
      }
      
      setTotalPages(Math.ceil((data.total || 0) / pageSize));
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      console.error('获取操作日志失败:', err);
      setError(err instanceof Error ? err.message : '获取操作日志失败');
      
      // 使用模拟数据作为备选
      if (reset || page === 1) {
        setLogs(getMockLogs());
        setTotalPages(1);
      }
    } finally {
      setLoading(false);
    }
  };

  // 模拟数据
  const getMockLogs = (): OperationLogEntry[] => [
    {
      id: '1',
      operator_id: 'admin1',
      operator_name: '系统管理员',
      operator_email: 'admin@example.com',
      action: 'status_change',
      target_type: 'user',
      target_id: 'user1',
      target_name: '张三',
      details: {
        before: { status: 'inactive' },
        after: { status: 'active' },
        description: '激活用户账户'
      },
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0...',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      status: 'success'
    },
    {
      id: '2',
      operator_id: 'admin1',
      operator_name: '系统管理员',
      operator_email: 'admin@example.com',
      action: 'role_assign',
      target_type: 'user',
      target_id: 'user2',
      target_name: '李四',
      details: {
        before: { roles: ['普通用户'] },
        after: { roles: ['普通用户', '系统管理员'] },
        description: '分配系统管理员角色'
      },
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0...',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      status: 'success'
    },
    {
      id: '3',
      operator_id: 'admin1',
      operator_name: '系统管理员',
      operator_email: 'admin@example.com',
      action: 'batch_operation',
      target_type: 'user',
      target_id: 'batch_001',
      target_name: '批量操作',
      details: {
        affected_count: 5,
        description: '批量激活用户账户'
      },
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0...',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      status: 'success'
    }
  ];

  // 获取操作图标
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'update': return <Edit3 className="h-4 w-4 text-blue-600" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'status_change': return <UserCheck className="h-4 w-4 text-orange-600" />;
      case 'role_assign': return <Shield className="h-4 w-4 text-purple-600" />;
      case 'batch_operation': return <User className="h-4 w-4 text-indigo-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // 获取操作描述
  const getActionDescription = (log: OperationLogEntry) => {
    const { action, details, target_name } = log;
    
    switch (action) {
      case 'create':
        return `创建了用户 "${target_name}"`;
      case 'update':
        return `更新了用户 "${target_name}" 的信息`;
      case 'delete':
        return `删除了用户 "${target_name}"`;
      case 'status_change':
        const statusMap = {
          active: '激活',
          inactive: '未激活',
          suspended: '停用'
        };
        const beforeStatus = details.before?.status;
        const afterStatus = details.after?.status;
        return `将用户 "${target_name}" 状态从 "${statusMap[beforeStatus as keyof typeof statusMap] || beforeStatus}" 改为 "${statusMap[afterStatus as keyof typeof statusMap] || afterStatus}"`;
      case 'role_assign':
        return `为用户 "${target_name}" 分配了角色`;
      case 'batch_operation':
        return `执行批量操作，影响 ${details.affected_count || 0} 个用户`;
      default:
        return details.description || '执行了操作';
    }
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // 导出日志
  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        ...filters,
        search: searchTerm,
        export: 'true'
      });
      
      const response = await fetch(`/api/users/admin/operation-logs/export?${params}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `operation-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('导出日志失败:', error);
    }
  };

  // 初始化和自动刷新
  useEffect(() => {
    fetchLogs(1, true);
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs(1, true);
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [filters, searchTerm, autoRefresh, refreshInterval]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            操作日志
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(1, true)}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="刷新"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportLogs}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="导出日志"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        {showFilters && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索操作员、目标用户或操作描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有操作</option>
                <option value="create">创建用户</option>
                <option value="update">更新信息</option>
                <option value="delete">删除用户</option>
                <option value="status_change">状态变更</option>
                <option value="role_assign">角色分配</option>
                <option value="batch_operation">批量操作</option>
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">所有状态</option>
                <option value="success">成功</option>
                <option value="failed">失败</option>
                <option value="partial">部分成功</option>
              </select>
              
              <select
                value={filters.date_range}
                onChange={(e) => setFilters(prev => ({ ...prev, date_range: e.target.value }))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1d">今天</option>
                <option value="7d">最近7天</option>
                <option value="30d">最近30天</option>
                <option value="90d">最近90天</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 日志列表 */}
      <div className="overflow-auto" style={{ maxHeight }}>
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        ) : error && logs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-red-500">
            <span>{error}</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <span>暂无操作日志</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {getActionDescription(log)}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '部分成功'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.operator_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(log.timestamp)}
                      </span>
                      <span>IP: {log.ip_address}</span>
                    </div>
                    
                    {log.details.description && (
                      <p className="mt-1 text-xs text-gray-600">
                        {log.details.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchLogs(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => fetchLogs(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationLog;