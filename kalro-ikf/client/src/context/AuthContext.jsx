import { createContext, useContext, useState } from 'react'
import api from '../api/axios'
const AuthContext = createContext(null)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }
  const isAdmin = user?.role === 'super_admin'
  const isAnalyst = user?.role === 'analyst' || user?.role === 'super_admin'
  return <AuthContext.Provider value={{ user, login, logout, isAdmin, isAnalyst }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
