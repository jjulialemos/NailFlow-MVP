import { useEffect, useState } from 'react'
import { api } from '../api'

function firstDayMonth(d=new Date()){ return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10) }
function lastDayMonth(d=new Date()){ return new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().slice(0,10) }

export default function Financeiro(){
  const [from,setFrom] = useState(firstDayMonth())
  const [to,setTo] = useState(lastDayMonth())
  const [list,setList] = useState<any[]>([])
  const [totals,setTotals] = useState({ total:0, paid:0, pending:0 })

  async function refresh(){
    const a = await api.req(`/appointments?from=${from}&to=${to}`)
    setList(a)
    const total = a.reduce((s:any,x:any)=>s+(x.price||0),0)
    const paid  = a.filter((x:any)=>x.paid).reduce((s:any,x:any)=>s+(x.price||0),0)
    setTotals({ total, paid, pending: total-paid })
  }
  useEffect(()=>{ refresh() },[])
  useEffect(()=>{ refresh() },[from,to])

  async function togglePaid(a:any){ await api.req('/appointments/'+a.id, { method:'PUT', body: JSON.stringify({ paid: a.paid?0:1 }) }); refresh() }

  return (
    <div className="space-y-4">
      <div className="card grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm">De</label>
          <input
            type="date"
            className="input"
            value={from}
            onChange={e=>setFrom(e.target.value)}
            title="Selecione a data inicial"
            placeholder="Data inicial"
          />
        </div>
        <div>
          <label className="text-sm">Até</label>
          <input
            type="date"
            className="input"
            value={to}
            onChange={e=>setTo(e.target.value)}
            title="Selecione a data final"
            placeholder="Data final"
          />
        </div>
        <div className="flex items-end"><button className="btn" onClick={refresh}>Atualizar</button></div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card"><div className="h2">Total</div><div className="text-2xl font-bold">R$ {totals.total.toFixed(2)}</div></div>
        <div className="card"><div className="h2">Recebido</div><div className="text-2xl font-bold text-green-700">R$ {totals.paid.toFixed(2)}</div></div>
        <div className="card"><div className="h2">Pendente</div><div className="text-2xl font-bold text-amber-700">R$ {totals.pending.toFixed(2)}</div></div>
      </div>

      <div className="card">
        <div className="h2">Lançamentos</div>
        <table className="mt-3">
          <thead><tr><th>Data</th><th>Horário</th><th>Serviço</th><th>R$</th><th>Pago</th></tr></thead>
          <tbody>
            {list.map(a=>(
              <tr key={a.id}>
                <td>{a.date}</td>
                <td>{a.start}-{a.end}</td>
                <td>{a.service||'—'}</td>
                <td>R$ {(a.price||0).toFixed(2)}</td>
                <td><button className="px-2 py-1 rounded border" onClick={()=>togglePaid(a)}>{a.paid? '✓':'—'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}