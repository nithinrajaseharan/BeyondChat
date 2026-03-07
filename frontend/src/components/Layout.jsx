import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import {
  LayoutDashboard, Mail, Plug, BarChart2, LogOut,
  Menu, X, Moon, Sun, ChevronDown,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api.js'

function useDarkMode() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const toggle = () => {
    setDark(d => {
      const next = !d
      document.documentElement.classList.toggle('dark', next)
      return next
    })
  }

  return [dark, toggle]
}

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
  const [dark,  toggleDark] = useDarkMode()

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
    <div className="min-h-screen flex flex-col dark:bg-gray-950">

      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 flex items-center px-4 gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white hidden sm:block">BeyondChats</span>
        </div>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
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
          <button
            onClick={toggleDark}
            className="btn-ghost hidden sm:flex"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
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

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
            <button
              onClick={toggleDark}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {dark ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
