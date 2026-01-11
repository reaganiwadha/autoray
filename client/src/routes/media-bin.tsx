import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/media-bin')({
  component: MediaBinPage,
})

function MediaBinPage() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Global Media Bin</h1>
      <p className="text-gray-500">All your media assets in one place.</p>
    </div>
  )
}
