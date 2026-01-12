import { apiClient } from './client'
import { type MediaResponse } from './media'

export interface Project {
  id: number
  name: string
  owner_id: number
  created_at: string
  updated_at: string
  medias: MediaResponse[]
}

export interface ProjectMedia {
    project_id: number
    media_id: number
    is_unused: boolean
    created_at: string
    media: MediaResponse
}

export async function getProjects(): Promise<Project[]> {
  return apiClient.get('projects').json()
}

export async function getProject(id: string): Promise<Project> {
    return apiClient.get(`projects/${id}`).json()
}

export async function createProject(name: string): Promise<Project> {
  return apiClient.post('projects', {
    json: { name },
  }).json()
}

export async function updateProject(id: number, name: string): Promise<Project> {
  return apiClient.put(`projects/${id}`, {
    json: { name },
  }).json()
}

export async function deleteProject(id: number): Promise<void> {
  return apiClient.delete(`projects/${id}`).json()
}

export async function getProjectMedia(projectId: string): Promise<ProjectMedia[]> {
    return apiClient.get(`projects/${projectId}/media`).json()
}

export async function addMediaToProject(projectId: string, mediaId: number): Promise<ProjectMedia> {
    return apiClient.post(`projects/${projectId}/media/${mediaId}`).json()
}

export async function updateProjectMedia(projectId: string, mediaId: number, isUnused: boolean): Promise<ProjectMedia> {
    return apiClient.patch(`projects/${projectId}/media/${mediaId}`, {
        json: { is_unused: isUnused }
    }).json()
}