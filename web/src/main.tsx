import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import App from './App'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Agenda from './pages/Agenda'
import Clientes from './pages/Clientes'
import Financeiro from './pages/Financeiro'
import Relatorios from './pages/Relatorios'
import ConfigAgenda from './pages/ConfigAgenda'
import Servicos from './pages/Servicos'

const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  {
    path: '/app', element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'agenda', element: <Agenda /> },
      { path: 'clientes', element: <Clientes /> },
      { path: 'financeiro', element: <Financeiro /> },
      { path: 'relatorios', element: <Relatorios /> },
      { path: 'servicos', element: <Servicos /> },
      { path: 'config/agenda', element: <ConfigAgenda /> },
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)