import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import api from '../services/api.js'
import { Mail, Plug, BarChart2, Star, Paperclip, ArrowRight, Inbox } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: () => api.get('/gmail/status').then(r => r.data),
  })

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn:  () => api.get('/emails/analytics').then(r => r.data),
    enabled:  gmailStatus?.connected,
  })

  const { data: threads } = useQuery({
    queryKey: ['threads-preview'],
    queryFn:  () => api.get('/emails?per_page=5').then(r => r.data),
    enabled:  gmailStatus?.connected,
  })

  const connected = gmailStatus?.connected

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good day, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Here's an overview of your email dashboard.
        </p>
      </div>

      {!connected && (
        <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/20">
          <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
            <Plug className="w-5 h-5 text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white">Connect your Gmail</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Head over to Integrations to link your Gmail account and start syncing emails.
            </p>
          </div>
          <Link to="/integrations" className="btn-primary shrink-0">
            Connect Gmail <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {connected && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Inbox}      label="Total Threads"    value={analytics?.total_threads} color="bg-brand-500" />
          <StatCard icon={Mail}       label="Unread"           value={analytics?.unread}        color="bg-red-500" />
          <StatCard icon={Paperclip}  label="With Attachments" value={analytics?.with_attach}   color="bg-amber-500" />
          <StatCard icon={BarChart2}  label="Days Synced"      value={gmailStatus?.sync_days}   color="bg-green-500" />
        </div>
      )}

      {connected && threads?.data?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Threads</h2>
            <Link to="/chats" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {threads.data.map(thread => (
              <li key={thread.id}>
                <Link
                  to={`/chats?thread=${thread.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0 text-brand-700 dark:text-brand-300 font-semibold text-sm">
                    {(thread.from_name || thread.from_email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${!thread.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {thread.from_name || thread.from_email}
                      </p>
                      {thread.is_starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                      {thread.has_attachments && <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${!thread.is_read ? 'font-medium text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {thread.subject}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                    {thread.last_message_at ? new Date(thread.last_message_at).toLocaleDateString() : ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {connected && threads?.data?.length === 0 && (
        <div className="card p-10 text-center">
          <Mail className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="font-medium text-gray-900 dark:text-white">No emails synced yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Go to <Link to="/integrations" className="text-brand-600 hover:underline">Integrations</Link> and start a sync.
          </p>
        </div>
      )}
    </div>
  )
}
