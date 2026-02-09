import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useRef } from 'react'
import { uploadAsset, deleteAsset, type Asset } from '../../../api/projects'
import { useProjectContext } from '../../../contexts/ProjectContext'
import {
    LayoutGrid,
    List as ListIcon,
    Upload,
    Search,
    FileVideo,
    FileImage,
    Loader2,
    X,
    ChevronUp,
    ChevronDown,
    FileText,
    Info,
    Sparkles,
    Trash2
} from 'lucide-react'

export const Route = createFileRoute('/projects/$projectId/bin')({
  component: BinRoute,
})

type SortField = 'name' | 'uploaded'
type SortOrder = 'asc' | 'desc'

function BinRoute() {
  const { projectId } = Route.useParams()
  const { project, refreshProject } = useProjectContext()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortField, setSortField] = useState<SortField>('uploaded')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const assets = project.assets || []

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return

    setIsUploading(true)
    try {
      const files = Array.from(event.target.files)
      for (const file of files) {
        await uploadAsset(projectId, file)
      }
      await refreshProject()
    } catch (err) {
      console.error('Upload failed', err)
      alert('Failed to upload one or more files.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (asset: Asset) => {
    if (!window.confirm(`Delete this asset?`)) return
    try {
      await deleteAsset(projectId, asset.id)
      await refreshProject()
      if (selectedAssetId === asset.id) setSelectedAssetId(null)
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const filteredAndSortedAssets = useMemo(() => {
    let result = [...assets]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a => a.storage_key.toLowerCase().includes(q))
    }

    result.sort((a, b) => {
      let valA: any = a.storage_key
      let valB: any = b.storage_key

      if (sortField === 'uploaded') {
        // Assets don't have a date, sort by id as proxy
        valA = a.id
        valB = b.id
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [assets, searchQuery, sortField, sortOrder])

  const selectedAsset = useMemo(() =>
    assets.find(a => a.id === selectedAssetId),
    [assets, selectedAssetId]
  )

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileUpload}
        accept="video/*,image/*,audio/wav,audio/mpeg"
      />

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
                  placeholder="Search bin..."
                  className="bg-transparent border-none text-sm outline-none w-48"
                />
              </div>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredAndSortedAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onSelect={() => setSelectedAssetId(asset.id === selectedAssetId ? null : asset.id)}
                  isSelected={selectedAssetId === asset.id}
                />
              ))}
            </div>
          ) : (
            <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
              <table className="w-full text-sm text-left">
                <thead className="bg-black/20 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium text-center">Type</th>
                    <th className="px-4 py-3 font-medium text-center">Analyses</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredAndSortedAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id === selectedAssetId ? null : asset.id)}
                      className={`group cursor-pointer hover:bg-white/5 transition-colors ${asset.id === selectedAssetId ? 'bg-white/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                            <ThumbImage asset={asset} size="small" className="w-full h-full object-cover" />
                          </div>
                          <span className="font-medium truncate max-w-[200px]">{getAssetName(asset)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                        {asset.asset_type}
                      </td>
                      <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                        {asset.analyses.length}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(asset)}
                          className="p-1 rounded hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredAndSortedAssets.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)]">
              <div className="flex flex-col items-center gap-3">
                <LayoutGrid size={48} className="text-[var(--text-secondary)] opacity-20" />
                <p className="text-[var(--text-secondary)]">{searchQuery ? 'No matching files found' : 'Your media bin is empty'}</p>
                {!searchQuery && <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-sm font-bold underline">Add your first clip</button>}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedAsset && (
        <div className="w-96 border-l border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-auto animate-in slide-in-from-right duration-200">
          <DetailPane
            asset={selectedAsset}
            onClose={() => setSelectedAssetId(null)}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  )
}

function getAssetName(asset: Asset): string {
  // Extract filename from storage_key (e.g. "assets/abc123.jpg" -> "abc123.jpg")
  const parts = asset.storage_key.split('/')
  return parts[parts.length - 1] || asset.id
}

function AssetCard({ asset, onSelect, isSelected }: {
  asset: Asset,
  onSelect: () => void,
  isSelected: boolean,
}) {
  const isVideo = asset.asset_type === 'VIDEO'

  return (
    <div
      onClick={onSelect}
      className={`group relative flex flex-col bg-[var(--bg-secondary)] rounded-xl border transition-all overflow-hidden cursor-pointer ${
        isSelected ? 'border-white ring-1 ring-white' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]'
      }`}>
      <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
        <ThumbImage asset={asset} size="small" className="w-full h-full object-cover transition-transform group-hover:scale-105" />

        {/* Analysis progress */}
        {asset.analyses.length === 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/40">
            <div className="h-full bg-[var(--brand-accent)] w-0 animate-pulse" />
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-xs font-semibold truncate leading-tight" title={getAssetName(asset)}>{getAssetName(asset)}</p>
        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
          {asset.asset_type} {asset.metadata.width && asset.metadata.height ? `${asset.metadata.width}x${asset.metadata.height}` : ''}
        </p>
      </div>
    </div>
  )
}

function ThumbImage({ asset, size, className }: { asset: Asset, size: 'small' | 'large' | 'gif', className?: string }) {
  const thumbUrl = asset.metadata.thumbnails?.[size]
  const isVideo = asset.asset_type === 'VIDEO'

  if (thumbUrl) return <img src={thumbUrl} alt="" className={className} />
  return isVideo ? <FileVideo className="text-[var(--text-secondary)]" size={32} /> : <FileImage className="text-[var(--text-secondary)]" size={32} />
}

function DetailPane({ asset, onClose, onDelete }: {
  asset: Asset,
  onClose: () => void,
  onDelete: (a: Asset) => void,
}) {
  const [activeTab, setActiveTab] = useState<string>('visual')

  const categories = [
    { id: 'visual', title: 'Visual', isAvailable: asset.asset_type === 'IMAGE' || asset.asset_type === 'VIDEO' },
    { id: 'transcription', title: 'Transcript', isAvailable: asset.asset_type === 'AUDIO' || asset.asset_type === 'VIDEO' },
    { id: 'video', title: 'Video', isAvailable: asset.asset_type === 'VIDEO' },
    { id: 'audio', title: 'Audio', isAvailable: asset.asset_type === 'AUDIO' || asset.asset_type === 'VIDEO' },
  ]

  const activeAnalysis = asset.analyses.find(a => a.analyzer_name.toLowerCase().includes(activeTab))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
          <Info size={14} /> Asset Detail
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(asset)}
            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded transition-colors"
            title="Delete Asset"
          >
            <Trash2 size={18} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Preview */}
        <div className="space-y-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden border border-[var(--border-color)] shadow-xl">
            <ThumbImage asset={asset} size="large" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="font-bold text-lg break-all">{getAssetName(asset)}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-0.5 bg-[var(--border-color)] rounded text-[10px] font-bold">{asset.asset_type}</span>
              <span className="px-2 py-0.5 bg-[var(--border-color)] rounded text-[10px] font-bold">{asset.id.slice(0, 12)}...</span>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-xs uppercase tracking-tighter">
            <Sparkles size={14} /> Insights
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

          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl space-y-2">
            {activeAnalysis ? (
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {typeof activeAnalysis.content === 'string' ? activeAnalysis.content : JSON.stringify(activeAnalysis.content)}
              </p>
            ) : (
              <div className="space-y-2 py-1">
                <div className="h-1.5 w-full bg-[var(--accents-2)] rounded animate-pulse" />
                <div className="h-1.5 w-[90%] bg-[var(--accents-2)] rounded animate-pulse" />
                <p className="text-[10px] text-[var(--text-secondary)] italic">Pending analysis...</p>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
            <FileText size={14} /> Metadata
          </h4>
          <div className="grid grid-cols-2 gap-y-4 text-xs">
            {asset.metadata.width && <MetaItem label="Width" value={`${asset.metadata.width}px`} />}
            {asset.metadata.height && <MetaItem label="Height" value={`${asset.metadata.height}px`} />}
            {asset.metadata.duration && <MetaItem label="Duration" value={`${asset.metadata.duration.toFixed(2)}s`} />}
            {asset.metadata.codec && <MetaItem label="Codec" value={asset.metadata.codec} />}
            {asset.metadata.format && <MetaItem label="Format" value={asset.metadata.format} />}
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
