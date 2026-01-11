import { Link } from '@tanstack/react-router'
import { Sun, Moon, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Header() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-black dark:border-white bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-lg font-bold tracking-tight hover:opacity-70 transition-opacity">
          autoray
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-md transition-colors border border-transparent hover:border-black dark:hover:border-white"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium hidden sm:block">{user.name}</span>
            <button
              onClick={logout}
              className="p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-md transition-colors border border-transparent hover:border-black dark:hover:border-white"
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
