import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getProjects, createProject, updateProject, deleteProject, type Project } from '../../api/projects'
import { Plus, LayoutGrid, MoreVertical, Edit2, Trash2 } from 'lucide-react'
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
  
  // Menu state
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  
  // Rename state
  const [projectToRename, setProjectToRename] = useState<Project | null>(null)
  const [renameName, setRenameName] = useState('')

  useEffect(() => {
    if (!user || !token) return

    const fetchProjects = async () => {
      try {
        const data = await getProjects()
        setProjects(data)
      } catch (error) {
        console.error('Failed to fetch projects', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [user, token])

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim() || !token) return

    try {
      const newProject = await createProject(newProjectName.trim())
      setProjects([newProject, ...projects])
      setShowCreateModal(false)
      setNewProjectName('')
    } catch (error) {
      console.error('Failed to create project', error)
    }
  }

  const handleRenameProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectToRename || !renameName.trim() || !token) return

    try {
      const updated = await updateProject(projectToRename.id, renameName.trim())
      setProjects(projects.map(p => p.id === updated.id ? updated : p))
      setProjectToRename(null)
      setRenameName('')
    } catch (error) {
      console.error('Failed to rename project', error)
    }
  }

  const handleDeleteProject = async (id: number) => {
    if (!token || !confirm('Are you sure you want to delete this project?')) return

    try {
      await deleteProject(id)
      setProjects(projects.filter(p => p.id !== id))
    } catch (error) {
      console.error('Failed to delete project', error)
    }
  }

  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'unknown'
    }
  }

  if (loading) return <div className="p-8 text-sm text-text-muted">Loading projects...</div>

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-primary text-primary transition-colors duration-200">
      
      {/* Filters / Header Section */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold tracking-tight">Recents</h2>
        
        <div className="flex items-center gap-4">
           {/* View Toggle Placeholder */}
           <button className="p-1 text-text-muted hover:text-primary transition-colors">
              <LayoutGrid size={20} />
           </button>
           
           <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cta-bg text-cta-text rounded-lg hover:bg-cta-hover transition-opacity text-sm font-medium"
          >
            <Plus size={16} />
            New project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-32 border border-dashed border rounded-xl">
          <p className="text-text-secondary font-medium">No projects yet</p>
          <button 
             onClick={() => setShowCreateModal(true)}
             className="mt-4 text-sm text-accent-primary hover:underline"
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group flex flex-col gap-2 relative"
            >
              {/* Thumbnail */}
              <Link 
                to="/projects/$projectId" 
                params={{ projectId: String(project.id) }}
                className="aspect-[16/10] bg-secondary border border-transparent group-hover:border rounded-lg transition-all overflow-hidden relative"
              >
                 {/* Placeholder Content */}
                 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5">
                    <span className="text-xs font-medium px-3 py-1 bg-elevated rounded-full shadow-sm">Open</span>
                 </div>
              </Link>
              
              {/* Info */}
              <div className="px-1 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <Link 
                    to="/projects/$projectId" 
                    params={{ projectId: String(project.id) }}
                    className="font-semibold text-sm truncate block leading-tight hover:text-accent-primary transition-colors"
                  >
                    {project.name}
                  </Link>
                   <p className="text-[11px] text-text-muted mt-1 font-medium">
                    Edited {formatRelativeTime(project.updated_at)}
                  </p>
                </div>
                
                {/* Menu Trigger */}
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuOpenId(menuOpenId === project.id ? null : project.id)
                    }}
                    className="p-1 text-text-muted hover:text-primary rounded-md hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpenId === project.id && (
                    <div 
                      className="absolute right-0 top-full mt-1 w-32 bg-elevated border border rounded-lg shadow-xl z-10 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setProjectToRename(project)
                          setRenameName(project.name)
                          setMenuOpenId(null)
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-secondary transition-colors"
                      >
                        <Edit2 size={12} />
                        Rename
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpenId(null)
                          handleDeleteProject(project.id)
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 text-error hover:bg-error-bg transition-colors"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      {projectToRename && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-elevated border border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-4">Rename Project</h2>
            <form onSubmit={handleRenameProject}>
              <div className="mb-6">
                <label htmlFor="renameProjectName" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                  Name
                </label>
                <input
                  id="renameProjectName"
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary transition-all text-sm"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProjectToRename(null)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameName.trim() || renameName === projectToRename.name}
                  className="px-4 py-2 bg-cta-bg text-cta-text rounded-lg text-sm font-bold hover:bg-cta-hover transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-elevated border border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-4">Create Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-6">
                <label htmlFor="projectName" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                  Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary transition-all text-sm"
                  placeholder="Untitled"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 bg-cta-bg text-cta-text rounded-lg text-sm font-bold hover:bg-cta-hover transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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