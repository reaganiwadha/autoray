import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useMemo } from 'react'
import { getProject, getProjectMedia, updateProjectMedia, addMediaToProject, type Project, type ProjectMedia } from '../../api/projects'
import { uploadMedia, type MediaResponse } from '../../api/media'
import { 
    LayoutGrid, 
    List as ListIcon,
    Clock, 
    Download, 
    Upload, 
    Search, 
    Eye,
    EyeOff,
    FileVideo,
    FileImage,
    ExternalLink,
    Loader2,
    X,
    ChevronUp,
    ChevronDown,
    Calendar,
    FileText,
    Info,
    Sparkles
} from 'lucide-react'
import { format } from 'date-fns'

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectDetail,
})

type SortField = 'name' | 'uploaded'
type SortOrder = 'asc' | 'desc'

function ProjectDetail() {
  const { projectId } = Route.useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [projectMedia, setProjectMedia] = useState<ProjectMedia[]>([])
  const [activeTab, setActiveTab] = useState<'media' | 'timeline' | 'export'>('media')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortField, setSortField] = useState<SortField>('uploaded')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const s3BaseUrl = 'http://localhost:9000'

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [projData, mediaData] = await Promise.all([
        getProject(projectId),
        getProjectMedia(projectId)
      ])
      setProject(projData)
      setProjectMedia(mediaData)
    } catch (err) {
      console.error('Failed to load project data', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return
    
    setIsUploading(true)
    try {
      const files = Array.from(event.target.files)
      for (const file of files) {
        const media = await uploadMedia(file)
        const assoc = await addMediaToProject(projectId, media.id)
        setProjectMedia(prev => [assoc, ...prev])
      }
    } catch (err) {
      console.error('Upload failed', err)
      alert('Failed to upload one or more files.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleToggleUnused = async (mediaId: number, currentStatus: boolean) => {
    try {
      const updated = await updateProjectMedia(projectId, mediaId, !currentStatus)
      setProjectMedia(prev => prev.map(m => m.media_id === mediaId ? updated : m))
    } catch (err) {
      console.error('Failed to update media status', err)
    }
  }

  const handleDownload = (media: MediaResponse) => {
    const url = `${s3BaseUrl}/medias/${media.s3_key}`
    const link = document.createElement('a')
    link.href = url
    link.download = media.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredAndSortedMedia = useMemo(() => {
    let result = [...projectMedia]
    
    // Filter
    if (searchQuery) {
        const q = searchQuery.toLowerCase()
        result = result.filter(pm => pm.media.filename.toLowerCase().includes(q))
    }

    // Sort
    result.sort((a, b) => {
        let valA: any = a.media.filename
        let valB: any = b.media.filename
        
        if (sortField === 'uploaded') {
            valA = new Date(a.created_at).getTime()
            valB = new Date(b.created_at).getTime()
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
    })

    return result
  }, [projectMedia, searchQuery, sortField, sortOrder])

  const selectedMedia = useMemo(() => 
    projectMedia.find(pm => pm.media_id === selectedMediaId),
    [projectMedia, selectedMediaId]
  )

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>
  if (!project) return <div className="p-20 text-center">Project not found</div>

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[var(--bg-primary)]">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple 
        onChange={handleFileUpload}
        accept="video/*,image/*"
      />
      
      {/* Sub Header / Tabs */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-6">
          <h1 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">{project.name}</h1>
          <nav className="flex gap-4">
            <TabButton active={activeTab === 'media'} onClick={() => setActiveTab('media')} icon={<LayoutGrid size={16}/>} label="Media Bin" />
            <TabButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} icon={<Clock size={16}/>} label="Timeline" />
            <TabButton active={activeTab === 'export'} onClick={() => setActiveTab('export')} icon={<Download size={16}/>} label="Export" />
          </nav>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6 transition-all duration-300">
            {activeTab === 'media' && (
            <MediaBin 
                media={filteredAndSortedMedia} 
                viewMode={viewMode}
                setViewMode={setViewMode}
                sortField={sortField}
                setSortField={setSortField}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onToggleUnused={handleToggleUnused} 
                onDownload={handleDownload}
                onUploadClick={() => fileInputRef.current?.click()}
                onSelectMedia={(id) => setSelectedMediaId(id === selectedMediaId ? null : id)}
                selectedMediaId={selectedMediaId}
                isUploading={isUploading}
                s3BaseUrl={s3BaseUrl}
            />
            )}
            {activeTab === 'timeline' && <Placeholder tab="Timeline" description="AI-powered non-linear editor timeline goes here." />}
            {activeTab === 'export' && <Placeholder tab="Export" description="Render and download your final video." />}
        </div>

        {/* Right Sidebar Detail Pane */}
        {selectedMedia && (
            <div className="w-96 border-l border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-auto animate-in slide-in-from-right duration-200">
                <DetailPane 
                    pm={selectedMedia} 
                    onClose={() => setSelectedMediaId(null)} 
                    onDownload={handleDownload}
                    onToggleUnused={handleToggleUnused}
                    s3BaseUrl={s3BaseUrl}
                />
            </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active 
          ? 'bg-white text-black dark:bg-white dark:text-black' 
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function MediaBin({ 
    media, 
    viewMode, setViewMode,
    sortField, setSortField,
    sortOrder, setSortOrder,
    searchQuery, setSearchQuery,
    onToggleUnused, 
    onDownload, 
    onUploadClick, 
    onSelectMedia,
    selectedMediaId,
    isUploading, 
    s3BaseUrl 
}: { 
    media: ProjectMedia[], 
    viewMode: 'grid' | 'list',
    setViewMode: (m: 'grid' | 'list') => void,
    sortField: SortField,
    setSortField: (f: SortField) => void,
    sortOrder: SortOrder,
    setSortOrder: (o: SortOrder) => void,
    searchQuery: string,
    setSearchQuery: (q: string) => void,
    onToggleUnused: (id: number, status: boolean) => void,
    onDownload: (m: MediaResponse) => void,
    onUploadClick: () => void,
    onSelectMedia: (id: number) => void,
    selectedMediaId: number | null,
    isUploading: boolean,
    s3BaseUrl: string
}) {
  const toggleSort = (field: SortField) => {
      if (sortField === field) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
          setSortField(field)
          setSortOrder('asc')
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <button 
                onClick={onUploadClick}
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
                    placeholder="Search bin..." 
                    className="bg-transparent border-none text-sm outline-none w-48" 
                />
            </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {media.map((pm) => (
            <MediaCard 
                key={pm.media_id} 
                pm={pm} 
                onToggleUnused={onToggleUnused} 
                onDownload={onDownload}
                onSelect={() => onSelectMedia(pm.media_id)}
                isSelected={selectedMediaId === pm.media_id}
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
                        <th className="px-4 py-3 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                    {media.map((pm) => (
                        <tr 
                            key={pm.media_id} 
                            onClick={() => onSelectMedia(pm.media_id)}
                            className={`group cursor-pointer hover:bg-white/5 transition-colors ${pm.media_id === selectedMediaId ? 'bg-white/10' : ''} ${pm.is_unused ? 'opacity-50 grayscale' : ''}`}
                        >
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        <ThumbImage media={pm.media} s3BaseUrl={s3BaseUrl} size="small" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-medium truncate max-w-[200px]">{pm.media.filename}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                                {pm.media.content_type.split('/')[1].toUpperCase()}
                            </td>
                            <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                                {(pm.media.size / 1024 / 1024).toFixed(1)} MB
                            </td>
                            <td className="px-4 py-3 text-right text-[var(--text-secondary)]">
                                {format(new Date(pm.created_at), 'MMM d, yyyy')}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                <button 
                                    onClick={() => onToggleUnused(pm.media_id, pm.is_unused)}
                                    className={`p-1 rounded hover:bg-white/10 ${pm.is_unused ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}
                                >
                                    {pm.is_unused ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {media.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)]">
              <div className="flex flex-col items-center gap-3">
                  <LayoutGrid size={48} className="text-[var(--text-secondary)] opacity-20" />
                  <p className="text-[var(--text-secondary)]">{searchQuery ? 'No matching files found' : 'Your media bin is empty'}</p>
                  {!searchQuery && <button onClick={onUploadClick} className="mt-2 text-sm font-bold underline">Add your first clip</button>}
              </div>
          </div>
      )}
    </div>
  )
}

function MediaCard({ pm, onToggleUnused, onDownload, onSelect, isSelected, s3BaseUrl }: { 
    pm: ProjectMedia, 
    onToggleUnused: (id: number, status: boolean) => void,
    onDownload: (m: MediaResponse) => void,
    onSelect: () => void,
    isSelected: boolean,
    s3BaseUrl: string
}) {
  const { media } = pm
  const isVideo = media.content_type.startsWith('video/')

  return (
    <div 
        onClick={onSelect}
        className={`group relative flex flex-col bg-[var(--bg-secondary)] rounded-xl border transition-all overflow-hidden cursor-pointer ${
        isSelected ? 'border-white ring-1 ring-white' : 
        pm.is_unused ? 'opacity-50 grayscale border-transparent' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'
    }`}>
      {/* Preview Area */}
      <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
        <ThumbImage media={media} s3BaseUrl={s3BaseUrl} size="small" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
            {pm.is_unused && (
                <span className="bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                    <EyeOff size={10} /> UNUSED
                </span>
            )}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3" onClick={e => e.stopPropagation()}>
            <button onClick={() => window.open(`${s3BaseUrl}/medias/${media.s3_key}`)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" title="Preview">
                <ExternalLink size={20} />
            </button>
            <button onClick={() => onDownload(media)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" title="Download">
                <Download size={20} />
            </button>
        </div>
      </div>

      {/* Info Area */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
                <p className="text-xs font-semibold truncate leading-tight" title={media.filename}>{media.filename}</p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                    {(media.size / 1024 / 1024).toFixed(1)} MB • {isVideo ? 'Video' : 'Image'}
                </p>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onToggleUnused(pm.media_id, pm.is_unused); }}
                className={`p-1 rounded transition-colors ${pm.is_unused ? 'text-red-500 hover:bg-red-500/10' : 'text-[var(--text-secondary)] hover:bg-white/10'}`}
                title={pm.is_unused ? "Mark as Used" : "Mark as Unused"}
            >
                {pm.is_unused ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
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

function DetailPane({ pm, onClose, onDownload, onToggleUnused, s3BaseUrl }: { 
    pm: ProjectMedia, 
    onClose: () => void, 
    onDownload: (m: MediaResponse) => void,
    onToggleUnused: (id: number, status: boolean) => void,
    s3BaseUrl: string
}) {
    const { media } = pm
    const isVideo = media.content_type.startsWith('video/')

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
                    <Info size={14} /> File Details
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
                    <X size={18} />
                </button>
            </div>

            <div className="p-6 space-y-8">
                {/* Preview */}
                <div className="space-y-4">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden border border-[var(--border-color)] shadow-xl relative">
                        <ThumbImage media={media} s3BaseUrl={s3BaseUrl} size="large" className="w-full h-full object-contain" />
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
                            {pm.is_unused && <span className="px-2 py-0.5 bg-red-500/20 text-red-500 border border-red-500/20 rounded text-[10px] font-bold uppercase">Unused</span>}
                        </div>
                    </div>
                </div>

                {/* AI Summary Placeholder */}
                <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-tighter">
                        <Sparkles size={14} /> Autoray Insights
                    </div>
                    <div className="space-y-2">
                        <div className="h-2 w-full bg-indigo-500/10 rounded animate-pulse" />
                        <div className="h-2 w-[90%] bg-indigo-500/10 rounded animate-pulse" />
                        <div className="h-2 w-[70%] bg-indigo-500/10 rounded animate-pulse" />
                    </div>
                    <p className="text-[10px] text-indigo-300/60 leading-relaxed italic">
                        The AI summary for this {isVideo ? 'video' : 'image'} will be generated once the autoray indexing process is complete.
                    </p>
                </div>

                {/* Metadata Table */}
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

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button 
                        onClick={() => onToggleUnused(pm.media_id, pm.is_unused)}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-bold transition-all ${
                            pm.is_unused 
                            ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20' 
                            : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
                        }`}
                    >
                        {pm.is_unused ? <><Eye size={16} /> Mark as Used</> : <><EyeOff size={16} /> Mark as Unused</>}
                    </button>
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

function Placeholder({ tab, description }: { tab: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] border-dashed">
      <h2 className="text-xl font-bold mb-2">{tab} Placeholder</h2>
      <p className="text-[var(--text-secondary)]">{description}</p>
    </div>
  )
}