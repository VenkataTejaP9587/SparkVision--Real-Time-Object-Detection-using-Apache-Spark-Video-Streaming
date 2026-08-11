import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || ''

export const SocketProvider = ({ children }) => {
  const { token } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setConnected(false)
      }
      return
    }

    // Connect
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      setConnected(true)
      // Join user private room
      socket.emit('join', { token })
    })

    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message)
    })

    socketRef.current = socket

    return () => {
      socket.emit('leave', { token })
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [token])

  const on = (event, handler) => {
    socketRef.current?.on(event, handler)
    return () => socketRef.current?.off(event, handler)
  }

  const off = (event, handler) => socketRef.current?.off(event, handler)

  const emit = (event, data) => socketRef.current?.emit(event, data)

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, on, off, emit }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
