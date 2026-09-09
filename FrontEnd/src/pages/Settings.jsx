import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import TopBar from '../components/TopBar'
import { useToast } from '../context/useToast'

const Settings = () => {
  const { showToast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const username = localStorage.getItem('username')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await api.patch('/auth/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      showToast('Password updated', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <TopBar />
      <div className="container">
        <Link to="/" className="btn-link" style={{ display: 'inline-block', marginBottom: '1rem' }}>
          ← Back to dashboard
        </Link>

        <section className="panel" style={{ maxWidth: '420px' }}>
          <h2>Account</h2>
          <p className="hint" style={{ textAlign: 'left', marginTop: 0 }}>
            Signed in as <strong>{username}</strong>
          </p>

          <h2 style={{ marginTop: '1.5rem' }}>Change password</h2>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="current_password">Current password</label>
              <input
                id="current_password"
                type="password"
                className="input"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="new_password">New password</label>
              <input
                id="new_password"
                type="password"
                className="input"
                autoComplete="new-password"
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="confirm_password">Confirm new password</label>
              <input
                id="confirm_password"
                type="password"
                className="input"
                autoComplete="new-password"
                minLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '0.5rem' }}>
              {submitting ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

export default Settings
