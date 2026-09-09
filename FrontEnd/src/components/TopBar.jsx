import React from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'
import { useToast } from '../context/useToast'

const TopBar = () => {
  const { logout, isAdmin, setAdminFromToken } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()

  const handleToggleAdmin = async () => {
    try {
      const response = await api.post('/auth/toggle-admin-demo')
      setAdminFromToken(response.data.access_token)
      showToast(
        response.data.is_admin ? 'Admin mode on — you can now delete protected issues.' : 'Admin mode off.',
        'success'
      )
    } catch (error) {
      console.error('Error toggling admin demo mode:', error.response?.data || error.message)
      showToast('Could not toggle admin mode', 'error')
    }
  }

  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        <h1>Issue Tracker</h1>
      </Link>
      <div className="topbar-actions">
        <button
          className={`btn btn-sm ${isAdmin ? 'btn-primary' : 'btn-outline'}`}
          onClick={handleToggleAdmin}
          title="Demo only: toggles your account's admin flag so you can try admin-only actions"
        >
          {isAdmin ? '🛡️ Admin mode: On' : 'Demo: Become Admin'}
        </button>
        <Link to="/stats" className="btn btn-outline btn-sm">
          Stats
        </Link>
        <button className="btn btn-outline btn-sm" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  )
}

export default TopBar
