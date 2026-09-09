import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'

const TopBar = () => {
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        <h1>Issue Tracker</h1>
      </Link>
      <div className="topbar-actions">
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
