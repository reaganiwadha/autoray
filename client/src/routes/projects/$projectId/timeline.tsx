import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { chatProjectStream, type ProjectMedia } from '../../../api/projects'
import { useProjectContext } from '../../../contexts/ProjectContext'
import ReactMarkdown from 'react-markdown'
import { 
    Search, 
    MessageSquare,
    Send,
    Loader2,
    FileVideo,
    FileImage
} from 'lucide-react'

export const Route = createFileRoute('/projects/$projectId/timeline')({
  component: TimelineRoute,
})

function TimelineRoute() {
  const { projectId } = Route.useParams()
  const { projectMedia, s3BaseUrl } = useProjectContext()

  return (
    <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-6 transition-all duration-300">
             <Timeline media={projectMedia} />
        </div>
        <div className="w-96 border-l border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden flex flex-col animate-in slide-in-from-right duration-200">
            <ChatPane projectId={projectId} s3BaseUrl={s3BaseUrl} />
        </div>
    </div>
  )
}

function Timeline({ media: _media }: { media: ProjectMedia[] }) {
    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex-1 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] border-dashed flex flex-col items-center justify-center p-12 text-center">
                <h3 className="text-lg font-bold mb-2 text-[var(--text-secondary)]">Editor Timeline goes here TODO TODO TODO</h3>
            </div>
            
            <div className="h-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] border-dashed rounded-2xl flex items-center justify-center">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Timeline tracks goes here TODO TODO TODO</h4>
            </div>
        </div>
  )
}

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
    referencedMedia?: any[]
    isSearching?: boolean
}

function ChatPane({ projectId, s3BaseUrl }: { projectId: string, s3BaseUrl: string }) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: "Hi! I'm Autoray, your AI video editor. How can I help you with your project today?" }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

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

        // Add an empty assistant message that we'll stream into
        setMessages(prev => [...prev, { role: 'assistant', content: '', referencedMedia: [] }])

        try {
            const reader = await chatProjectStream(projectId, userMsg)
            const decoder = new TextDecoder()
            let buffer = ''
            
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                
                const chunk = decoder.decode(value, { stream: true })
                buffer += chunk
                
                // Parse structured events
                const lines = buffer.split('\n')
                // Keep the last partial line in buffer
                buffer = lines.pop() || ''
                
                for (const line of lines) {
                    if (line.startsWith('EVENT:TOOL_CALL:')) {
                        setMessages(prev => {
                            const last = { ...prev[prev.length - 1] }
                            last.isSearching = true
                            return [...prev.slice(0, -1), last]
                        })
                    } else if (line.startsWith('EVENT:TOOL_RESULT:')) {
                        const data = JSON.parse(line.replace('EVENT:TOOL_RESULT:', ''))
                        if (data.function === 'search_media') {
                            const results = JSON.parse(data.result)
                            setMessages(prev => {
                                const last = { ...prev[prev.length - 1] }
                                last.referencedMedia = [...(last.referencedMedia || []), ...results]
                                last.isSearching = false
                                return [...prev.slice(0, -1), last]
                            })
                        }
                    } else if (line.startsWith('TEXT:')) {
                        const text = line.replace('TEXT:', '')
                        setMessages(prev => {
                            const last = { ...prev[prev.length - 1] }
                            last.content += text
                            return [...prev.slice(0, -1), last]
                        })
                    }
                }
            }
            
            // Handle any remaining text in TEXT: format if buffer has it
            if (buffer.startsWith('TEXT:')) {
                 const text = buffer.replace('TEXT:', '')
                 setMessages(prev => {
                    const last = { ...prev[prev.length - 1] }
                    last.content += text
                    return [...prev.slice(0, -1), last]
                })
            }

        } catch (err) {
            console.error('Chat error:', err)
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }
            ])
        } finally {
            setIsTyping(false)
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
                                    {msg.isSearching && (
                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-secondary)] italic animate-pulse">
                                            <Search size={10} /> Searching media bin...
                                        </div>
                                    )}
                                </>
                            ) : (
                                msg.content
                            )}
                        </div>
                        
                        {msg.referencedMedia && msg.referencedMedia.length > 0 && (
                            <div className="flex flex-wrap gap-2 max-w-[85%]">
                                {msg.referencedMedia.map((m, mi) => (
                                    <div key={mi} className="flex items-center gap-2 p-1.5 bg-[var(--accents-1)] border border-[var(--border-color)] rounded-lg">
                                        <div className="w-8 h-8 rounded bg-black flex-shrink-0 overflow-hidden">
                                            <MiniThumb media={m} s3BaseUrl={s3BaseUrl} />
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <p className="text-[10px] font-bold truncate max-w-[100px]">{m.filename}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {isTyping && messages[messages.length - 1]?.content === '' && !messages[messages.length - 1]?.isSearching && (
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

function MiniThumb({ media, s3BaseUrl }: { media: any, s3BaseUrl: string }) {
    const thumb = media.thumbnails?.find((t: any) => t.type === 'small') || media.thumbnails?.[0]
    const thumbUrl = thumb ? `${s3BaseUrl}/thumbnails/${thumb.s3_key}` : null
    const isVideo = media.content_type?.startsWith('video/')

    if (thumbUrl) return <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
    return isVideo ? <FileVideo className="text-[var(--text-secondary)] m-auto" size={16} /> : <FileImage className="text-[var(--text-secondary)] m-auto" size={16} />
}
