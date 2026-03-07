import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api.js'
import toast from 'react-hot-toast'
import { X, Send, Loader2, ChevronDown } from 'lucide-react'

export default function ReplyBox({ thread, onClose }) {
  const qc = useQueryClient()

  // Determine the default reply-to address (last sender in thread who isn't the user)
  const lastEmail = thread.emails?.[thread.emails.length - 1]
  const [to,      setTo]      = useState(lastEmail?.from_email || '')
  const [body,    setBody]    = useState('')
  const [showCC,  setShowCC]  = useState(false)
  const [cc,      setCc]      = useState('')

  const mutation = useMutation({
    mutationFn: (data) => api.post(`/emails/${thread.id}/reply`, data),
    onSuccess: () => {
      toast.success('Reply sent!')
      qc.invalidateQueries({ queryKey: ['thread', thread.id] })
      onClose()
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send reply.')
    },
  })

  const handleSend = () => {
    if (!to.trim()) {
      toast.error('Please provide a recipient email.')
      return
    }
    if (!body.trim()) {
      toast.error('Please write a reply.')
      return
    }

    mutation.mutate({
      to,
      body,
      subject: 'Re: ' + thread.subject,
    })
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Reply to thread
        </span>
        <button onClick={onClose} className="btn-ghost p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-6 flex-shrink-0">To</span>
          <input
            type="email"
            className="input text-sm flex-1"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com"
          />
          <button
            onClick={() => setShowCC(s => !s)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
          >
            CC <ChevronDown className={`w-3 h-3 transition-transform ${showCC ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showCC && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-6 flex-shrink-0">CC</span>
            <input
              type="text"
              className="input text-sm flex-1"
              value={cc}
              onChange={e => setCc(e.target.value)}
              placeholder="cc@example.com, ..."
            />
          </div>
        )}

        <textarea
          className="input text-sm resize-none w-full"
          rows={6}
          placeholder="Write your reply here…"
          value={body}
          onChange={e => setBody(e.target.value)}
          autoFocus
        />

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-400">
            Replying to: <span className="font-medium">{thread.subject}</span>
          </p>
          <button
            onClick={handleSend}
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
            ) : (
              <><Send className="w-4 h-4" /> Send Reply</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
