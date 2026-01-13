import { Link, useLocation, useRouter } from '@tanstack/react-router'
import { Sun, Moon, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useState, useRef, useEffect } from 'react'

export default function Header() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const router = useRouter()
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isProjectsPage = location.pathname.startsWith('/projects') || location.pathname.startsWith('/media-bin')

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProjectMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-primary text-primary transition-colors duration-200 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Link to="/" className="text-lg font-bold tracking-tight hover:opacity-70 transition-opacity">
          autoray
        </Link>
        
        {isProjectsPage && (
          <>
            <span className="text-text-muted">/</span>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                className="flex items-center gap-1 font-medium hover:opacity-70 transition-opacity"
              >
                {location.pathname.startsWith('/media-bin') ? 'Global Media Bin' : 'Projects'}
                <ChevronDown size={14} />
              </button>

              {isProjectMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-elevated border border rounded-md shadow-lg py-1 z-50">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                    onClick={() => {
                      router.navigate({ to: '/projects' })
                      setIsProjectMenuOpen(false)
                    }}
                  >
                    Projects
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                    onClick={() => {
                      router.navigate({ to: '/media-bin' })
                      setIsProjectMenuOpen(false)
                    }}
                  >
                    Global Media Bin
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-1 hover:bg-secondary hover:text-primary rounded-md transition-colors border border-transparent hover:border"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium hidden sm:block">{user.name}</span>
            <button
              onClick={logout}
              className="p-1 hover:bg-secondary hover:text-primary rounded-md transition-colors border border-transparent hover:border"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link
            to="/auth/login"
            className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center gap-2"
          >
            <span>Login</span>
          </Link>
        )}
      </div>
    </header>
  )
}
