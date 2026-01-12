import { apiClient } from './client'

export interface Project {
  id: number
  name: string
  owner_id: number
  created_at: string
  updated_at: string
}

export async function getProjects(): Promise<Project[]> {
  return apiClient.get('projects').json()
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