import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { uploadMedia, type MediaResponse } from '../../api/media'
import { Upload, X, FileIcon, AlertCircle, CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/debug/upload')({
  component: DebugUpload,
})

interface UploadStatus {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  response?: MediaResponse
}

function DebugUpload() {
  const [uploads, setUploads] = useState<UploadStatus[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({
        file,
        status: 'pending' as const
      }))
      setUploads(prev => [...prev, ...newFiles])
    }
    // Reset input so the same files can be selected again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = ''
    }
  }

  const handleUploadAll = async () => {
    const pendingUploads = uploads.map((u, index) => ({ ...u, index })).filter(u => u.status === 'pending' || u.status === 'error')
    
    for (const item of pendingUploads) {
      updateUploadStatus(item.index, 'uploading')
      try {
        const response = await uploadMedia(item.file)
        updateUploadStatus(item.index, 'success', undefined, response)
      } catch (err) {
        updateUploadStatus(item.index, 'error', err instanceof Error ? err.message : 'Upload failed')
      }
    }
  }

  const updateUploadStatus = (index: number, status: UploadStatus['status'], error?: string, response?: MediaResponse) => {
    setUploads(prev => {
      const newUploads = [...prev]
      newUploads[index] = { ...newUploads[index], status, error, response }
      return newUploads
    })
  }

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index))
  }

  const clearCompleted = () => {
    setUploads(prev => prev.filter(u => u.status !== 'success'))
  }

  return (
    <div className="pt-20 px-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Media Upload</h1>
      
      <div className="space-y-6">
        {/* Upload Area */}
        <div 
            className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-12 flex flex-col items-center justify-center bg-[var(--bg-secondary)] hover:bg-opacity-80 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
        >
            <Upload size={48} className="text-[var(--text-secondary)] mb-4" />
            <p className="text-lg font-medium mb-2">Click to select files</p>
            <p className="text-sm text-[var(--text-secondary)]">Supports Images, Videos, etc.</p>
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden" 
                multiple 
            />
        </div>

        {/* Actions */}
        {uploads.length > 0 && (
            <div className="flex gap-4">
                <button 
                    onClick={handleUploadAll}
                    className="bg-white text-black dark:bg-white dark:text-black px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                    Upload {uploads.filter(u => u.status === 'pending').length > 0 ? 'All' : 'Retry Failed'}
                </button>
                <button 
                    onClick={clearCompleted}
                    className="px-6 py-2 rounded-lg font-medium border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                    Clear Completed
                </button>
            </div>
        )}

        {/* File List */}
        <div className="space-y-3">
            {uploads.map((upload, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                    <div className="p-2 rounded bg-black/5 dark:bg-white/10">
                        <FileIcon size={24} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{upload.file.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                            {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        {upload.status === 'uploading' && <span className="text-blue-500 animate-pulse">Uploading...</span>}
                        {upload.status === 'success' && <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={16}/> Done</span>}
                        {upload.status === 'error' && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={16}/> Error</span>}
                        
                        <button onClick={() => removeUpload(index)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded">
                            <X size={16} />
                        </button>
                    </div>
                    
                    {upload.error && (
                        <div className="w-full text-sm text-red-500 mt-2 basis-full">
                            {upload.error}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>
    </div>
  )
}
