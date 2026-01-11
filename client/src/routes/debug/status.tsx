import { createFileRoute } from '@tanstack/react-router'
import useSWR from 'swr'

export const Route = createFileRoute('/debug/status')({
  component: StatusPage,
})

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function StatusPage() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const { data, error, isLoading } = useSWR(`${apiUrl}/status`, fetcher)

  if (error) return <div>failed to load</div>
  if (isLoading) return <div>loading...</div>

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Backend Status</h1>
      <pre className="bg-gray-100 p-4 rounded shadow-md">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
