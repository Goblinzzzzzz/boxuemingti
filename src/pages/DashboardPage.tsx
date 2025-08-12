/**
 * 个人工作台页面
 * 显示用户统计信息、最近活动和快捷操作
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Plus,
  Eye,
  Edit,
  Calendar
} from 'lucide-react';
import { useAuth } from '../stores/authStore';
import { authService } from '../services/authService';
import { User, UserStatistics } from '../types/auth';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PermissionGuard from '../components/auth/PermissionGuard';

interface RecentActivity {
  id: string;
  type: 'material' | 'question' | 'review';
  title: string;
  status?: string;
  created_at: string;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // 从authStore获取用户统计信息，避免重复API调用
        if (user?.statistics) {
          setStatistics(user.statistics);
        }
        
        // 模拟获取最近活动（实际项目中应该从API获取）
        const mockActivities: RecentActivity[] = [
          {
            id: '1',
            type: 'material',
            title: '人力资源管理基础教材',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            type: 'question',
            title: '组织行为学选择题',
            status: 'pending',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            type: 'review',
            title: '薪酬管理案例分析题',
            status: 'approved',
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
          }
        ];
        setRecentActivities(mockActivities);
        
      } catch (err) {
        console.error('获取工作台数据失败:', err);
        setError('获取工作台数据失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'material':
        return <FileText className="w-4 h-4" />;
      case 'question':
        return <HelpCircle className="w-4 h-4" />;
      case 'review':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };
  
  const getActivityTypeText = (type: string) => {
    switch (type) {
      case 'material':
        return '教材上传';
      case 'question':
        return '试题生成';
      case 'review':
        return '试题审核';
      default:
        return '未知活动';
    }
  };
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getStatusText = (status?: string) => {
    switch (status) {
      case 'approved':
        return '已通过';
      case 'rejected':
        return '已拒绝';
      case 'pending':
        return '待审核';
      default:
        return '已完成';
    }
  };
  
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}天前`;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="large" text="正在加载工作台..." />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          重新加载
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            欢迎回来，{user?.name}！
          </h1>
          <p className="text-gray-600 mt-1">
            今天是 {new Date().toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>上次登录：{user?.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN') : '首次登录'}</span>
        </div>
      </div>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">上传教材</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics?.total_materials || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <HelpCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">生成试题</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics?.total_questions || 0}
              </p>
            </div>
          </div>
        </div>
        
        <PermissionGuard roles={['reviewer', 'admin']}>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">待审核</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics?.pending_questions || 0}
                </p>
              </div>
            </div>
          </div>
        </PermissionGuard>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">题库总数</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics?.approved_questions || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 快捷操作 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PermissionGuard permissions={['materials.create']}>
            <Link
              to="/material-input"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-5 h-5 text-blue-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">上传教材</span>
            </Link>
          </PermissionGuard>
          
          <PermissionGuard permissions={['questions.generate']}>
            <Link
              to="/ai-generator"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <Plus className="w-5 h-5 text-green-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">生成试题</span>
            </Link>
          </PermissionGuard>
          
          <PermissionGuard roles={['reviewer', 'admin']}>
            <Link
              to="/question-review"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
            >
              <Eye className="w-5 h-5 text-yellow-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">审核试题</span>
            </Link>
          </PermissionGuard>
          
          <Link
            to="/question-bank"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <Eye className="w-5 h-5 text-purple-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">浏览题库</span>
          </Link>
        </div>
      </div>
      
      {/* 最近活动 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h2>
        {recentActivities.length > 0 ? (
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">
                      {getActivityTypeText(activity.type)} · {formatRelativeTime(activity.created_at)}
                    </p>
                  </div>
                </div>
                {activity.status && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                    {getStatusText(activity.status)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无最近活动</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;