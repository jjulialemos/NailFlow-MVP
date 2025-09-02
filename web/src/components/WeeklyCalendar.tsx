import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/pt-br'
import { useMemo } from 'react'

dayjs.locale('pt-br')

type Appt = { date:string, start:string, end:string, service?:string, client?:string }

function timeslots(start=8, end=20, step=30){
  const out:string[] = []
  for (let h=start; h<end; h++){
    out.push(`${String(h).padStart(2,'0')}:00`)
    if (step===30) out.push(`${String(h).padStart(2,'0')}:30`)
  }
  out.push(`${String(end).padStart(2,'0')}:00`)
  return out
}

export default function WeeklyCalendar({
  weekStart, appts
}:{
  weekStart: Dayjs,
  appts: Appt[]
}){
  const days = useMemo(()=> Array.from({length:7}).map((_,i)=> weekStart.add(i,'day')), [weekStart])
  const rows = timeslots(8,20,30)

  const listFor = (date:string, time:string) =>
    appts.filter(a => a.date===date && a.start===time)

  return (
    <div className="overflow-auto border rounded-2xl">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="p-2 w-20">Hora</th>
            {days.map(d=>(
              <th key={d.format('YYYY-MM-DD')} className="p-2">{d.format('ddd DD/MM')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(t=>(
            <tr key={t} className="border-t">
              <td className="p-2 text-neutral-500">{t}</td>
              {days.map(d=>{
                const date = d.format('YYYY-MM-DD')
                const items = listFor(date, t)
                return (
                  <td key={date+t} className="p-1 align-top">
                    <div className="space-y-1">
                      {items.map((a,i)=>(
                        <div key={i} className="rounded-lg px-2 py-1 bg-pink-50 border border-pink-200">
                          <div className="font-medium">{a.start}–{a.end} • {a.service||'Serviço'}</div>
                          {a.client && <div className="text-neutral-600">{a.client}</div>}
                        </div>
                      ))}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}