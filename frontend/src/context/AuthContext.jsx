import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bda_user')) || null
    } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('bda_token') || null)
  const [loading, setLoading] = useState(true)

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return }
      try {
        const res = await authAPI.profile()
        setUser(res.data.user)
        localStorage.setItem('bda_user', JSON.stringify(res.data.user))
      } catch {
        logout()
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, []) // eslint-disable-line

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { token: t, user: u } = res.data
    localStorage.setItem('bda_token', t)
    localStorage.setItem('bda_user', JSON.stringify(u))
    setToken(t)
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (username, email, password) => {
    const res = await authAPI.register({ username, email, password })
    const { token: t, user: u } = res.data
    localStorage.setItem('bda_token', t)
    localStorage.setItem('bda_user', JSON.stringify(u))
    setToken(t)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('bda_token')
    localStorage.removeItem('bda_user')
    setToken(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((updated) => {
    setUser(updated)
    localStorage.setItem('bda_user', JSON.stringify(updated))
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
