import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Agenda(){
  const [clients,setClients] = useState<any[]>([])
  const [services,setServices] = useState<any[]>([])
  const [list,setList] = useState<any[]>([])
  const [form,setForm] = useState<any>({
    date:'', start:'', duration:60, client_id:'', service_id:'', price:0, paid:false, notes:''
  })
  const [suggestions,setSuggestions] = useState<any[]>([])
  const [msg,setMsg] = useState('')

  useEffect(()=>{
    refresh()
    api.req('/clients').then(setClients)
    api.req('/services').then(setServices).catch(()=>{})
  },[])

  function refresh(){ api.req('/appointments').then(setList) }

  function addMinutes(start:string, dur:number){
    const [h,m]=start.split(':').map(Number)
    const total=h*60+m+Number(dur||0)
    const hh=String(Math.floor(total/60)).padStart(2,'0')
    const mm=String(total%60).padStart(2,'0')
    return `${hh}:${mm}`
  }

  function onSelectService(id:string){
    const svc = services.find((s:any)=> String(s.id)===String(id))
    if (!svc) return setForm({ ...form, service_id:id })
    setForm({ ...form, service_id:id, price: svc.price, duration: svc.duration_minutes })
  }

  async function add(e:any){
    e.preventDefault(); setMsg('')
    const end = addMinutes(form.start, form.duration)
    try {
      const body = {
        client_id:+form.client_id, date:form.date, start:form.start, end,
        service_id: form.service_id? +form.service_id : undefined,
        price:+form.price, paid:!!form.paid, notes: form.notes
      }
      await api.req('/appointments', { method:'POST', body: JSON.stringify(body) })
      setForm({ date:'', start:'', duration:60, client_id:'', service_id:'', price:0, paid:false, notes:'' })
      setSuggestions([]); refresh(); setMsg('Atendimento adicionado!')
    } catch (e:any) { setMsg('Erro: ' + (e?.error||'')) }
  }

  async function getSuggestions(){
    setSuggestions([])
    if (!form.client_id) return
    const dur = form.duration || 60
    try {
      const s = await api.req(`/appointments/suggest?clientId=${form.client_id}&durationMinutes=${dur}`, { method:'POST' })
      setSuggestions(s)
    } catch {}
  }

  async function togglePaid(a:any){
    await api.req('/appointments/'+a.id, { method:'PUT', body: JSON.stringify({ paid: a.paid?0:1 }) })
    refresh()
  }
  async function remove(id:number){ await api.req('/appointments/'+id,{ method:'DELETE' }); refresh() }
  const clientName = (id:number)=> clients.find(c=>c.id===id)?.name || '—'

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card">
        <div className="h2">Novo atendimento</div>
        <form onSubmit={add} className="grid grid-cols-2 gap-3 mt-3">
          <div className="col-span-2">
            <label className="text-sm">Cliente</label>
            <select
              className="input"
              value={form.client_id}
              onChange={e=>{
                const id = e.target.value
                setForm({...form, client_id:id})
                const c = clients.find((x:any)=> String(x.id)===String(id))
                if (c?.default_service_id) onSelectService(String(c.default_service_id))
              }}
            >
              <option value="">Selecione...</option>
              {clients.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="text-sm">Procedimento</label>
            <select className="input" value={form.service_id} onChange={e=>onSelectService(e.target.value)}>
              <option value="">Selecione...</option>
              {services.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="text-xs text-neutral-500 mt-1">Duração e preço ajustam automaticamente.</div>
          </div>

          <div>
            <label className="text-sm">Data</label>
            <input type="date" className="input" value={form.date} onChange={e=>setForm({...form, date:e.target.value})} />
          </div>
          <div>
            <label className="text-sm">Início</label>
            <input type="time" className="input" value={form.start} onChange={e=>setForm({...form, start:e.target.value})} />
          </div>
          <div>
            <label className="text-sm">Duração (min)</label>
            <input type="number" className="input" value={form.duration} onChange={e=>setForm({...form, duration:e.target.value})} />
          </div>
          <div>
            <label className="text-sm">Preço (R$)</label>
            <input type="number" className="input" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} />
          </div>

          <div className="col-span-2">
            <label className="text-sm">Observações</label>
            <input className="input" placeholder="Ex.: alergias, preferências..." value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} />
          </div>

          <div className="col-span-2">
            <button type="button" className="btn" onClick={getSuggestions}>Ver sugestões</button>
          </div>
          {suggestions.length>0 && (
            <div className="col-span-2">
              <div className="text-sm text-neutral-600 mb-1">Sugestões (próximos dias)</div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s,i)=>(
                  <button key={i} type="button" className="px-3 py-2 rounded-xl border hover:bg-pink-50"
                    onClick={()=>setForm({...form, date:s.date, start:s.start})}>
                    {s.date} • {s.start}-{s.end}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input id="paid" type="checkbox" checked={!!form.paid} onChange={e=>setForm({...form, paid:e.target.checked})} />
            <label htmlFor="paid" className="text-sm">Pago</label>
          </div>

          <div className="col-span-2">
            <button className="btn">Salvar</button>
          </div>
          {msg && <div className="col-span-2 text-sm">{msg}</div>}
        </form>
      </div>

      <div className="card">
        <div className="h2">Próximos atendimentos</div>
        <table className="mt-3">
          <thead><tr><th>Data</th><th>Horário</th><th>Cliente</th><th>Procedimento</th><th>R$</th><th>Pago</th><th></th></tr></thead>
          <tbody>
            {list.map(a=>(
              <tr key={a.id}>
                <td>{a.date}</td>
                <td>{a.start}–{a.end}</td>
                <td>{clientName(a.client_id)}</td>
                <td>{a.service||'—'}</td>
                <td>R$ {(a.price||0).toFixed(2)}</td>
                <td>
                  <button className="px-2 py-1 rounded border" onClick={()=>togglePaid(a)}>
                    {a.paid ? '✓' : '—'}
                  </button>
                </td>
                <td><button className="px-2 py-1 rounded border" onClick={()=>remove(a.id)}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}