import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  LayoutDashboard, Mail, Plug, BarChart2, LogOut,
  Menu, X, ChevronDown,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api.js'

const NAV = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/chats',        label: 'Chats',         icon: Mail },
  { to: '/integrations', label: 'Integrations',  icon: Plug },
  { to: '/analytics',    label: 'Analytics',     icon: BarChart2 },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate          = useNavigate()
  const [open,  setOpen]  = useState(false)

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn:  () => api.get('/gmail/status').then(r => r.data),
    staleTime: 30_000,
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 40%, #f5f0ff 100%)'}}>

      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="animate-float absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 opacity-[0.07] blur-3xl" />
        <div className="animate-float-rev absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-400 to-purple-500 opacity-[0.07] blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/60 dark:border-gray-800/70 h-16 flex items-center px-4 gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-500 hidden sm:block">BeyondChats</span>
        </div>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-500 to-indigo-500 text-white shadow-md shadow-brand-500/25'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
              {label === 'Integrations' && gmailStatus?.connected && (
                <span className="w-2 h-2 bg-green-400 rounded-full" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden lg:block">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="btn-ghost hidden sm:flex"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setOpen(o => !o)}
            className="btn-ghost md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>


      {open && (
        <div className="md:hidden fixed inset-0 top-16 z-30 bg-white dark:bg-gray-900 p-4 animate-fade-in">
          <nav className="space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 pt-4 border-t border-gray-200 space-y-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto relative z-10">
        <Outlet />
      </main>
    </div>
  )
}
