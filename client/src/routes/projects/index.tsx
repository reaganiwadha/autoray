import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getProjects, createProject, type Project } from '../../api/projects'
import { Plus, LayoutGrid } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
})

function ProjectsPage() {
  const { user, token } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  useEffect(() => {
    if (!user || !token) return

    const fetchProjects = async () => {
      try {
        const data = await getProjects(token)
        setProjects(data)
      } catch (error) {
        console.error('Failed to fetch projects', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [user, token])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim() || !token) return

    try {
      const newProject = await createProject(token, newProjectName.trim())
      setProjects([newProject, ...projects])
      setShowCreateModal(false)
      setNewProjectName('')
    } catch (error) {
      console.error('Failed to create project', error)
    }
  }

  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'unknown'
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading projects...</div>

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      
      {/* Filters / Header Section */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold tracking-tight">Recents</h2>
        
        <div className="flex items-center gap-4">
           {/* View Toggle Placeholder */}
           <button className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              <LayoutGrid size={20} />
           </button>
           
           <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-80 transition-opacity text-sm font-medium"
          >
            <Plus size={16} />
            New project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-32 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400 font-medium">No projects yet</p>
          <button 
             onClick={() => setShowCreateModal(true)}
             className="mt-4 text-sm text-blue-500 hover:underline"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group flex flex-col gap-2 cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="aspect-[16/10] bg-gray-100 dark:bg-[#111] border border-transparent group-hover:border-gray-300 dark:group-hover:border-gray-700 rounded-lg transition-all overflow-hidden relative">
                 {/* Placeholder Content */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 dark:bg-white/5">
                    <span className="text-xs font-medium px-3 py-1 bg-white dark:bg-black rounded-full shadow-sm">Open</span>
                 </div>
              </div>
              
              {/* Info */}
              <div className="px-1">
                <h3 className="font-semibold text-sm truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {project.name}
                </h3>
                 <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1 font-medium">
                  Edited {formatRelativeTime(project.updated_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-4">Create Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-6">
                <label htmlFor="projectName" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all text-sm"
                  placeholder="Untitled"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}