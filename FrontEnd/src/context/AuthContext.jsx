import React, { useState } from 'react'
import api from '../api'
import { AuthContext } from './authContextObject'

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))

  const login = async (username, password, { isSignup } = {}) => {
    if (isSignup) {
      await api.post('/auth/user', { username, password })
    }

    const response = await api.post('/auth/token', new URLSearchParams({ username, password }))
    localStorage.setItem('token', response.data.access_token)
    localStorage.setItem('user_id', response.data.user_id)
    localStorage.setItem('username', username)
    setIsLoggedIn(true)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('username')
    setIsLoggedIn(false)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
