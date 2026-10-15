import { useCallback, useEffect, useRef, useState } from 'react'
import API from '../api/axios'
import Icon from './ui/Icon'
import { fileBadge, formatBytes } from './worksheet/worksheetUtils'
import { getMsg } from '../utils/format'

export default function TaskFiles({ taskId, user }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const fetchFiles = useCallback(async () => {
    try {
      const res = await API.get(`/tasks/${taskId}/files`)
      setFiles(res.data)
    } catch (e) {
      setError(getMsg(e, 'Could not load files'))
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const upload = async (list) => {
    if (!list || list.length === 0) return
    setError('')
    setUploading(true)
    const fd = new FormData()
    Array.from(list).forEach((f) => fd.append('files', f))
    try {
      await API.post(`/tasks/${taskId}/files`, fd)
      await fetchFiles()
    } catch (e) {
      setError(getMsg(e, 'Upload failed'))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (id) => {
    setDeletingId(id)
    try {
      await API.delete(`/files/${id}`)
      setFiles((prev) => prev.filter((f) => f.id !== id))
    } catch (e) {
      setError(getMsg(e, 'Delete failed'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      {error && <div className='v-alert err'>{error}</div>}

      <div
        className={`v-drop${dragOver ? ' on' : ''}`}
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files) }}
      >
        {uploading ? 'Uploading...' : <>Drop files here or <b>click to browse</b></>}
        <input ref={inputRef} type='file' multiple style={{ display: 'none' }} onChange={(e) => upload(e.target.files)} />
      </div>

      {loading ? (
        <div className='v-muted' style={{ fontSize: 12 }}>Loading files...</div>
      ) : files.length === 0 ? (
        <div className='v-muted' style={{ fontSize: 12 }}>No files attached yet.</div>
      ) : (
        <div className='v-files'>
          {files.map((f) => {
            const b = fileBadge(f.fileName)
            const canDelete = user && (user.role === 'ADMIN' || f.uploadedBy === user.id)
            return (
              <div key={f.id} className='v-file'>
                <div className={`v-fb ${b.cls}`}>{b.label}</div>
                <div className='v-file-main'>
                  <div className='v-file-name' title={f.fileName}>{f.fileName}</div>
                  <div className='v-file-meta'>
                    {formatBytes(f.fileSize)}{f.uploader ? ` · ${f.uploader.name}` : ''}
                  </div>
                </div>
                <div className='v-file-actions'>
                  <a className='v-btn sm' href={f.downloadUrl} target='_blank' rel='noopener noreferrer'>
                    <Icon name='download' size={14} />
                  </a>
                  {canDelete && (
                    <button type='button' className='v-btn sm soft-danger' disabled={deletingId === f.id} onClick={() => remove(f.id)}>
                      <Icon name='trash' size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}