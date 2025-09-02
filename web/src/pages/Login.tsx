import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Login(){
  const [email,setEmail] = useState('demo@nailflow.app')
  const [password,setPassword] = useState('123456')
  const [name,setName] = useState('')
  const [mode,setMode] = useState<'login'|'register'>('login')
  const [err,setErr] = useState('')
  const nav = useNavigate()

  async function submit(e:any){
    e.preventDefault()
    setErr('')
    try {
      const body:any = { email, password }
      if (mode==='register') body.name = name || email.split('@')[0]
      const data = await api.req(`/auth/${mode}`, { method:'POST', body: JSON.stringify(body) })
      api.setToken(data.token); localStorage.setItem('user', JSON.stringify(data.user))
      nav('/app')
    } catch (e:any) { setErr(e?.error || 'Erro') }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-pink-50 to-white p-4">
      <form onSubmit={submit} className="card max-w-md w-full space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold">💅 NailFlow</div>
          <div className="text-sm text-neutral-500">Agenda inteligente para Nail Designers</div>
        </div>
        {mode==='register' && (
          <div>
            <label className="text-sm">Seu nome</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" />
          </div>
        )}
        <div>
          <label className="text-sm">E-mail</label>
          <input
            className="input"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="Seu e-mail"
            title="Digite seu e-mail"
          />
        </div>
        <div>
          <label className="text-sm">Senha</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="Sua senha"
            title="Digite sua senha"
          />
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="btn w-full">{mode==='login'?'Entrar':'Criar conta'}</button>
        <div className="text-sm text-center">
          {mode==='login'
            ? <span>Sem conta? <button type="button" className="link" onClick={()=>setMode('register')}>Cadastre-se</button></span>
            : <span>Já tem conta? <button type="button" className="link" onClick={()=>setMode('login')}>Entrar</button></span>}
        </div>
        <div className="text-xs text-neutral-500 text-center">Login demo: demo@nailflow.app / 123456</div>
      </form>
    </div>
  )
}