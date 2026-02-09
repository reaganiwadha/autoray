import { apiClient } from './client'

export interface Asset {
  id: string
  storage_key: string
  asset_type: string  // "IMAGE" | "VIDEO" | "AUDIO"
  metadata: {
    width?: number
    height?: number
    duration?: number
    codec?: string
    format?: string
    thumbnails?: Record<string, string>  // {small: "presigned_url", large: "presigned_url", gif: "presigned_url"}
    [key: string]: any
  }
  analyses: Array<{ analyzer_name: string; content: any }>
}

export interface JobSummary {
  id: string
  status: string  // PENDING | RUNNING | COMPLETED | FAILED
  instruction: string
  author: string
  created_at: string
  job_type: string
}

export interface ChatMessage {
  role: string
  content: string
  author: string
  timestamp: string
}

export interface Project {
  id: number
  name: string
  owner_id: number
  created_at: string
  updated_at: string
  assets: Asset[]
  jobs: JobSummary[]
  chat_history: ChatMessage[]
  system_prompt: string | null
  timeline: any | null
}

export async function getProjects(): Promise<Project[]> {
  return apiClient.get('projects').json()
}

export async function getProject(id: string): Promise<Project> {
  return apiClient.get(`projects/${id}`).json()
}

export async function createProject(name: string): Promise<Project> {
  return apiClient.post('projects', { json: { name } }).json()
}

export async function updateProject(id: number, name: string): Promise<Project> {
  return apiClient.put(`projects/${id}`, { json: { name } }).json()
}

export async function deleteProject(id: number): Promise<void> {
  return apiClient.delete(`projects/${id}`).json()
}

export async function uploadAsset(projectId: string, file: File): Promise<Asset> {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post(`projects/${projectId}/assets/upload`, {
    body: formData,
    timeout: false,
  }).json()
}

export async function deleteAsset(projectId: string, assetId: string): Promise<void> {
  await apiClient.delete(`projects/${projectId}/assets/${assetId}`)
}

export function submitJob(projectId: string, instruction: string): EventSource {
  const token = localStorage.getItem('token')
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  // EventSource only does GET. For POST we use fetch + ReadableStream, wrapping it in an EventSource-like interface.
  // Actually, we'll use fetch with SSE parsing since EventSource can't POST.
  // Return a custom object that looks like EventSource.
  const es = new FetchEventSource(`${apiUrl}/projects/${projectId}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token || '',
    },
    body: JSON.stringify({ instruction }),
  })
  return es as unknown as EventSource
}

export async function getProjectJobs(projectId: string): Promise<JobSummary[]> {
  return apiClient.get(`projects/${projectId}/jobs`).json()
}

// Minimal fetch-based SSE client for POST requests
export class FetchEventSource {
  private _listeners: Record<string, Array<(event: MessageEvent) => void>> = {}
  private _onerror: ((event: Event) => void) | null = null
  private _controller: AbortController

  constructor(url: string, init: RequestInit) {
    this._controller = new AbortController()
    this._start(url, { ...init, signal: this._controller.signal })
  }

  set onerror(fn: ((event: Event) => void) | null) {
    this._onerror = fn
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this._listeners[type]) this._listeners[type] = []
    this._listeners[type].push(listener)
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this._listeners[type]) return
    this._listeners[type] = this._listeners[type].filter(l => l !== listener)
  }

  close() {
    this._controller.abort()
  }

  private async _start(url: string, init: RequestInit) {
    try {
      const response = await fetch(url, init)
      if (!response.ok || !response.body) {
        this._onerror?.(new Event('error'))
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          const lines = part.split('\n')
          let eventType = 'message'
          let data = ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7)
            } else if (line.startsWith('data: ')) {
              data = line.slice(6)
            }
          }

          const messageEvent = new MessageEvent(eventType, { data })
          const listeners = this._listeners[eventType] || []
          for (const listener of listeners) {
            listener(messageEvent)
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        this._onerror?.(new Event('error'))
      }
    }
  }
}
