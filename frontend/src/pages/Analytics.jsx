import { useQuery } from '@tanstack/react-query'
import api from '../services/api.js'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Loader2, TrendingUp, Users, Paperclip, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'

const CATEGORY_COLORS = {
  urgent:      '#ef4444',
  general:     '#6366f1',
  promotional: '#f59e0b',
  social:      '#3b82f6',
}

function Card({ children, className = '' }) {
  return <div className={`card p-5 ${className}`}>{children}</div>
}

export default function Analytics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn:  () => api.get('/emails/analytics').then(r => r.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Could not load analytics. Make sure you have synced emails.</p>
        <Link to="/integrations" className="text-brand-600 hover:underline text-sm mt-2 inline-block">
          Go to Integrations →
        </Link>
      </div>
    )
  }

  const pieData = (data.categories || []).map(c => ({
    name:  c.category.charAt(0).toUpperCase() + c.category.slice(1),
    value: c.count,
    color: CATEGORY_COLORS[c.category] || '#9ca3af',
  }))

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{data.total_threads}</p>
            <p className="text-xs text-gray-500">Total Threads</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{data.unread}</p>
            <p className="text-xs text-gray-500">Unread</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Paperclip className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{data.with_attach}</p>
            <p className="text-xs text-gray-500">With Attachments</p>
          </div>
        </Card>
      </div>

      {data.volume?.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Email Volume — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.volume} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                labelFormatter={d => new Date(d).toDateString()}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Emails" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {pieData.length > 0 && (
          <Card>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span style={{ fontSize: 12, color: '#6b7280' }}>{v}</span>} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {data.top_senders?.length > 0 && (
          <Card>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Top Senders</h2>
            <div className="space-y-3">
              {data.top_senders.map((sender, i) => {
                const max = data.top_senders[0].count
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300 flex-shrink-0">
                      {(sender.name || sender.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{sender.name || sender.email}</p>
                      <div className="mt-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(sender.count / max) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">{sender.count}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
