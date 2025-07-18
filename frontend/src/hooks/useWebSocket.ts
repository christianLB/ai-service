import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocket.service';
import type { WebSocketNotification } from '../services/websocket.service';

export const useWebSocket = () => {
  const auth = useAuth();
  const token = (auth as any)?.token;

  useEffect(() => {
    if (token) {
      websocketService.connect(token);
    }

    return () => {
      websocketService.disconnect();
    };
  }, [token]);

  const subscribe = useCallback((event: string, handler: (data: WebSocketNotification) => void) => {
    websocketService.on(event, handler);
    
    return () => {
      websocketService.off(event, handler);
    };
  }, []);

  const isConnected = websocketService.isConnected();

  return {
    subscribe,
    isConnected,
    service: websocketService,
  };
};