import { apiClient } from './client'

export interface MediaResponse {
  id: number
  filename: string
  content_type: string
  size: number
  s3_key: string
  created_at: string
}

export async function uploadMedia(file: File): Promise<MediaResponse> {
  const formData = new FormData()
  formData.append('file', file)

  return apiClient.post('media/upload', {
    body: formData,
    timeout: false, // Let large uploads take their time
  }).json()
}
