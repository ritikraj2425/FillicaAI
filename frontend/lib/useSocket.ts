import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketProps {
  url: string;
  autoConnect?: boolean;
}

export function useSocket({ url, autoConnect = true }: UseSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // Initialize socket connection
    const socketInstance = io(url, {
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      setSocket(socketInstance);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
   
  }, [url, autoConnect]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emit = (eventName: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(eventName, data);
    } else {
      console.warn(`[Socket] Cannot emit ${eventName}, socket disconnected.`);
    }
  };

  return { socket, isConnected, emit };
}
