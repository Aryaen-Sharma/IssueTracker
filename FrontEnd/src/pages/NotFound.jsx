import React from 'react'
import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.25rem' }}>404</h1>
        <p className="auth-subtitle">This page doesn't exist.</p>
        <Link to="/" className="btn btn-primary btn-block" style={{ marginTop: '1.25rem', display: 'inline-block' }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFound
