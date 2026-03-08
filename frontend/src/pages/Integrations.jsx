import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api.js'
import toast from 'react-hot-toast'
import {
  Mail, CheckCircle2, Plug, PlugZap, RefreshCw,
  Loader2, Trash2, Calendar, ChevronRight,
} from 'lucide-react'
import SyncModal from '../components/SyncModal.jsx'

function GmailLogo() {
  return (
    <svg viewBox="0 0 48 48" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M6 10h36v28H6z" opacity=".1"/>
      <path fill="#fff" d="M6 11v26h10V23.5L24 31l8-7.5V37h10V11L24 22 6 11z"/>
      <path fill="#EA4335" d="M6 11l18 11 18-11H6z"/>
      <path fill="#FBBC05" d="M6 11v2l18 12V23.5L6 13v-2z" opacity="0"/>
      <path fill="#4285F4" d="M6 11h3l15 9 15-9h3L24 22 6 11z"/>
      <path fill="#34A853" d="M42 37V11L30 23.5V37h12z" opacity=".6"/>
      <path fill="#EA4335" d="M6 37V11L18 23.5V37H6z" opacity=".6"/>
    </svg>
  )
}

const STATUS_LABELS = {
  idle:      { label: 'Connected',   color: 'text-green-600',   bg: 'bg-green-100 dark:bg-green-900/30' },
  pending:   { label: 'Pending…',    color: 'text-yellow-600',  bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  syncing:   { label: 'Syncing…',    color: 'text-brand-600',   bg: 'bg-brand-100 dark:bg-brand-900/30' },
  completed: { label: 'Sync done',   color: 'text-green-600',   bg: 'bg-green-100 dark:bg-green-900/30' },
  failed:    { label: 'Sync failed', color: 'text-red-600',     bg: 'bg-red-100 dark:bg-red-900/30' },
}

export default function Integrations() {
  const [searchParams]  = useSearchParams()
  const [showSync,      setShowSync]      = useState(false)
  const qc              = useQueryClient()

  // Handle OAuth callback params
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      toast.success('Gmail connected successfully!')
      qc.invalidateQueries({ queryKey: ['gmail-status'] })
    }
    if (searchParams.get('error')) {
      toast.error('Failed to connect Gmail: ' + searchParams.get('error'))
    }
  }, [searchParams, qc])

  const { data: status, isLoading } = useQuery({
    queryKey: ['gmail-status'],
    queryFn:  () => api.get('/gmail/status').then(r => r.data),
    refetchInterval: (query) => {
      const d = query.state.data
      return (d?.sync_status === 'syncing' || d?.sync_status === 'pending') ? 2000 : false
    },
  })

  const connectMutation = useMutation({
    mutationFn: () => api.get('/gmail/auth-url').then(r => {
      // Backend already embeds the bearer token as state in the URL
      window.location.href = r.data.url
    }),
    onError: () => toast.error('Failed to get auth URL'),
  })

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete('/gmail/disconnect'),
    onSuccess: () => {
      toast.success('Gmail disconnected.')
      qc.invalidateQueries({ queryKey: ['gmail-status'] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
    onError: () => toast.error('Failed to disconnect.'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  const connected    = status?.connected
  const syncStatus   = status?.sync_status || 'idle'
  const syncProgress = status?.sync_progress || 0
  const  statusMeta  = STATUS_LABELS[syncStatus] || STATUS_LABELS.idle
  const isSyncing    = syncStatus === 'syncing' || syncStatus === 'pending'

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-fade-in-up">
      <h1 className="text-3xl font-bold gradient-text mb-1 animate-fade-in-up stagger-1">Integrations</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 animate-fade-in-up stagger-2">
        Connect external services to enhance your dashboard.
      </p>

      <div className="card overflow-hidden animate-fade-in-up stagger-3">

        {/* Card header — gradient when connected */}
        <div className={`p-5 md:p-6 ${
          connected
            ? 'bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-950/40 dark:to-indigo-950/40 border-b border-brand-100 dark:border-brand-900/30'
            : ''
        }`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <GmailLogo />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Gmail</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {connected ? status.gmail_address : 'Not connected'}
                </p>
              </div>
            </div>

            {connected && (
              <div className="relative">
                {(syncStatus === 'idle' || syncStatus === 'completed') && (
                  <span className="animate-pulse-ring absolute inset-0 rounded-full bg-green-400/30" />
                )}
                <span className={`badge relative ${statusMeta.bg} ${statusMeta.color}`}>
                  {isSyncing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {statusMeta.label}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 md:p-6">

        {isSyncing && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Syncing emails…</span>
              <span>{syncProgress}%</span>
            </div>
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-500 animate-progress-glow"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            {status?.total_messages > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {status.synced_messages} / {status.total_messages} threads processed
              </p>
            )}
          </div>
        )}

        {connected && !isSyncing && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-950/30 dark:to-indigo-950/30 rounded-xl p-3 border border-brand-100 dark:border-brand-900/20">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Sync Range</p>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Last {status.sync_days} days</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-950/30 dark:to-indigo-950/30 rounded-xl p-3 border border-brand-100 dark:border-brand-900/20">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Last Synced</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {status.last_synced_at
                  ? new Date(status.last_synced_at).toLocaleString()
                  : 'Never'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {!connected ? (
            <button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="btn-primary"
            >
              {connectMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</>
                : <><PlugZap className="w-4 h-4" /> Connect Gmail</>
              }
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowSync(true)}
                disabled={isSyncing}
                className="btn-primary"
              >
                {isSyncing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing…</>
                  : <><RefreshCw className="w-4 h-4" /> Sync Emails</>
                }
              </button>
              <button
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending || isSyncing}
                className="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash2 className="w-4 h-4" />
                Disconnect
              </button>
            </>
          )}
        </div>
        </div>{/* end p-5 body */}
      </div>{/* end card */}

      {/* Other integrations placeholder */}
      <div className="card p-5 mt-4 opacity-60 cursor-not-allowed select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Outlook</p>
              <p className="text-xs text-gray-500">Coming soon</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      </div>

      {showSync && (
        <SyncModal
          onClose={() => setShowSync(false)}
          currentDays={status?.sync_days || 7}
        />
      )}
    </div>
  )
}
