import { createFileRoute } from '@tanstack/react-router'
import { Download } from 'lucide-react'

export const Route = createFileRoute('/projects/$projectId/export')({
  component: ExportRoute,
})

function ExportRoute() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] border-dashed">
        <Download size={48} className="text-[var(--text-secondary)] opacity-20 mb-4" />
        <h2 className="text-xl font-bold mb-2">Export Placeholder</h2>
        <p className="text-[var(--text-secondary)]">Render and download your final video.</p>
      </div>
    </div>
  )
}
