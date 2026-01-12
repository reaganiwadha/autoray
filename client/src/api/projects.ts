import ky from 'ky'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface Project {
  id: number
  name: string
  owner_id: number
  created_at: string
  updated_at: string
}

export async function getProjects(token: string): Promise<Project[]> {
  return ky.get(`${apiUrl}/projects`, {
    headers: { Authorization: token },
  }).json()
}

export async function createProject(token: string, name: string): Promise<Project> {
  return ky.post(`${apiUrl}/projects`, {
    headers: { Authorization: token },
    json: { name },
  }).json()
}

export async function updateProject(token: string, id: number, name: string): Promise<Project> {
  return ky.put(`${apiUrl}/projects/${id}`, {
    headers: { Authorization: token },
    json: { name },
  }).json()
}

export async function deleteProject(token: string, id: number): Promise<void> {
  return ky.delete(`${apiUrl}/projects/${id}`, {
    headers: { Authorization: token },
  }).json()
}
