import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] px-4 bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      <main className="max-w-2xl w-full text-center space-y-8">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter">
          autoray
        </h1>
        <p className="text-lg font-medium leading-relaxed">
          Minimalist AI Interface.
        </p>
        
        <div className="flex justify-center gap-4 pt-4">
          <button className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-sm hover:opacity-80 transition-opacity border border-black dark:border-white">
            Get Started
          </button>
          <button className="px-6 py-2 border border-black dark:border-white rounded-full font-medium text-sm hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">
            Documentation
          </button>
        </div>
      </main>
    </div>
  )
}
