import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { uploadMedia, getMedia, type MediaResponse } from '../../api/media'
import { Upload, X, FileIcon, AlertCircle, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/debug/upload')({
  component: DebugUpload,
})

interface UploadStatus {
  file?: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  response?: MediaResponse
}

function DebugUpload() {
  const [uploads, setUploads] = useState<UploadStatus[]>([])
  const [existingMedia, setExistingMedia] = useState<MediaResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const s3BaseUrl = 'http://localhost:9000'

  useEffect(() => {
    loadExistingMedia()
  }, [])

  const loadExistingMedia = async () => {
    try {
      const media = await getMedia()
      setExistingMedia(media)
    } catch (err) {
      console.error('Failed to load media', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({
        file,
        status: 'pending' as const
      }))
      setUploads(prev => [...prev, ...newFiles])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUploadAll = async () => {
    const pending = uploads.filter(u => u.status === 'pending' || u.status === 'error')
    
    for (const item of pending) {
        const index = uploads.indexOf(item)
        updateUploadStatus(index, 'uploading')
        try {
            if (!item.file) throw new Error('No file selected')
            const response = await uploadMedia(item.file)
            setUploads(prev => prev.filter((_, i) => i !== index))
            setExistingMedia(prev => [response, ...prev])
        } catch (err) {
            updateUploadStatus(uploads.indexOf(item), 'error', err instanceof Error ? err.message : 'Upload failed')
        }
    }
  }

  const updateUploadStatus = (index: number, status: UploadStatus['status'], error?: string, response?: MediaResponse) => {
    setUploads(prev => {
      const newUploads = [...prev]
      if (newUploads[index]) {
          newUploads[index] = { ...newUploads[index], status, error, response }
      }
      return newUploads
    })
  }

  const getThumbnailUrl = (media: MediaResponse) => {
      const thumb = media.thumbnails.find(t => t.type === 'small') || media.thumbnails[0]
      if (!thumb) return null
      return `${s3BaseUrl}/thumbnails/${thumb.s3_key}`
  }

  return (
    <div className="pt-20 px-6 max-w-6xl mx-auto pb-20">
      <h1 className="text-2xl font-semibold mb-6">Media Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Upload Section */}
        <div className="md:col-span-1 space-y-6">
            <div 
                className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 flex flex-col items-center justify-center bg-[var(--bg-secondary)] hover:bg-opacity-80 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload size={32} className="text-[var(--text-secondary)] mb-4" />
                <p className="font-medium mb-1">Select Files</p>
                <p className="text-xs text-[var(--text-secondary)] text-center">Images & Videos</p>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
            </div>

            {uploads.length > 0 && (
                <div className="space-y-3">
                    <button onClick={handleUploadAll} className="w-full bg-white text-black py-2 rounded-lg font-medium">
                        Upload {uploads.length} Files
                    </button>
                    {uploads.map((u, i) => (
                        <div key={i} className="text-xs flex items-center justify-between p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded">
                            <span className="truncate flex-1">{u.file?.name}</span>
                            {u.status === 'uploading' ? <Loader2 size={12} className="animate-spin" /> : 
                             u.status === 'error' ? <AlertCircle size={12} className="text-red-500" /> : 
                             <button onClick={() => setUploads(prev => prev.filter((_, idx) => idx !== i))}><X size={12}/></button>}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Right: Media Grid */}
        <div className="md:col-span-2">
            <h2 className="text-lg font-medium mb-4">Your Media Library</h2>
            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {existingMedia.map(media => (
                        <div key={media.id} className="group relative aspect-square bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
                            {getThumbnailUrl(media) ? (
                                <img 
                                    src={getThumbnailUrl(media)!} 
                                    alt={media.filename}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                    <FileIcon className="text-[var(--text-secondary)] mb-2" />
                                    <span className="text-[10px] text-center break-all">{media.filename}</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                <p className="text-[10px] font-medium truncate">{media.filename}</p>
                                {media.binary_metadata && (
                                    <p className="text-[8px] text-gray-300">
                                        {media.binary_metadata.width}x{media.binary_metadata.height}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                    {existingMedia.length === 0 && (
                        <div className="col-span-full py-12 text-center border border-dashed border-[var(--border-color)] rounded-lg text-[var(--text-secondary)]">
                            No media found. Upload something!
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  )
}
