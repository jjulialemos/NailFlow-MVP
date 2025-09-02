import { NavLink } from 'react-router-dom'
const linkCls = ({isActive}:{isActive:boolean}) =>
  `block px-4 py-2 rounded-xl transition ${isActive? 'bg-pink-100 text-pink-700':'hover:bg-neutral-100'}`
export default function Sidebar(){
  return (
    <aside className="w-64 border-r bg-white">
      <div className="p-6 border-b">
        <div className="text-xl font-bold">💅 NailFlow</div>
        <div className="text-xs text-neutral-500">Agenda inteligente</div>
      </div>
      <nav className="p-4 space-y-1">
        <NavLink to="/app" className={linkCls}>Dashboard</NavLink>
        <NavLink to="/app/agenda" className={linkCls}>Agenda</NavLink>
        <NavLink to="/app/clientes" className={linkCls}>Clientes</NavLink>
        <NavLink to="/app/financeiro" className={linkCls}>Financeiro</NavLink>
        <NavLink to="/app/relatorios" className={linkCls}>Relatórios</NavLink>
        <NavLink to="/app/servicos" className={linkCls}>Procedimentos</NavLink>
        <div className="mt-4 pt-4 border-t text-xs text-neutral-500">Configurações</div>
        <NavLink to="/app/config/agenda" className={linkCls}>Agenda semanal</NavLink>
      </nav>
    </aside>
  )
}