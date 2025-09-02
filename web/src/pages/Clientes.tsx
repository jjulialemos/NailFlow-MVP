import { useEffect, useState } from 'react'
import { api } from '../api'

const DAYS = [
  {k:'mon',label:'Seg'}, {k:'tue',label:'Ter'}, {k:'wed',label:'Qua'},
  {k:'thu',label:'Qui'}, {k:'fri',label:'Sex'}, {k:'sat',label:'Sáb'}, {k:'sun',label:'Dom'},
]
const DAY_PT: Record<string,string> = { mon:'Seg', tue:'Ter', wed:'Qua', thu:'Qui', fri:'Sex', sat:'Sáb', sun:'Dom' }

export default function Clientes(){
  const [list,setList] = useState<any[]>([])
  const [services,setServices] = useState<any[]>([])
  const [form,setForm] = useState<any>({
    name:'', phone:'', notes:'', pref_days:[], pref_start:'', pref_end:'', default_service_id:''
  })
  const [msg,setMsg] = useState('')

  function refresh(){ api.req('/clients').then(setList) }
  useEffect(()=>{ refresh(); api.req('/services').then(setServices).catch(()=>{}) },[])

  function toggleDay(k:string){
    const has = form.pref_days.includes(k)
    setForm({...form, pref_days: has ? form.pref_days.filter((d:string)=>d!==k) : [...form.pref_days, k]})
  }

  async function add(e:any){
    e.preventDefault(); setMsg('')
    try {
      const body = { ...form, default_service_id: form.default_service_id? +form.default_service_id : null }
      await api.req('/clients', { method:'POST', body: JSON.stringify(body) })
      setForm({ name:'', phone:'', notes:'', pref_days:[], pref_start:'', pref_end:'', default_service_id:'' })
      refresh(); setMsg('Cliente cadastrado!')
    } catch (e:any) { setMsg('Erro: ' + (e?.error||'')) }
  }

  async function remove(id:number){
    await api.req('/clients/'+id,{ method:'DELETE' })
    refresh()
  }

  const svcName = (id?:number)=> services.find(s=>s.id===id)?.name

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Formulário */}
      <div className="card">
        <div className="h2">Novo cliente</div>
        <form onSubmit={add} className="grid grid-cols-2 gap-3 mt-3">
          <div className="col-span-2">
            <label className="text-sm">Nome*</label>
            <input className="input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
          </div>
          <div>
            <label className="text-sm">Telefone</label>
            <input className="input" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="(xx) xxxxx-xxxx" />
          </div>
          <div>
            <label className="text-sm">Notas</label>
            <input className="input" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} placeholder="alergias, preferências..." />
          </div>

          <div className="col-span-2">
            <label className="text-sm">Procedimento padrão (opcional)</label>
            <select className="input" value={form.default_service_id} onChange={e=>setForm({...form, default_service_id:e.target.value})}>
              <option value="">Selecione...</option>
              {services.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="text-xs text-neutral-500 mt-1">Esse procedimento será sugerido automaticamente na Agenda para essa cliente.</div>
          </div>

          <div className="col-span-2">
            <label className="text-sm">Dias preferidos</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {DAYS.map(d=>(
                <label key={d.k} className={"px-3 py-2 rounded-xl border cursor-pointer " + (form.pref_days.includes(d.k)?'bg-pink-50 border-pink-300':'')}>
                  <input type="checkbox" className="mr-2" checked={form.pref_days.includes(d.k)} onChange={()=>toggleDay(d.k)} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm">Início preferido</label>
            <input type="time" className="input" value={form.pref_start} onChange={e=>setForm({...form, pref_start:e.target.value})} />
          </div>
          <div>
            <label className="text-sm">Fim preferido</label>
            <input type="time" className="input" value={form.pref_end} onChange={e=>setForm({...form, pref_end:e.target.value})} />
          </div>

          <div className="col-span-2">
            <button className="btn">Salvar</button>
          </div>
          {msg && <div className="col-span-2 text-sm">{msg}</div>}
        </form>
      </div>

      {/* Lista */}
      <div className="card">
        <div className="h2">Clientes</div>
        <table className="mt-3">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tel</th>
              <th>Preferências</th>
              <th>Proc. padrão</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(c=>(
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone || '—'}</td>
                <td className="text-xs text-neutral-600">
                  {((c.pref_days||[]) as string[]).length
                    ? ((c.pref_days||[]) as string[]).map(k => DAY_PT[k] || k).join(', ')
                    : '—'}
                  {c.pref_start ? ` • ${c.pref_start}-${c.pref_end}` : ''}
                </td>
                <td className="text-xs">{svcName(c.default_service_id) || '—'}</td>
                <td><button className="px-2 py-1 rounded border" onClick={()=>remove(c.id)}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}