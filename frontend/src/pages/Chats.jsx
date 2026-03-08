import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api.js'
import EmailList from '../components/EmailList.jsx'
import EmailThread from '../components/EmailThread.jsx'
import { Search, X, Filter, Inbox } from 'lucide-react'

const CATEGORIES = [
  { value: '',            label: 'All' },
  { value: 'urgent',      label: '🔴 Urgent' },
  { value: 'general',     label: '📧 General' },
  { value: 'promotional', label: '🏷️ Promos' },
  { value: 'social',      label: '👥 Social' },
]

export default function Chats() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search,     setSearch]     = useState('')
  const [category,   setCategory]   = useState('')
  const [starred,    setStarred]    = useState(false)
  const [page,       setPage]       = useState(1)

  const selectedId = searchParams.get('thread') ? parseInt(searchParams.get('thread')) : null

  // Build query key
  const queryParams = { search, category, starred: starred ? '1' : '', page }

  // Poll gmail-status so we know when a sync is running
  const { data: gmailStatus } = useQuery({
    queryKey: ['gmail-status'],
    queryFn:  () => api.get('/gmail/status').then(r => r.data),
    refetchInterval: (query) => {
      const d = query.state.data
      return (d?.sync_status === 'syncing' || d?.sync_status === 'pending') ? 2000 : false
    },
  })

  const isSyncing = gmailStatus?.sync_status === 'syncing' || gmailStatus?.sync_status === 'pending'

  const { data, isLoading } = useQuery({
    queryKey: ['threads', queryParams],
    queryFn:  () => api.get('/emails', { params: queryParams }).then(r => r.data),
    // Auto-refresh the thread list while a sync is in progress
    refetchInterval: isSyncing ? 3000 : false,
  })

  const selectThread = (id) => {
    setSearchParams(id ? { thread: String(id) } : {})
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div className={`flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900
                       ${selectedId ? 'hidden md:flex md:w-80 lg:w-96' : 'flex w-full md:w-80 lg:w-96'}`}>

        <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails…"
              className="input pl-9 pr-8 text-sm"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => { setCategory(c.value); setPage(1) }}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  category === c.value
                    ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {c.label}
              </button>
            ))}
            <button
              onClick={() => { setStarred(s => !s); setPage(1) }}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                starred
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              ⭐ Starred
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <EmailList
            threads={data?.data || []}
            loading={isLoading}
            selectedId={selectedId}
            onSelect={selectThread}
          />

          {data?.pagination && data.pagination.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost text-xs disabled:opacity-40">
                ← Prev
              </button>
              <span className="text-xs text-gray-500">{page} / {data.pagination.last_page}</span>
              <button disabled={page === data.pagination.last_page} onClick={() => setPage(p => p + 1)} className="btn-ghost text-xs disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`flex-1 overflow-hidden ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
        {selectedId ? (
          <EmailThread
            threadId={selectedId}
            onBack={() => selectThread(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-gray-600">
            <Inbox className="w-16 h-16 mb-4 opacity-40" />
            <p className="font-medium text-gray-500 dark:text-gray-400">Select an email to read</p>
            <p className="text-sm mt-1">Your conversations will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}
