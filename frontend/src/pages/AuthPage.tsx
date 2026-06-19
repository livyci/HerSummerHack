import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export default function AuthPage() {
  const navigate = useNavigate()
  const register = useAppStore((s) => s.register)
  const login = useAppStore((s) => s.login)
  const authError = useAppStore((s) => s.authError)

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    const ok =
      mode === 'login'
        ? await login(username, password)
        : await register(username, password)
    setSubmitting(false)
    if (ok) navigate('/')
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-bg">
        <h1 className="text-xl font-bold text-gray-900">
          {mode === 'login' ? 'Log in' : 'Create an account'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === 'login'
            ? 'Log in to track what you already own.'
            : 'Sign up so we never suggest gear you already have.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <input
            type="text"
            autoComplete="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-forest focus:outline-none"
          />
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-forest focus:outline-none"
          />

          {authError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? 'Please wait…'
              : mode === 'login'
                ? 'Log in'
                : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-4 w-full text-center text-sm font-medium text-forest hover:underline"
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )
}
