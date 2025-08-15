/**
 * 实时状态更新Hook
 * 提供WebSocket连接和轮询机制，确保用户状态修改后界面立即更新
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  organization?: string;
  roles: string[];
  permissions: string[];
  created_at: string;
  last_login_at?: string;
  status: 'active' | 'inactive' | 'suspended';
}

interface UpdateEvent {
  type: 'user_updated' | 'user_created' | 'user_deleted' | 'role_assigned';
  userId: string;
  data?: Partial<User>;
  timestamp: number;
}

interface UseRealTimeUpdatesOptions {
  enabled?: boolean;
  pollingInterval?: number;
  onUserUpdate?: (user: User) => void;
  onUserCreated?: (user: User) => void;
  onUserDeleted?: (userId: string) => void;
  onError?: (error: Error) => void;
}

interface UseRealTimeUpdatesReturn {
  isConnected: boolean;
  lastUpdate: number | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  forceRefresh: () => void;
  subscribe: (callback: (event: UpdateEvent) => void) => () => void;
}

export const useRealTimeUpdates = ({
  enabled = true,
  pollingInterval = 30000, // 30秒轮询
  onUserUpdate,
  onUserCreated,
  onUserDeleted,
  onError
}: UseRealTimeUpdatesOptions = {}): UseRealTimeUpdatesReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef<Set<(event: UpdateEvent) => void>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // 广播更新事件给所有订阅者
  const broadcastEvent = useCallback((event: UpdateEvent) => {
    subscribersRef.current.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('订阅者回调执行失败:', error);
      }
    });
    
    // 触发特定类型的回调
    switch (event.type) {
      case 'user_updated':
        if (onUserUpdate && event.data) {
          onUserUpdate(event.data as User);
        }
        break;
      case 'user_created':
        if (onUserCreated && event.data) {
          onUserCreated(event.data as User);
        }
        break;
      case 'user_deleted':
        if (onUserDeleted) {
          onUserDeleted(event.userId);
        }
        break;
    }
    
    setLastUpdate(Date.now());
  }, [onUserUpdate, onUserCreated, onUserDeleted]);

  // 轮询机制（WebSocket不可用时的备选方案）
  const startPolling = useCallback(() => {
    if (!enabled || pollingRef.current) {
      return;
    }

    console.log('启动轮询机制');
    let lastCheckTime = Date.now();

    const poll = async () => {
      try {
        const response = await fetch(`/api/users/admin/updates?since=${lastCheckTime}`);
        if (response.ok) {
          const updates = await response.json();
          if (updates && updates.length > 0) {
            updates.forEach((update: UpdateEvent) => {
              broadcastEvent(update);
            });
          }
          lastCheckTime = Date.now();
          setConnectionStatus('connected');
        }
      } catch (error) {
        console.error('轮询请求失败:', error);
        setConnectionStatus('error');
        if (onError) {
          onError(error as Error);
        }
      }
    };

    // 立即执行一次
    poll();
    
    // 设置定时轮询
    pollingRef.current = setInterval(poll, pollingInterval);
  }, [enabled, pollingInterval, broadcastEvent, onError]);

  // WebSocket连接
  const connectWebSocket = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      // 尝试连接WebSocket（如果服务器支持）
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/users`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // 设置连接超时
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket连接超时，回退到轮询机制');
          ws.close();
          startPolling();
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket连接已建立');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as UpdateEvent;
          broadcastEvent(data);
        } catch (error) {
          console.error('WebSocket消息解析失败:', error);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket连接已关闭', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        
        // 如果是正常关闭或服务器不支持WebSocket，直接使用轮询
        if (event.code === 1006 || event.code === 1002 || event.code === 404) {
          console.log('WebSocket服务不可用，使用轮询机制');
          setConnectionStatus('disconnected');
          startPolling();
          return;
        }
        
        setConnectionStatus('disconnected');
        
        // 自动重连（仅在非服务器不支持的情况下）
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          // 重连次数用完，回退到轮询
          startPolling();
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket连接错误，回退到轮询机制:', error);
        setConnectionStatus('error');
        // 不调用onError，因为这是预期的回退行为
        // 直接启动轮询作为备选方案
        startPolling();
      };
    } catch (error) {
      console.log('WebSocket初始化失败，使用轮询机制:', error);
      setConnectionStatus('error');
      // 如果WebSocket不可用，回退到轮询
      startPolling();
    }
  }, [enabled, broadcastEvent, onError, startPolling]);

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // 断开WebSocket连接
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // 强制刷新
  const forceRefresh = useCallback(() => {
    const event: UpdateEvent = {
      type: 'user_updated',
      userId: 'force_refresh',
      timestamp: Date.now()
    };
    broadcastEvent(event);
  }, [broadcastEvent]);

  // 订阅更新事件
  const subscribe = useCallback((callback: (event: UpdateEvent) => void) => {
    subscribersRef.current.add(callback);
    
    // 返回取消订阅函数
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  // 初始化连接
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 直接使用轮询机制，因为WebSocket服务器端点可能不存在
    // 在生产环境中，可以根据需要启用WebSocket
    if (process.env.NODE_ENV === 'development') {
      // 开发环境优先尝试WebSocket
      connectWebSocket();
      
      // 如果WebSocket连接失败，3秒后启动轮询
      const fallbackTimeout = setTimeout(() => {
        if (connectionStatus !== 'connected') {
          startPolling();
        }
      }, 3000);

      return () => {
        clearTimeout(fallbackTimeout);
        disconnectWebSocket();
        stopPolling();
      };
    } else {
      // 生产环境直接使用轮询
      startPolling();
      
      return () => {
        disconnectWebSocket();
        stopPolling();
      };
    }
  }, [enabled, connectWebSocket, startPolling, disconnectWebSocket, stopPolling, connectionStatus]);

  // 清理资源
  useEffect(() => {
    return () => {
      disconnectWebSocket();
      stopPolling();
      subscribersRef.current.clear();
    };
  }, [disconnectWebSocket, stopPolling]);

  return {
    isConnected,
    lastUpdate,
    connectionStatus,
    forceRefresh,
    subscribe
  };
};

export default useRealTimeUpdates;