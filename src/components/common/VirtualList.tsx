/**
 * 虚拟滚动组件
 * 用于优化长列表的渲染性能
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number; // 预渲染的额外项目数量
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  loading = false,
  loadingComponent,
  emptyComponent
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    // 添加 overscan
    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(items.length - 1, visibleEnd + overscan);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // 可见项目
  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetY: i * itemHeight
      });
    }
    return result;
  }, [items, visibleRange, itemHeight]);

  // 总高度
  const totalHeight = items.length * itemHeight;

  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight;
      containerRef.current.scrollTop = scrollTop;
      setScrollTop(scrollTop);
    }
  }, [itemHeight]);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    scrollToIndex(0);
  }, [scrollToIndex]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    scrollToIndex(items.length - 1);
  }, [scrollToIndex, items.length]);

  // 暴露方法给父组件
  React.useImperativeHandle(containerRef, () => ({
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    getScrollTop: () => scrollTop
  }) as any);

  if (loading && loadingComponent) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height: containerHeight }}>
        {loadingComponent}
      </div>
    );
  }

  if (items.length === 0 && emptyComponent) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height: containerHeight }}>
        {emptyComponent}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, item, offsetY }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook 用于虚拟滚动
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(items.length - 1, visibleEnd + overscan);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      offsetY: (visibleRange.start + index) * itemHeight
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const scrollElementProps = {
    ref: containerRef,
    style: { height: containerHeight, overflow: 'auto' as const },
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };

  const wrapperProps = {
    style: { height: totalHeight, position: 'relative' as const }
  };

  return {
    visibleItems,
    totalHeight,
    scrollElementProps,
    wrapperProps,
    scrollTop,
    scrollToIndex: (index: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = index * itemHeight;
      }
    }
  };
}

// 表格虚拟滚动组件
interface VirtualTableProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  columns: {
    key: string;
    title: string;
    width?: string | number;
    render?: (item: T, index: number) => React.ReactNode;
  }[];
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  onRowClick?: (item: T, index: number) => void;
  loading?: boolean;
  emptyText?: string;
}

export function VirtualTable<T extends Record<string, any>>({
  items,
  itemHeight,
  containerHeight,
  columns,
  className,
  headerClassName,
  rowClassName,
  onRowClick,
  loading = false,
  emptyText = '暂无数据'
}: VirtualTableProps<T>) {
  const headerHeight = 40; // 表头高度
  const bodyHeight = containerHeight - headerHeight;

  const renderRow = useCallback((item: T, index: number) => {
    const rowClass = typeof rowClassName === 'function' 
      ? rowClassName(item, index) 
      : rowClassName;

    return (
      <div
        className={cn(
          'flex items-center border-b border-gray-200 hover:bg-gray-50 cursor-pointer',
          rowClass
        )}
        style={{ height: itemHeight }}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-2 text-sm text-gray-900 truncate"
            style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
          >
            {column.render ? column.render(item, index) : item[column.key]}
          </div>
        ))}
      </div>
    );
  }, [columns, itemHeight, rowClassName, onRowClick]);

  if (loading) {
    return (
      <div className={cn('border border-gray-200 rounded-lg', className)}>
        {/* 表头 */}
        <div className={cn('flex bg-gray-50 border-b border-gray-200', headerClassName)} style={{ height: headerHeight }}>
          {columns.map((column) => (
            <div
              key={column.key}
              className="px-4 py-2 text-sm font-medium text-gray-700 truncate"
              style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
            >
              {column.title}
            </div>
          ))}
        </div>
        
        {/* 加载状态 */}
        <div className="flex items-center justify-center" style={{ height: bodyHeight }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn('border border-gray-200 rounded-lg', className)}>
        {/* 表头 */}
        <div className={cn('flex bg-gray-50 border-b border-gray-200', headerClassName)} style={{ height: headerHeight }}>
          {columns.map((column) => (
            <div
              key={column.key}
              className="px-4 py-2 text-sm font-medium text-gray-700 truncate"
              style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
            >
              {column.title}
            </div>
          ))}
        </div>
        
        {/* 空状态 */}
        <div className="flex items-center justify-center" style={{ height: bodyHeight }}>
          <span className="text-gray-500">{emptyText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border border-gray-200 rounded-lg overflow-hidden', className)}>
      {/* 表头 */}
      <div className={cn('flex bg-gray-50 border-b border-gray-200', headerClassName)} style={{ height: headerHeight }}>
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-2 text-sm font-medium text-gray-700 truncate"
            style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
          >
            {column.title}
          </div>
        ))}
      </div>
      
      {/* 虚拟滚动表格体 */}
      <VirtualList
        items={items}
        itemHeight={itemHeight}
        containerHeight={bodyHeight}
        renderItem={renderRow}
      />
    </div>
  );
}

export default VirtualList;