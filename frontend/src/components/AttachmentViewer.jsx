import { useState } from 'react'
import api from '../services/api.js'
import { Paperclip, Download, FileText, Image, Film, Archive, File } from 'lucide-react'
import toast from 'react-hot-toast'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getIcon(mimeType = '') {
  if (mimeType.startsWith('image/'))  return Image
  if (mimeType.startsWith('video/'))  return Film
  if (mimeType.includes('pdf'))       return FileText
  if (mimeType.includes('zip') || mimeType.includes('rar')) return Archive
  return File
}

export default function AttachmentViewer({ attachments }) {
  const [downloading, setDownloading] = useState(null)

  const handleDownload = async (attachment) => {
    setDownloading(attachment.id)
    try {
      const res = await api.get(`/emails/attachment/${attachment.id}`, {
        responseType: 'blob',
      })
      const url    = window.URL.createObjectURL(new Blob([res.data]))
      const link   = document.createElement('a')
      link.href    = url
      link.download = attachment.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download attachment.')
    } finally {
      setDownloading(null)
    }
  }

  if (!attachments?.length) return null

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
        <Paperclip className="w-3.5 h-3.5" />
        <span>{attachments.length} attachment{attachments.length > 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {attachments.map(att => {
          const Icon = getIcon(att.mime_type)
          const isDown = downloading === att.id

          return (
            <button
              key={att.id}
              onClick={() => handleDownload(att)}
              disabled={isDown}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                         hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group text-left
                         disabled:opacity-60 max-w-[200px]"
            >
              <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">
                  {att.filename}
                </p>
                <p className="text-xs text-gray-400">{formatBytes(att.size)}</p>
              </div>
              <Download className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-500 flex-shrink-0 transition-colors" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
