import React, { useState } from 'react'
import api from '../api'
import { AuthContext } from './authContextObject'

// Decodes the JWT payload to read is_admin for UI purposes only (e.g.
// showing/hiding a delete button). The real permission check always
// happens server-side, so this is just for a better user experience.
const decodeIsAdmin = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return !!payload.is_admin
  } catch {
    return false
  }
}

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))
  const [isAdmin, setIsAdmin] = useState(() => {
    const token = localStorage.getItem('token')
    return token ? decodeIsAdmin(token) : false
  })

  const login = async (username, password, { isSignup } = {}) => {
    if (isSignup) {
      await api.post('/auth/user', { username, password })
    }

    const response = await api.post('/auth/token', new URLSearchParams({ username, password }))
    localStorage.setItem('token', response.data.access_token)
    localStorage.setItem('user_id', response.data.user_id)
    localStorage.setItem('username', username)
    setIsAdmin(decodeIsAdmin(response.data.access_token))
    setIsLoggedIn(true)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('username')
    setIsAdmin(false)
    setIsLoggedIn(false)
  }

  // Used by the demo "Become Admin" toggle: the backend returns a fresh
  // token with an updated is_admin claim, and we swap it in.
  const setAdminFromToken = (token) => {
    localStorage.setItem('token', token)
    setIsAdmin(decodeIsAdmin(token))
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, isAdmin, login, logout, setAdminFromToken }}>
      {children}
    </AuthContext.Provider>
  )
}
