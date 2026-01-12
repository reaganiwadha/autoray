import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useMemo } from 'react'
import { getMedia, uploadMedia, deleteMedia, type MediaResponse } from '../api/media'
import { useSocket, type SocketEvent } from '../contexts/SocketContext'
import { 
    LayoutGrid, 
    List as ListIcon,
    Download, 
    Upload, 
    Search, 
    FileVideo,
    FileImage,
    ExternalLink,
    Loader2,
    X,
    ChevronUp,
    ChevronDown,
    FileText,
    Info,
    Sparkles,
    Trash2
} from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/media-bin')({
  component: MediaBinPage,
})

type SortField = 'name' | 'uploaded'
type SortOrder = 'asc' | 'desc'

function MediaBinPage() {
  const [media, setMedia] = useState<MediaResponse[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortField, setSortField] = useState<SortField>('uploaded')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const s3BaseUrl = 'http://localhost:9000'

  useSocket((event: SocketEvent) => {
    if (event.type === 'MEDIA_ANALYSIS_COMPLETE') {
      loadMedia(true)
    }
  })

  useEffect(() => {
    loadMedia()
  }, [])

  const loadMedia = async (silent = false) => {
    if (!silent) setIsLoading(true)
    try {
      const data = await getMedia()
      setMedia(data)
    } catch (err) {
      console.error('Failed to load media', err)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return
    
    setIsUploading(true)
    try {
      const files = Array.from(event.target.files)
      for (const file of files) {
        const newMedia = await uploadMedia(file)
        setMedia(prev => [newMedia, ...prev])
      }
    } catch (err) {
      console.error('Upload failed', err)
      alert('Failed to upload one or more files.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownload = (m: MediaResponse) => {
    const url = `${s3BaseUrl}/medias/${m.s3_key}`
    const link = document.createElement('a')
    link.href = url
    link.download = m.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = async (m: MediaResponse) => {
    if (!window.confirm(`Are you sure you want to delete "${m.filename}"? This will also remove it from all projects.`)) return
    
    try {
      await deleteMedia(m.id)
      setMedia(prev => prev.filter(item => item.id !== m.id))
      if (selectedMediaId === m.id) setSelectedMediaId(null)
    } catch (err) {
      console.error('Failed to delete media', err)
      alert('Failed to delete media.')
    }
  }

  const filteredAndSortedMedia = useMemo(() => {
    let result = [...media]
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase()
        result = result.filter(m => m.filename.toLowerCase().includes(q))
    }

    result.sort((a, b) => {
        let valA: any = a.filename
        let valB: any = b.filename
        
        if (sortField === 'uploaded') {
            valA = new Date(a.created_at).getTime()
            valB = new Date(b.created_at).getTime()
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
    })

    return result
  }, [media, searchQuery, sortField, sortOrder])

  const selectedMedia = useMemo(() => 
    media.find(m => m.id === selectedMediaId),
    [media, selectedMediaId]
  )

  const toggleSort = (field: SortField) => {
      if (sortField === field) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
          setSortField(field)
          setSortOrder('asc')
      }
  }

  if (isLoading && media.length === 0) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[var(--bg-primary)]">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple 
        onChange={handleFileUpload}
        accept="video/*,image/*,audio/wav,audio/mpeg"
      />
      
      {/* Sub Header */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <h1 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">Global Media Bin</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6 transition-all duration-300">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black dark:bg-white dark:text-black rounded-lg text-sm font-bold hover:opacity-90 transition-colors disabled:opacity-50"
                        >
                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 
                            {isUploading ? 'Uploading...' : 'Upload Media'}
                        </button>
                        <div className="h-8 w-[1px] bg-[var(--border-color)] mx-2" />
                        <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-1">
                            <button onClick={() => setViewMode('grid')} className={`p-1 rounded ${viewMode === 'grid' ? 'bg-[var(--border-color)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                <LayoutGrid size={16} />
                            </button>
                            <button onClick={() => setViewMode('list')} className={`p-1 rounded ${viewMode === 'list' ? 'bg-[var(--border-color)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                <ListIcon size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                            Sort by:
                            <button onClick={() => toggleSort('name')} className={`flex items-center gap-1 hover:text-[var(--text-primary)] ${sortField === 'name' ? 'text-[var(--text-primary)]' : ''}`}>
                                Name {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                            </button>
                            <button onClick={() => toggleSort('uploaded')} className={`flex items-center gap-1 hover:text-[var(--text-primary)] ${sortField === 'uploaded' ? 'text-[var(--text-primary)]' : ''}`}>
                                Date {sortField === 'uploaded' && (sortOrder === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg">
                            <Search size={14} className="text-[var(--text-secondary)]" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search all media..." 
                                className="bg-transparent border-none text-sm outline-none w-48" 
                            />
                        </div>
                    </div>
                </div>

                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6">
                        {filteredAndSortedMedia.map((m) => (
                        <MediaCard 
                            key={m.id} 
                            media={m} 
                            onDownload={handleDownload}
                            onSelect={() => setSelectedMediaId(m.id === selectedMediaId ? null : m.id)}
                            isSelected={selectedMediaId === m.id}
                            s3BaseUrl={s3BaseUrl}
                        />
                        ))}
                    </div>
                ) : (
                    <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-black/20 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Name</th>
                                    <th className="px-4 py-3 font-medium text-center">Type</th>
                                    <th className="px-4 py-3 font-medium text-center">Size</th>
                                    <th className="px-4 py-3 font-medium text-right">Uploaded</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {filteredAndSortedMedia.map((m) => (
                                    <tr 
                                        key={m.id} 
                                        onClick={() => setSelectedMediaId(m.id === selectedMediaId ? null : m.id)}
                                        className={`group cursor-pointer hover:bg-white/5 transition-colors ${m.id === selectedMediaId ? 'bg-white/10' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    <ThumbImage media={m} s3BaseUrl={s3BaseUrl} size="small" className="w-full h-full object-cover" />
                                                </div>
                                                <span className="font-medium truncate max-w-[200px]">{m.filename}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                                            {m.content_type.split('/')[1]?.toUpperCase() || 'BIN'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                                            {(m.size / 1024 / 1024).toFixed(1)} MB
                                        </td>
                                        <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                            {format(new Date(m.created_at), 'MMM d, yyyy')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredAndSortedMedia.length === 0 && !isLoading && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)]">
                        <div className="flex flex-col items-center gap-3">
                            <LayoutGrid size={48} className="text-[var(--text-secondary)] opacity-20" />
                            <p className="text-[var(--text-secondary)]">{searchQuery ? 'No matching files found' : 'Your media bin is empty'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Right Sidebar Detail Pane */}
        {selectedMedia && (
            <div className="w-96 border-l border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-auto animate-in slide-in-from-right duration-200">
                <DetailPane 
                    media={selectedMedia} 
                    onClose={() => setSelectedMediaId(null)} 
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    s3BaseUrl={s3BaseUrl}
                />
            </div>
        )}
      </div>
    </div>
  )
}

function MediaCard({ media, onDownload, onSelect, isSelected, s3BaseUrl }: { 
    media: MediaResponse, 
    onDownload: (m: MediaResponse) => void,
    onSelect: () => void,
    isSelected: boolean,
    s3BaseUrl: string
}) {
  return (
    <div 
        onClick={onSelect}
        className={`group relative flex flex-col bg-[var(--bg-secondary)] rounded-xl border transition-all overflow-hidden cursor-pointer ${
        isSelected ? 'border-white ring-1 ring-white' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'
    }`}>
      <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
        <ThumbImage media={media} s3BaseUrl={s3BaseUrl} size="small" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        
        {/* Progress Bar overlay */}
        <div className="absolute bottom-0 left-0 right-0">
            <AnalysisProgressBar media={media} />
        </div>

        <div 
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onSelect()
                }
            }}
        >
            <button 
                onClick={(e) => { e.stopPropagation(); window.open(`${s3BaseUrl}/medias/${media.s3_key}`); }} 
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" 
                title="Preview"
            >
                <ExternalLink size={20} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onDownload(media); }} 
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" 
                title="Download"
            >
                <Download size={20} />
            </button>
        </div>
      </div>

      <div className="p-3">
        <p className="text-xs font-semibold truncate leading-tight" title={media.filename}>{media.filename}</p>
        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {(media.size / 1024 / 1024).toFixed(1)} MB • {media.content_type.split('/')[1]?.toUpperCase()}
        </p>
      </div>
    </div>
  )
}

function ThumbImage({ media, s3BaseUrl, size, className }: { media: MediaResponse, s3BaseUrl: string, size: 'small' | 'large' | 'gif', className?: string }) {
    const thumb = media.thumbnails.find(t => t.type === size) || media.thumbnails[0]
    const thumbUrl = thumb ? `${s3BaseUrl}/thumbnails/${thumb.s3_key}` : null
    const isVideo = media.content_type.startsWith('video/')

    if (thumbUrl) return <img src={thumbUrl} alt="" className={className} />
    return isVideo ? <FileVideo className="text-[var(--text-secondary)]" size={32} /> : <FileImage className="text-[var(--text-secondary)]" size={32} />
}

function DetailPane({ media, onClose, onDownload, onDelete, s3BaseUrl }: { 
    media: MediaResponse, 
    onClose: () => void, 
    onDownload: (m: MediaResponse) => void,
    onDelete: (m: MediaResponse) => void,
    s3BaseUrl: string
}) {
    const [activeTab, setActiveTab] = useState<'visual' | 'transcription' | 'video' | 'audio'>('visual')

    const categories = [
        { id: 'visual', title: 'Visual', isAvailable: media.content_type.startsWith('image/') || media.content_type.startsWith('video/') },
        { id: 'transcription', title: 'Transcript', isAvailable: media.content_type.startsWith('audio/') || media.content_type.startsWith('video/') },
        { id: 'video', title: 'Video', isAvailable: media.content_type.startsWith('video/') },
        { id: 'audio', title: 'Audio', isAvailable: media.content_type.startsWith('audio/') || media.content_type.startsWith('video/') },
    ] as const

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
                    <Info size={14} /> Media Detail
                </h3>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => onDelete(media)} 
                        className="p-1.5 hover:bg-red-500/10 text-red-500 rounded transition-colors"
                        title="Delete Media"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-8">
                <div className="space-y-4">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden border border-[var(--border-color)] shadow-xl relative">
                        <ThumbImage media={media} s3BaseUrl={s3BaseUrl} size="large" className="w-full h-full object-contain" />
                        
                        {/* Progress Bar overlay */}
                        <div className="absolute bottom-0 left-0 right-0">
                            <AnalysisProgressBar media={media} height={4} />
                        </div>

                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <button onClick={() => onDownload(media)} className="p-2 bg-black/60 hover:bg-black text-white rounded-md backdrop-blur-md transition-all">
                                <Download size={16} />
                            </button>
                            <button onClick={() => window.open(`${s3BaseUrl}/medias/${media.s3_key}`)} className="p-2 bg-black/60 hover:bg-black text-white rounded-md backdrop-blur-md transition-all">
                                <ExternalLink size={16} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <h2 className="font-bold text-lg break-all">{media.filename}</h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-[var(--border-color)] rounded text-[10px] font-bold">{media.content_type.toUpperCase()}</span>
                            <span className="px-2 py-0.5 bg-[var(--border-color)] rounded text-[10px] font-bold">{(media.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-xs uppercase tracking-tighter">
                        <Sparkles size={14} /> Autoray Insights
                    </div>

                    <div className="flex p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-tight rounded-md transition-all ${
                                    activeTab === cat.id 
                                    ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-sm' 
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {cat.title}
                            </button>
                        ))}
                    </div>
                    
                    <InsightCategory 
                        title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Summarization`}
                        summary={media.summaries.find(s => s.type === activeTab)?.summary}
                        isAvailable={categories.find(c => c.id === activeTab)?.isAvailable ?? false}
                        mediaType={media.content_type}
                    />
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} /> Metadata
                    </h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs">
                        <MetaItem label="Width" value={media.binary_metadata?.width ? `${media.binary_metadata.width}px` : 'Unknown'} />
                        <MetaItem label="Height" value={media.binary_metadata?.height ? `${media.binary_metadata.height}px` : 'Unknown'} />
                        {media.binary_metadata?.duration && <MetaItem label="Duration" value={`${media.binary_metadata.duration.toFixed(2)}s`} />}
                        {media.binary_metadata?.codec && <MetaItem label="Codec" value={media.binary_metadata.codec} />}
                        <MetaItem label="Date Uploaded" value={format(new Date(media.created_at), 'PP p')} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function MetaItem({ label, value }: { label: string, value: string }) {
    return (
        <div>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-tighter mb-0.5">{label}</p>
            <p className="font-medium truncate">{value}</p>
        </div>
    )
}

function InsightCategory({ title, summary, isAvailable, mediaType }: { 
    title: string, 
    summary?: string, 
    isAvailable: boolean,
    mediaType: string
}) {
    return (
        <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">{title}</h5>
                {!isAvailable && <span className="text-[9px] px-1.5 py-0.5 bg-[var(--accents-2)] text-[var(--text-secondary)] rounded font-bold uppercase">Not Available</span>}
            </div>
            
            {!isAvailable ? (
                <p className="text-[10px] text-[var(--text-secondary)] italic leading-relaxed">
                    This feature is not available for {mediaType.split('/')[0]} files.
                </p>
            ) : summary ? (
                <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                    {summary}
                </p>
            ) : (
                <div className="space-y-2 py-1">
                    <div className="h-1.5 w-full bg-[var(--accents-2)] rounded animate-pulse" />
                    <div className="h-1.5 w-[90%] bg-[var(--accents-2)] rounded animate-pulse" />
                    <p className="text-[10px] text-[var(--text-secondary)] italic">Analyzing...</p>
                </div>
            )}
        </div>
    )
}

function AnalysisProgressBar({ media, height = 2 }: { media: MediaResponse, height?: number }) {
    const categories = [
        { id: 'visual', isAvailable: media.content_type.startsWith('image/') || media.content_type.startsWith('video/') },
        { id: 'transcription', isAvailable: media.content_type.startsWith('audio/') || media.content_type.startsWith('video/') },
        { id: 'video', isAvailable: media.content_type.startsWith('video/') },
        { id: 'audio', isAvailable: media.content_type.startsWith('audio/') || media.content_type.startsWith('video/') },
    ]

    const availableCategories = categories.filter(c => c.isAvailable)
    const completedCategories = availableCategories.filter(c => 
        media.summaries.some(s => s.type === c.id)
    )

    const percentage = availableCategories.length > 0 
        ? (completedCategories.length / availableCategories.length) * 100 
        : 100

    if (percentage === 100) return null

    return (
        <div className="w-full bg-black/40 backdrop-blur-sm" style={{ height: `${height}px` }}>
            <div 
                className="h-full bg-[var(--brand-accent)] transition-all duration-500 ease-out shadow-[0_0_8px_rgba(255,255,255,0.2)]" 
                style={{ width: `${percentage}%` }}
            />
        </div>
    )
}