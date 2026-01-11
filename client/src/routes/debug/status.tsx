import { createFileRoute } from '@tanstack/react-router'
import useSWR from 'swr'
import ky from 'ky'

export const Route = createFileRoute('/debug/status')({
  component: StatusPage,
})

const fetcher = (url: string) => ky.get(url).json()

function StatusPage() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const { data, error, isLoading } = useSWR(`${apiUrl}/status`, fetcher)

  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>

  return (
    <main className="pt-20 px-6">
      <h1 className="text-2xl font-semibold mb-6">Backend Status</h1>
      <pre className="p-4 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  )
}
