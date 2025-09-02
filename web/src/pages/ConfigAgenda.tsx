import { useEffect, useState } from 'react'
import { api } from '../api'

const DAYS = [
  {k:'mon',label:'Seg'}, {k:'tue',label:'Ter'}, {k:'wed',label:'Qua'},
  {k:'thu',label:'Qui'}, {k:'fri',label:'Sex'}, {k:'sat',label:'Sáb'}, {k:'sun',label:'Dom'},
]

export default function ConfigAgenda(){
  const [availability,setAvailability] = useState<any[]>([])
  const [blocked,setBlocked] = useState<any[]>([])
  const [av,setAv] = useState<any>({ dow:'mon', start:'09:00', end:'18:00' })
  const [bl,setBl] = useState<any>({ date:'', start:'', end:'', reason:'' })

  function refresh(){
    api.req('/availability').then(setAvailability)
    api.req('/blocked').then(setBlocked)
  }
  useEffect(()=>{ refresh() },[])

  async function addWindow(e:any){
    e.preventDefault()
    await api.req('/availability', { method:'POST', body: JSON.stringify(av) })
    setAv({ dow:'mon', start:'09:00', end:'18:00' }); refresh()
  }
  async function delWindow(id:number){ await api.req('/availability/'+id,{ method:'DELETE' }); refresh() }

  async function addBlock(e:any){
    e.preventDefault()
    await api.req('/blocked', { method:'POST', body: JSON.stringify(bl) })
    setBl({ date:'', start:'', end:'', reason:'' }); refresh()
  }
  async function delBlock(id:number){ await api.req('/blocked/'+id,{ method:'DELETE' }); refresh() }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card">
        <div className="h2">Agenda semanal — janelas de atendimento</div>
        <form onSubmit={addWindow} className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className="text-sm" htmlFor="dow-select">Dia</label>
            <select
              id="dow-select"
              className="input"
              value={av.dow}
              onChange={e=>setAv({...av, dow:e.target.value})}
            >
              {DAYS.map(d=> <option key={d.k} value={d.k}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm">Início</label>
            <input
              type="time"
              className="input"
              value={av.start}
              onChange={e=>setAv({...av, start:e.target.value})}
              title="Horário de início"
              placeholder="Início"
            />
          </div>
          <div>
            <label className="text-sm">Fim</label>
            <input
              type="time"
              className="input"
              value={av.end}
              onChange={e=>setAv({...av, end:e.target.value})}
              title="Horário de fim"
              placeholder="Fim"
            />
          </div>
          <div className="col-span-3"><button className="btn">Adicionar</button></div>
        </form>
        <table className="mt-3">
          <thead><tr><th>Dia</th><th>Janela</th><th></th></tr></thead>
          <tbody>
            {availability.map(a=>(
              <tr key={a.id}>
                <td>{a.dow}</td><td>{a.start}-{a.end}</td>
                <td><button className="px-2 py-1 rounded border" onClick={()=>delWindow(a.id)}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="h2">Bloqueios de agenda</div>
        <form onSubmit={addBlock} className="grid grid-cols-4 gap-3 mt-3">
          <div className="col-span-2">
            <label className="text-sm">Data</label>
            <input
              type="date"
              className="input"
              value={bl.date}
              onChange={e=>setBl({...bl, date:e.target.value})}
              title="Selecione a data"
              placeholder="Data"
            />
          </div>
          <div>
            <label className="text-sm">Início</label>
            <input
              type="time"
              className="input"
              value={bl.start}
              onChange={e=>setBl({...bl, start:e.target.value})}
              title="Horário de início"
              placeholder="Início"
            />
          </div>
          <div>
            <label className="text-sm">Fim</label>
            <input
              type="time"
              className="input"
              value={bl.end}
              onChange={e=>setBl({...bl, end:e.target.value})}
              title="Horário de fim"
              placeholder="Fim"
            />
          </div>
          <div className="col-span-4">
            <label className="text-sm">Motivo (opcional)</label>
            <input
              className="input"
              value={bl.reason}
              onChange={e=>setBl({...bl, reason:e.target.value})}
              title="Motivo do bloqueio"
              placeholder="Motivo (opcional)"
            />
          </div>
          <div className="col-span-4"><button className="btn">Adicionar</button></div>
        </form>
        <table className="mt-3">
          <thead><tr><th>Data</th><th>Janela</th><th>Motivo</th><th></th></tr></thead>
          <tbody>
            {blocked.map(b=>(
              <tr key={b.id}>
                <td>{b.date}</td><td>{b.start}-{b.end}</td><td>{b.reason||'—'}</td>
                <td><button className="px-2 py-1 rounded border" onClick={()=>delBlock(b.id)}>Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}