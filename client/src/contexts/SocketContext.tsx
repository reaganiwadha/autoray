import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useAuth } from './AuthContext'

export interface SocketEvent {
    type: string
    [key: string]: any
}

interface SocketContextType {
    // You can add methods to send messages if needed
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
    const { token } = useAuth()
    const socketRef = useRef<WebSocket | null>(null)
    const eventListeners = useRef<Set<(event: SocketEvent) => void>>(new Set())

    useEffect(() => {
        if (!token) {
            if (socketRef.current) {
                socketRef.current.close()
            }
            return
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = 'localhost:8000' // Should probably be configurable
        const ws = new WebSocket(`${protocol}//${host}/ws?token=${token}`)

        ws.onopen = () => {
            console.log('WebSocket Connected')
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as SocketEvent
                eventListeners.current.forEach(listener => listener(data))
            } catch (err) {
                console.error('Failed to parse websocket message', err)
            }
        }

        ws.onclose = () => {
            console.log('WebSocket Disconnected')
        }

        socketRef.current = ws

        return () => {
            ws.close()
        }
    }, [token])

    const addEventListener = (callback: (event: SocketEvent) => void) => {
        eventListeners.current.add(callback)
        return () => eventListeners.current.delete(callback)
    }

    return (
        <SocketContext.Provider value={{}}>
            <SocketInternalContext.Provider value={{ addEventListener }}>
                {children}
            </SocketInternalContext.Provider>
        </SocketContext.Provider>
    )
}

// Internal context to avoid exposing addEventListener to the world directly if we want a cleaner hook
const SocketInternalContext = createContext<{ addEventListener: (cb: (e: SocketEvent) => void) => () => void } | undefined>(undefined)

export function useSocket(onEvent?: (event: SocketEvent) => void) {
    const context = useContext(SocketInternalContext)
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider')
    }

    useEffect(() => {
        if (onEvent) {
            return context.addEventListener(onEvent)
        }
    }, [onEvent, context])

    return context
}
