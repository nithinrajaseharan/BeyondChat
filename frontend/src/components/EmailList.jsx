import { formatDistanceToNow } from 'date-fns'
import { Star, Paperclip, Loader2 } from 'lucide-react'

const CATEGORY_DOT = {
  urgent:      'bg-red-500',
  promotional: 'bg-amber-400',
  social:      'bg-blue-400',
  general:     'bg-gray-300 dark:bg-gray-600',
}

function ThreadRow({ thread, selected, onClick }) {
  const initial = (thread.from_name || thread.from_email || '?')[0].toUpperCase()
  const timeAgo = thread.last_message_at
    ? formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })
    : ''

  return (
    <button
      onClick={() => onClick(thread.id)}
      className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors ${
        selected
          ? 'bg-brand-50 dark:bg-brand-950/30 border-r-2 border-brand-500'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm
        ${selected ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {!thread.is_read && (
              <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0" />
            )}
            <p className={`text-sm truncate ${!thread.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              {thread.from_name || thread.from_email || 'Unknown'}
            </p>
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>
        </div>

        <p className={`text-xs truncate mt-0.5 ${!thread.is_read ? 'font-medium text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
          {thread.subject || '(No subject)'}
        </p>

        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
          {thread.snippet}
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_DOT[thread.category] || CATEGORY_DOT.general}`} title={thread.category} />
          {thread.message_count > 1 && (
            <span className="text-xs text-gray-400">{thread.message_count}</span>
          )}
          {thread.is_starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
          {thread.has_attachments && <Paperclip className="w-3 h-3 text-gray-400" />}
        </div>
      </div>
    </button>
  )
}

export default function EmailList({ threads, loading, selectedId, onSelect }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!threads.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-600 text-sm gap-2">
        <p>No emails found</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
      {threads.map(thread => (
        <li key={thread.id}>
          <ThreadRow
            thread={thread}
            selected={selectedId === thread.id}
            onClick={onSelect}
          />
        </li>
      ))}
    </ul>
  )
}
