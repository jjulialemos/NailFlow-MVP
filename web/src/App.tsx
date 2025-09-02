import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import { useEffect } from 'react'
import { api } from './api'

export default function App() {
  const nav = useNavigate()
  useEffect(()=>{ if (!api.token()) nav('/') },[])
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="h1">NailFlow <span className="text-pink-600">MVP</span></h1>
          <button className="btn" onClick={()=>{ api.logout(); nav('/'); }}>Sair</button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}