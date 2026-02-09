import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { submitJob, type ChatMessage as ApiChatMessage } from '../../../api/projects'
import { useProjectContext } from '../../../contexts/ProjectContext'
import ReactMarkdown from 'react-markdown'
import {
    MessageSquare,
    Send,
    Loader2,
    Wrench
} from 'lucide-react'

export const Route = createFileRoute('/projects/$projectId/timeline')({
  component: TimelineRoute,
})

function TimelineRoute() {
  const { projectId } = Route.useParams()

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-auto p-6 transition-all duration-300">
        <Timeline />
      </div>
      <div className="w-96 border-l border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden flex flex-col animate-in slide-in-from-right duration-200">
        <ChatPane projectId={projectId} />
      </div>
    </div>
  )
}

function Timeline() {
  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex-1 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] border-dashed flex flex-col items-center justify-center p-12 text-center">
        <h3 className="text-lg font-bold mb-2 text-[var(--text-secondary)]">Editor Timeline</h3>
        <p className="text-sm text-[var(--text-secondary)]">Use the chat to instruct the AI editor</p>
      </div>

      <div className="h-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] border-dashed rounded-2xl flex items-center justify-center">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Timeline tracks</h4>
      </div>
    </div>
  )
}

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
  toolCall?: string
}

function ChatPane({ projectId }: { projectId: string }) {
  const { project, refreshProject } = useProjectContext()
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load chat history from project on mount
  useEffect(() => {
    const history = project.chat_history || []
    const displayMsgs: DisplayMessage[] = history
      .filter((m: ApiChatMessage) => m.role === 'user' || m.role === 'agent')
      .map((m: ApiChatMessage) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

    if (displayMsgs.length === 0) {
      displayMsgs.push({ role: 'assistant', content: "Hi! I'm your AI video editor. How can I help you with your project today?" })
    }

    setMessages(displayMsgs)
  }, [project.chat_history])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsTyping(true)

    // Add empty assistant message to stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    const es = submitJob(projectId, userMsg)

    es.addEventListener('token', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        setMessages(prev => {
          const last = { ...prev[prev.length - 1] }
          last.content += data.data?.content || ''
          last.toolCall = undefined
          return [...prev.slice(0, -1), last]
        })
      } catch {}
    })

    es.addEventListener('tool_call', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        const d = data.data || {}
        setMessages(prev => {
          const last = { ...prev[prev.length - 1] }
          last.toolCall = `${d.plugin || ''}.${d.function || ''}`
          return [...prev.slice(0, -1), last]
        })
      } catch {}
    })

    es.addEventListener('agent_message', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        setMessages(prev => {
          const last = { ...prev[prev.length - 1] }
          last.content = data.data?.content || last.content
          last.toolCall = undefined
          return [...prev.slice(0, -1), last]
        })
      } catch {}
    })

    es.addEventListener('completed', () => {
      es.close()
      setIsTyping(false)
      refreshProject()
    })

    es.addEventListener('error', (event: MessageEvent) => {
      es.close()
      setIsTyping(false)
      try {
        const data = JSON.parse(event.data)
        setMessages(prev => {
          const last = { ...prev[prev.length - 1] }
          last.content = data.data?.message || 'An error occurred.'
          return [...prev.slice(0, -1), last]
        })
      } catch {
        setMessages(prev => {
          const last = { ...prev[prev.length - 1] }
          last.content = "Sorry, something went wrong."
          return [...prev.slice(0, -1), last]
        })
      }
    })

    es.onerror = () => {
      es.close()
      setIsTyping(false)
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].content === '') {
          const last = { ...prev[prev.length - 1] }
          last.content = "Sorry, I'm having trouble connecting."
          return [...prev.slice(0, -1), last]
        }
        return prev
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <div className="flex items-center gap-2 p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <MessageSquare size={16} className="text-[var(--text-primary)]" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">autoray</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium shadow-sm'
                : 'bg-[var(--accents-1)] text-[var(--text-primary)] border border-[var(--border-color)] prose prose-invert prose-xs'
            }`}>
              {msg.role === 'assistant' ? (
                <>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {msg.toolCall && (
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-secondary)] italic animate-pulse">
                      <Wrench size={10} /> Using {msg.toolCall}...
                    </div>
                  )}
                </>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isTyping && messages.length > 0 && messages[messages.length - 1]?.content === '' && !messages[messages.length - 1]?.toolCall && (
          <div className="flex justify-start">
            <div className="bg-[var(--accents-1)] p-3 rounded-2xl border border-[var(--border-color)]">
              <Loader2 size={14} className="animate-spin text-[var(--text-secondary)]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask Autoray anything..."
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-3 pl-4 pr-12 text-xs outline-none focus:border-[var(--text-primary)] transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
