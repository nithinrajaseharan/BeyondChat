import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api.js'
import toast from 'react-hot-toast'
import { X, RefreshCw, Loader2, Calendar, Info } from 'lucide-react'

const PRESETS = [
  { days: 1,  label: 'Today' },
  { days: 7,  label: 'Last 7 days' },
  { days: 14, label: 'Last 2 weeks' },
  { days: 30, label: 'Last 30 days' },
  { days: 60, label: 'Last 60 days' },
  { days: 90, label: 'Last 90 days' },
]

export default function SyncModal({ onClose, currentDays }) {
  const [days, setDays] = useState(currentDays || 7)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (d) => api.post('/gmail/sync', { days: d }),
    onSuccess: () => {
      toast.success(`Syncing emails from the last ${days} days…`)
      qc.invalidateQueries({ queryKey: ['gmail-status'] })
      onClose()
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to start sync.')
    },
  })

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="card w-full max-w-md p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Sync Emails</h2>
                <p className="text-xs text-gray-500">Choose how many days to sync</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost p-1.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {PRESETS.map(p => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                  days === p.days
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <label className="label" htmlFor="custom-days">
              Custom range (1–90 days)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="custom-days"
                type="number"
                min={1}
                max={90}
                className="input pl-9"
                value={days}
                onChange={e => {
                  const v = Math.max(1, Math.min(90, Number(e.target.value)))
                  setDays(v)
                }}
              />
            </div>
          </div>

          <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg mb-5">
            <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Syncing will re-fetch all emails in the selected range. Large mailboxes may take a few minutes.
              The process runs in the background.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate(days)}
              disabled={mutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Sync {days} days</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
