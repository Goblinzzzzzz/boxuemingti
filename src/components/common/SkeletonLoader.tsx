/**
 * 骨架屏加载组件
 * 为数据密集型页面提供优雅的加载状态
 */
import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

// 基础骨架屏组件
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  rounded = false,
  animate = true
}) => {
  return (
    <div
      className={cn(
        'bg-gray-200',
        animate && 'animate-pulse',
        rounded && 'rounded-full',
        !rounded && 'rounded',
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
};

// 表格骨架屏
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}> = ({ rows = 5, columns = 4, showHeader = true, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* 表格头部 */}
      {showHeader && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`header-${index}`} height={20} className="h-5" />
          ))}
        </div>
      )}
      
      {/* 表格行 */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={`cell-${rowIndex}-${colIndex}`} height={16} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// 卡片骨架屏
export const CardSkeleton: React.FC<{
  showImage?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showActions?: boolean;
  className?: string;
}> = ({
  showImage = true,
  showTitle = true,
  showDescription = true,
  showActions = true,
  className
}) => {
  return (
    <div className={cn('p-6 border border-gray-200 rounded-lg bg-white', className)}>
      {/* 图片区域 */}
      {showImage && (
        <Skeleton height={200} className="mb-4" />
      )}
      
      {/* 标题 */}
      {showTitle && (
        <Skeleton height={24} width="60%" className="mb-3" />
      )}
      
      {/* 描述 */}
      {showDescription && (
        <div className="space-y-2 mb-4">
          <Skeleton height={16} width="100%" />
          <Skeleton height={16} width="80%" />
          <Skeleton height={16} width="90%" />
        </div>
      )}
      
      {/* 操作按钮 */}
      {showActions && (
        <div className="flex gap-2">
          <Skeleton height={36} width={80} />
          <Skeleton height={36} width={80} />
        </div>
      )}
    </div>
  );
};

// 用户管理页面骨架屏
export const UserManagementSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton height={32} width={200} className="mb-2" />
          <Skeleton height={20} width={300} />
        </div>
        <Skeleton height={40} width={120} />
      </div>
      
      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton height={40} width={300} />
          <Skeleton height={40} width={150} />
          <Skeleton height={40} width={100} />
        </div>
      </div>
      
      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <TableSkeleton rows={8} columns={6} showHeader={true} />
        </div>
        
        {/* 分页 */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <Skeleton height={20} width={150} />
            <div className="flex gap-2">
              <Skeleton height={36} width={80} />
              <Skeleton height={36} width={80} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 题库管理页面骨架屏
export const QuestionBankSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Skeleton height={48} width={48} className="mr-4" rounded />
              <div className="flex-1">
                <Skeleton height={16} width={80} className="mb-2" />
                <Skeleton height={24} width={60} />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Skeleton height={40} width="100%" />
          <Skeleton height={40} width="100%" />
          <Skeleton height={40} width="100%" />
          <Skeleton height={40} width="100%" />
          <Skeleton height={40} width="100%" />
        </div>
      </div>
      
      {/* 题目列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <Skeleton height={24} width={150} className="mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Skeleton height={20} width={200} />
                    <div className="flex gap-2">
                      <Skeleton height={24} width={60} />
                      <Skeleton height={24} width={60} />
                    </div>
                  </div>
                  <Skeleton height={16} width="100%" className="mb-2" />
                  <Skeleton height={16} width="80%" className="mb-3" />
                  <div className="flex gap-2">
                    <Skeleton height={32} width={60} />
                    <Skeleton height={32} width={60} />
                    <Skeleton height={32} width={60} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 右侧详情 */}
        <div className="bg-white rounded-lg shadow p-6">
          <Skeleton height={24} width={120} className="mb-4" />
          <div className="space-y-4">
            <Skeleton height={20} width="100%" />
            <Skeleton height={20} width="90%" />
            <Skeleton height={20} width="95%" />
            <div className="space-y-2 mt-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Skeleton height={16} width={16} rounded />
                  <Skeleton height={16} width={200} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 系统管理页面骨架屏
export const SystemManagementSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} height={40} width={100} />
          ))}
        </div>
      </div>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Skeleton height={48} width={48} className="mr-4" rounded />
              <div className="flex-1">
                <Skeleton height={16} width={80} className="mb-2" />
                <Skeleton height={24} width={60} />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧 */}
        <div className="bg-white rounded-lg shadow p-6">
          <Skeleton height={24} width={150} className="mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex justify-between items-center">
                <Skeleton height={16} width={120} />
                <Skeleton height={16} width={80} />
              </div>
            ))}
          </div>
        </div>
        
        {/* 右侧 */}
        <div className="bg-white rounded-lg shadow p-6">
          <Skeleton height={24} width={150} className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton height={8} width={8} rounded />
                <Skeleton height={16} width={200} />
                <Skeleton height={16} width={80} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// 教材输入页面骨架屏
export const MaterialInputSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <Skeleton height={32} width={200} className="mb-2" />
        <Skeleton height={20} width={300} />
      </div>
      
      {/* 上传区域 */}
      <div className="bg-white rounded-lg shadow p-6">
        <Skeleton height={200} className="border-2 border-dashed border-gray-300 rounded-lg" />
      </div>
      
      {/* 已上传文件列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <Skeleton height={24} width={150} className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton height={40} width={40} rounded />
                  <div>
                    <Skeleton height={16} width={200} className="mb-1" />
                    <Skeleton height={14} width={100} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton height={32} width={80} />
                  <Skeleton height={32} width={32} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default {
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  UserManagementSkeleton,
  QuestionBankSkeleton,
  SystemManagementSkeleton,
  MaterialInputSkeleton
};