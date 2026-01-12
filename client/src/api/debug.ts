import { apiClient } from './client'

export interface MediaResponse {
  id: number
  filename: string
  content_type: string
  size: number
  s3_key: string
  created_at: string
}

export async function debugUploadRandomFile(): Promise<MediaResponse> {
  return apiClient.post('debug/upload').json()
}
