import { createContext, useContext } from 'react'
import type { Project } from '../api/projects'

export interface ProjectContextType {
    project: Project
    refreshProject: () => Promise<void>
}

export const ProjectContext = createContext<ProjectContextType | null>(null)

export function useProjectContext() {
    const context = useContext(ProjectContext)
    if (!context) {
        throw new Error('useProjectContext must be used within a ProjectLayout')
    }
    return context
}
