import { apiClient } from './client'

export interface ThumbnailResponse {
  id: number
  filename: string
  content_type: string
  size: number
  s3_key: string
  width: number | null
  height: number | null
  type: string
  created_at: string
}

export interface MediaResponse {
  id: number
  filename: string
  content_type: string
  size: number
  s3_key: string
  created_at: string
  binary_metadata?: any
  thumbnails: ThumbnailResponse[]
}

export async function uploadMedia(file: File): Promise<MediaResponse> {
  const formData = new FormData()
  formData.append('file', file)

  return apiClient.post('media/upload', {
    body: formData,
    timeout: false,
  }).json()
}

export async function getMedia(): Promise<MediaResponse[]> {
  return apiClient.get('media').json()
}

export async function deleteMedia(mediaId: number): Promise<void> {
  await apiClient.delete(`media/${mediaId}`)
}
