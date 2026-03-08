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

function StatCard({ icon: Icon, label, value, gradient, className = '' }) {
  return (
    <div className={`rounded-2xl p-5 ${gradient} ${className} relative overflow-hidden text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300`}>
      <div className="absolute -right-3 -top-3 opacity-15">
        <Icon className="w-24 h-24" />
      </div>
      <p className="text-3xl font-bold tabular-nums tracking-tight">{value ?? '—'}</p>
      <p className="text-sm font-medium mt-1 opacity-85">{label}</p>
    </div>
  )
}

function SectionHeading({ children }) {
  return (
    <h2 className="font-semibold text-gray-900 dark:text-white mb-4 pl-3 border-l-4 border-brand-500">{children}</h2>
  )
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
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <h1 className="text-3xl font-bold gradient-text animate-fade-in-up stagger-1">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Inbox}     label="Total Threads"   value={data.total_threads} gradient="bg-gradient-to-br from-brand-500 to-brand-700"   className="animate-fade-in-up stagger-1" />
        <StatCard icon={TrendingUp} label="Unread"          value={data.unread}        gradient="bg-gradient-to-br from-red-400 to-rose-600"      className="animate-fade-in-up stagger-2" />
        <StatCard icon={Paperclip}  label="With Attachments" value={data.with_attach}  gradient="bg-gradient-to-br from-amber-400 to-orange-500"  className="animate-fade-in-up stagger-3 col-span-2 md:col-span-1" />
      </div>

      {data.volume?.length > 0 && (
        <Card className="animate-fade-in-up stagger-4">
          <SectionHeading>Email Volume — Last 30 Days</SectionHeading>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.volume} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                labelFormatter={d => new Date(d).toDateString()}
              />
              <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} name="Emails" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {pieData.length > 0 && (
          <Card className="animate-fade-in-up stagger-5">
            <SectionHeading>Category Breakdown</SectionHeading>
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
          <Card className="animate-fade-in-up stagger-6">
            <SectionHeading>Top Senders</SectionHeading>
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
                        <div className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-700" style={{ width: `${(sender.count / max) * 100}%` }} />
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
