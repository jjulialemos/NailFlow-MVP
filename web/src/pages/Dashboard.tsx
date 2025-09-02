import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import WeeklyCalendar from '../components/WeeklyCalendar'
import dayjs from 'dayjs'

export default function Dashboard(){
  const [summary,setSummary] = useState<any>(null)
  const [clients,setClients] = useState<any[]>([])
  const [weekAppts,setWeekAppts] = useState<any[]>([])
  const [due,setDue] = useState<any[]>([])

  const now = dayjs()
  const weekStart = now.startOf('week').add(1,'day') // segunda
  const weekEnd = weekStart.add(6,'day')

  useEffect(()=>{
    const y = now.year(), m = now.month()+1
    api.req(`/reports/monthly?year=${y}&month=${m}`).then(setSummary).catch(()=>{})
    api.req('/clients').then(setClients)
    api.req(`/appointments?from=${weekStart.format('YYYY-MM-DD')}&to=${weekEnd.format('YYYY-MM-DD')}`).then(setWeekAppts)
    api.req('/maintenance/due').then(setDue)
  },[])

  const apptsToCalendar = useMemo(()=> weekAppts.map((a:any)=>({
    date:a.date, start:a.start, end:a.end, service:a.service, client: clients.find(c=>c.id===a.client_id)?.name || '—'
  })), [weekAppts, clients])

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="h2">Faturamento do mês</div>
          <div className="mt-2 text-3xl font-bold">R$ {(summary?.total||0).toFixed(2)}</div>
          <div className="text-sm text-neutral-500">
            Recebido: R$ {(summary?.paid||0).toFixed(2)} • Pendente: R$ {(summary?.pending||0).toFixed(2)}
          </div>
        </div>
        <div className="card">
          <div className="h2">Atendimentos no mês</div>
          <div className="mt-2 text-3xl font-bold">{summary?.count || 0}</div>
          <div className="text-sm text-neutral-500">Período {summary?.from} a {summary?.to}</div>
        </div>
        <div className="card">
          <div className="h2">Clientes p/ manutenção</div>
          <div className="mt-2 text-3xl font-bold">{due.length}</div>
          <div className="text-xs text-neutral-500">Baseado no intervalo configurado no procedimento</div>
        </div>
      </div>

      <div className="card">
        <div className="h2">Agenda da semana ({weekStart.format('DD/MM')} – {weekEnd.format('DD/MM')})</div>
        <div className="mt-3">
          <WeeklyCalendar weekStart={weekStart as any} appts={apptsToCalendar as any} />
        </div>
      </div>

      {due.length>0 && (
        <div className="card">
          <div className="h2">Na hora de agendar (manutenção)</div>
          <table className="mt-3 w-full text-sm">
            <thead><tr><th>Cliente</th><th>Procedimento</th><th>Última vez</th><th>Próxima sugerida</th><th>Atraso</th></tr></thead>
            <tbody>
              {due.map((d:any,i:number)=>(
                <tr key={i} className="border-t">
                  <td>{d.client_name}</td>
                  <td>{d.service}</td>
                  <td>{d.last_date}</td>
                  <td>{d.next_date}</td>
                  <td>{d.days_overdue} dias</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}