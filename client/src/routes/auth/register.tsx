import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'

export const Route = createFileRoute('/auth/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await register(name, email, password)
      router.navigate({ to: '/auth/login' })
    } catch (err) {
      setError('Registration failed. Email may already be registered.')
    }
  }

  return (
    <main style={{ minHeight: '100vh', paddingTop: '5rem', padding: '5rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '2rem', textAlign: 'center' }}>Register</h1>
        
        {error && (
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem', fontSize: '0.875rem', borderRadius: '0.5rem', textAlign: 'center', backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Name"
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
          </div>

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
            Register
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/auth/login" style={{ fontWeight: 500 }}>
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}