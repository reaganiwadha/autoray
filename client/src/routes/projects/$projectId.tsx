import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { getProject, type Project } from '../../api/projects'
import { useSocket, type SocketEvent } from '../../contexts/SocketContext'
import { ProjectContext } from '../../contexts/ProjectContext'
import {
    LayoutGrid,
    Clock,
    Download,
    Loader2
} from 'lucide-react'

export const Route = createFileRoute('/projects/$projectId')({
  component: ProjectLayout,
})

function ProjectLayout() {
  const { projectId } = Route.useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshProject = useCallback(async () => {
    try {
      const data = await getProject(projectId)
      setProject(data)
    } catch (err) {
      console.error('Failed to refresh project', err)
    }
  }, [projectId])

  useSocket((event: SocketEvent) => {
    if (event.type === 'JOB_COMPLETED' && String(event.project_id) === projectId) {
      refreshProject()
    }
  })

  useEffect(() => {
    setIsLoading(true)
    refreshProject().finally(() => setIsLoading(false))
  }, [projectId, refreshProject])

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>
  if (!project) return <div className="p-20 text-center">Project not found</div>

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[var(--bg-primary)]">

      {/* Sub Header / Tabs */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-6">
          <h1 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">{project.name}</h1>
          <nav className="flex gap-4">
            <TabLink to={`/projects/${projectId}/bin`} icon={<LayoutGrid size={16}/>} label="Media Bin" />
            <TabLink to={`/projects/${projectId}/timeline`} icon={<Clock size={16}/>} label="Timeline" />
            <TabLink to={`/projects/${projectId}/export`} icon={<Download size={16}/>} label="Export" />
          </nav>
        </div>
      </div>

      <ProjectContext.Provider value={{ project, refreshProject }}>
        <Outlet />
      </ProjectContext.Provider>
    </div>
  )
}

function TabLink({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
      activeProps={{
        className: 'bg-white text-black dark:bg-white dark:text-black hover:bg-white hover:text-black'
      }}
    >
      {icon}
      {label}
    </Link>
  )
}
