import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: '候補者一覧', icon: '👥' },
  { to: '/candidates/new', label: '候補者追加', icon: '➕' },
  { to: '/settings', label: '設定', icon: '⚙️' },
]

export function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0 h-screen">
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-sm font-bold text-gray-200 leading-snug">採用管理</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
