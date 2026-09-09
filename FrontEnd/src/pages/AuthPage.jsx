import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import GitHubLink from '../components/GitHubLink'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'

const AuthPage = () => {
  const { isLoggedIn, login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isLoggedIn) return <Navigate to="/" replace />

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const username = event.target.username.value
    const password = event.target.password.value

    try {
      await login(username, password, { isSignup: mode === 'signup' })
      showToast(mode === 'signup' ? `Welcome, ${username}!` : 'Welcome back!', 'success')
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Issue Tracker</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Log in to see your issues' : 'Create an account to get started'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="input"
              name="username"
              type="text"
              placeholder="Enter username"
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              name="password"
              type="password"
              placeholder="Enter password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={4}
              required
            />
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '1.25rem' }} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
        </div>

        <div className="auth-footer">
          <GitHubLink />
        </div>
      </div>
    </div>
  )
}

export default AuthPage
