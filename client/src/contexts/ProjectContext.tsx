import { createContext, useContext } from 'react'
import type { Project, ProjectMedia } from '../api/projects'

export interface ProjectContextType {
    project: Project
    projectMedia: ProjectMedia[]
    setProjectMedia: React.Dispatch<React.SetStateAction<ProjectMedia[]>>
    s3BaseUrl: string
}

export const ProjectContext = createContext<ProjectContextType | null>(null)

export function useProjectContext() {
    const context = useContext(ProjectContext)
    if (!context) {
        throw new Error('useProjectContext must be used within a ProjectLayout')
    }
    return context
}
