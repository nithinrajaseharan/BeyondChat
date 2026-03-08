import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api.js'
import DOMPurify from 'dompurify'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Star, ChevronDown, ChevronUp, Loader2,
  Paperclip, Download, Reply, User,
} from 'lucide-react'
import ReplyBox from './ReplyBox.jsx'
import AttachmentViewer from './AttachmentViewer.jsx'

const CATEGORY_BADGE = {
  urgent:      'badge-urgent',
  promotional: 'badge-promotional',
  social:      'badge-social',
  general:     'badge-general',
}

const STATUS_STYLE = {
  open:        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  resolved:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

function EmailMessage({ email, isLast, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  const sanitizedHtml = email.body_html
    ? DOMPurify.sanitize(email.body_html, {
        ADD_TAGS: ['style'],
        FORCE_BODY: true,
        ALLOW_UNKNOWN_PROTOCOLS: false,
      })
    : null

  const dateStr = email.date
    ? format(new Date(email.date), 'MMM d, yyyy · h:mm a')
    : ''

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-300 font-semibold text-sm flex-shrink-0 mt-0.5">
          {(email.from_name || email.from_email || '?')[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                {email.from_name || email.from_email}
              </span>
              {email.from_name && (
                <span className="text-xs text-gray-400 ml-2">&lt;{email.from_email}&gt;</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {email.attachments?.length > 0 && <Paperclip className="w-3.5 h-3.5 text-gray-400" />}
              <span className="text-xs text-gray-400">{dateStr}</span>
              {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </div>

          {!open && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {email.body_plain?.slice(0, 120) || email.body_html?.replace(/<[^>]+>/g, '').slice(0, 120)}
            </p>
          )}

          {open && email.to_recipients?.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="text-gray-400">To: </span>
              {email.to_recipients.map(r => r.name || r.email).join(', ')}
            </p>
          )}
          {open && email.cc_recipients?.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="text-gray-400">CC: </span>
              {email.cc_recipients.map(r => r.name || r.email).join(', ')}
            </p>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="ml-12">
            {sanitizedHtml ? (
              <div
                className="email-body overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            ) : (
              <pre className="email-body whitespace-pre-wrap font-sans">
                {email.body_plain || '(No content)'}
              </pre>
            )}

            {email.attachments?.length > 0 && (
              <AttachmentViewer attachments={email.attachments} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmailThread({ threadId, onBack }) {
  const [showReply, setShowReply] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['thread', threadId],
    queryFn:  () => api.get(`/emails/${threadId}`).then(r => r.data),
  })

  useEffect(() => {
    if (!threadId) return
    // Optimistically mark this thread as read in every cached thread list
    // so the unread dot disappears immediately without waiting for a refetch
    qc.setQueriesData({ queryKey: ['threads'] }, (old) => {
      if (!old?.data) return old
      return { ...old, data: old.data.map(t => t.id === threadId ? { ...t, is_read: true } : t) }
    })
    qc.setQueriesData({ queryKey: ['threads-preview'] }, (old) => {
      if (!old?.data) return old
      return { ...old, data: old.data.map(t => t.id === threadId ? { ...t, is_read: true } : t) }
    })
  }, [threadId, qc])

  const starMutation = useMutation({
    mutationFn: () => api.patch(`/emails/${threadId}/star`),
    onSuccess:  (res) => {
      qc.setQueryData(['thread', threadId], (old) =>
        old ? { ...old, thread: { ...old.thread, is_starred: res.data.is_starred } } : old
      )
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status) => api.patch(`/emails/${threadId}/status`, { status }),
    onSuccess: (res) => {
      qc.setQueryData(['thread', threadId], (old) =>
        old ? { ...old, thread: { ...old.thread, status: res.data.status } } : old
      )
      qc.setQueriesData({ queryKey: ['threads'] }, (old) => {
        if (!old?.data) return old
        return { ...old, data: old.data.map(t => t.id === threadId ? { ...t, status: res.data.status } : t) }
      })
    },
  })

  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'r') { e.preventDefault(); setShowReply(s => !s) }
      if (e.key === 's') { e.preventDefault(); starMutation.mutate() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [starMutation])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  const thread = data?.thread
  if (!thread) return null

  const categoryClass = CATEGORY_BADGE[thread.category] || CATEGORY_BADGE.general

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex items-start gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex-wrap">
        <button onClick={onBack} className="btn-ghost md:hidden -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {thread.subject || '(No subject)'}
            </h2>
            <span className={`badge ${categoryClass} capitalize flex-shrink-0`}>
              {thread.category}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
            <span>{thread.message_count} {thread.message_count === 1 ? 'message' : 'messages'}</span>
            {thread.participants?.length > 0 && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {thread.participants.slice(0, 3).map(p => p.name || p.email).join(', ')}
                {thread.participants.length > 3 && ` +${thread.participants.length - 3}`}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={thread.status || 'open'}
            onChange={e => statusMutation.mutate(e.target.value)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer outline-none border-0 ${STATUS_STYLE[thread.status || 'open']}`}
            title="Thread status"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <button
            onClick={() => starMutation.mutate()}
            className="btn-ghost"
            title={thread.is_starred ? 'Unstar (S)' : 'Star (S)'}
          >
            <Star className={`w-5 h-5 ${thread.is_starred ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
          </button>
          <button
            onClick={() => setShowReply(r => !r)}
            className="btn-primary"
          >
            <Reply className="w-4 h-4" /> Reply
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {thread.emails.map((email, i) => (
          <EmailMessage
            key={email.id}
            email={email}
            isLast={i === thread.emails.length - 1}
            defaultOpen={i === thread.emails.length - 1}
          />
        ))}
      </div>

      {showReply && (
        <ReplyBox
          thread={thread}
          onClose={() => setShowReply(false)}
        />
      )}
    </div>
  )
}
