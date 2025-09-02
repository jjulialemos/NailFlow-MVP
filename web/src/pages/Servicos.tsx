import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Servicos(){
  const [list,setList] = useState<any[]>([])
  const [form,setForm] = useState<any>({ name:'', kind:'outro', price:0, duration_minutes:60, maintenance_interval_days:'' })

  function refresh(){ api.req('/services').then(setList) }
  useEffect(()=>{ refresh() },[])

  async function add(e:any){
    e.preventDefault()
    const body = {
      ...form,
      price:+form.price,
      duration_minutes:+form.duration_minutes,
      maintenance_interval_days: form.maintenance_interval_days===''? null : +form.maintenance_interval_days
    }
    await api.req('/services', { method:'POST', body: JSON.stringify(body) })
    setForm({ name:'', kind:'outro', price:0, duration_minutes:60, maintenance_interval_days:'' })
    refresh()
  }
  async function remove(id:number){ await api.req('/services/'+id,{ method:'DELETE' }); refresh() }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card">
        <div className="h2">Novo procedimento</div>
        <form onSubmit={add} className="grid grid-cols-2 gap-3 mt-3">
          <div className="col-span-2">
            <label className="text-sm">Nome*</label>
            <input className="input" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
          </div>
          <div>
            <label className="text-sm">Tipo</label>
            <select className="input" value={form.kind} onChange={e=>setForm({...form, kind:e.target.value})}>
              <option value="novo">Novo</option>
              <option value="manutencao">Manutenção</option>
              <option value="gel">Gel</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Preço base (R$)</label>
            <input type="number" className="input" value={form.price} onChange={e=>setForm({...form, price:e.target.value})}/>
          </div>
          <div>
            <label className="text-sm">Duração média (min)</label>
            <input type="number" className="input" value={form.duration_minutes} onChange={e=>setForm({...form, duration_minutes:e.target.value})}/>
          </div>
          <div>
            <label className="text-sm">Intervalo p/ manutenção (dias)</label>
            <input type="number" className="input" placeholder="ex.: 21" value={form.maintenance_interval_days} onChange={e=>setForm({...form, maintenance_interval_days:e.target.value})}/>
            <div className="text-xs text-neutral-500 mt-1">Deixe em branco se não se aplica.</div>
          </div>
          <div className="col-span-2"><button className="btn">Salvar</button></div>
        </form>
      </div>

      <div className="card">
        <div className="h2">Procedimentos</div>
        <table className="mt-3">
          <thead><tr><th>Nome</th><th>Tipo</th><th>Preço</th><th>Duração</th><th>Manutenção</th><th></th></tr></thead>
          <tbody>
            {list.map(s=>(
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.kind}</td>
                <td>R$ {(s.price||0).toFixed(2)}</td>
                <td>{s.duration_minutes} min</td>
                <td>{s.maintenance_interval_days ?? '—'}</td>
                <td><button className="px-2 py-1 rounded border" onClick={()=>remove(s.id)}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}