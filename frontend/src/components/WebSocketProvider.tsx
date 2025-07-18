import React, { useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConnected } = useWebSocket();

  useEffect(() => {
    console.log('WebSocket connection status:', isConnected);
  }, [isConnected]);

  return <>{children}</>;
};