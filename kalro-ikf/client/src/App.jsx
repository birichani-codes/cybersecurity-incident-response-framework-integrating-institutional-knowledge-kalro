import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Incidents from './pages/Incidents'
import IncidentDetail from './pages/IncidentDetail'
import Knowledge from './pages/Knowledge'
import KnowledgeDetail from './pages/KnowledgeDetail'
import Search from './pages/Search'
import Reports from './pages/Reports'
import Users from './pages/Users'
import PIRDetail from './pages/PIRDetail'

const Guard = ({ children, adminOnly=false }) => {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace/>
  if (adminOnly && !isAdmin) return <Navigate to="/" replace/>
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/" element={<Guard><Layout/></Guard>}>
            <Route index element={<Dashboard/>}/>
            <Route path="incidents" element={<Incidents/>}/>
            <Route path="incidents/:id" element={<IncidentDetail/>}/>
            <Route path="incidents/:id/pir" element={<PIRDetail/>}/>
            <Route path="knowledge" element={<Knowledge/>}/>
            <Route path="knowledge/:id" element={<KnowledgeDetail/>}/>
            <Route path="search" element={<Search/>}/>
            <Route path="reports" element={<Guard adminOnly><Reports/></Guard>}/>
            <Route path="users" element={<Guard adminOnly><Users/></Guard>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
