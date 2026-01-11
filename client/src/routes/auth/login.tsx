import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'

export const Route = createFileRoute('/auth/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await login(email, password)
      router.navigate({ to: '/' })
    } catch (err) {
      setError('Invalid email or password')
    }
  }

  return (
    <main style={{ minHeight: '100vh', paddingTop: '5rem', padding: '5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem', textAlign: 'center' }}>Login</h1>
        
        {error && (
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem', fontSize: '0.875rem', borderRadius: '0.5rem', textAlign: 'center', backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email"
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 500, transition: 'opacity 0.2s', backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
            className="hover-opacity"
          >
            Login
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/auth/register" style={{ fontWeight: 500 }}>
            Register
          </Link>
        </p>
      </div>
    </main>
  )
}