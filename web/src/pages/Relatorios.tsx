import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Relatorios(){
  const now = new Date()
  const [year,setYear] = useState(now.getFullYear())
  const [month,setMonth] = useState(now.getMonth()+1)
  const [data,setData] = useState<any>(null)

  async function refresh(){
    const d = await api.req(`/reports/monthly?year=${year}&month=${month}`)
    setData(d)
  }
  useEffect(()=>{ refresh() },[])
  useEffect(()=>{ refresh() },[year,month])

  return (
    <div className="space-y-4">
      <div className="card flex gap-3 items-end">
        <div>
          <label className="text-sm" htmlFor="month-select">Mês</label>
          <select
            id="month-select"
            className="input"
            value={month}
            onChange={e=>setMonth(+e.target.value)}
          >
            {Array.from({length:12}).map((_,i)=> <option key={i+1} value={i+1}>{i+1}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Ano</label>
          <input
            type="number"
            className="input"
            value={year}
            onChange={e=>setYear(+e.target.value)}
            placeholder="Ano"
            title="Ano"
          />
        </div>
        <button className="btn" onClick={refresh}>Atualizar</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card"><div className="h2">Total</div><div className="text-2xl font-bold">R$ {(data?.total||0).toFixed(2)}</div></div>
        <div className="card"><div className="h2">Recebido</div><div className="text-2xl font-bold text-green-700">R$ {(data?.paid||0).toFixed(2)}</div></div>
        <div className="card"><div className="h2">Pendente</div><div className="text-2xl font-bold text-amber-700">R$ {(data?.pending||0).toFixed(2)}</div></div>
      </div>
      <div className="text-sm text-neutral-500">Período {data?.from} a {data?.to}</div>
    </div>
  )
}