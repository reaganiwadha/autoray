import ky from 'ky'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient = ky.create({
  prefixUrl: apiUrl,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = localStorage.getItem('token')
        if (token) {
          request.headers.set('Authorization', token)
        }
      },
    ],
  },
})
