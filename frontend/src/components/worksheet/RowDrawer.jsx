import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import API from '../../api/axios'
import {
  MAX_CARRIES, MAX_FILE_MB, MAX_FILES_PER_ROW, ACCEPT, downloadWorksheetFile, fileBadge,
  formatBytes, getApiError, isAllowedFile, proofLinks
} from './worksheetUtils'

export default function RowDrawer({
  entry, isAdmin, ownerIsAdmin, canUpload, canEditProof, canEditExec, canDeleteFile,
  onPatch, onChanged, onClose, flash
}) {
  const [proof, setProof] = useState(entry.proof || '')
  const [savingProof, setSavingProof] = useState(false)
  const [reason, setReason] = useState(entry.carryReason || '')
  const [carrying, setCarrying] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const inputRef = useRef(null)
  const links = proofLinks(proof)
  const proofDirty = proof.trim() !== (entry.proof || '')
  const canCarry = canEditExec && entry.status !== 'DONE'
  const carriesLeft = MAX_CARRIES - (entry.carryCount || 0)

  const upload = async (list) => {
    const files = Array.from(list || [])
    if (!files.length) return
    if (files.length > 5) return flash('error', 'Upload at most 5 files at a time')
    if (entry.files.length + files.length > MAX_FILES_PER_ROW) {
      return flash('error', `A row can hold at most ${MAX_FILES_PER_ROW} files`)
    }
    for (const f of files) {
      if (!isAllowedFile(f.name)) return flash('error', `"${f.name}" has a file type that is not allowed`)
      if (f.size > MAX_FILE_MB * 1024 * 1024) return flash('error', `"${f.name}" is larger than ${MAX_FILE_MB} MB`)
    }
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    setUploading(0)
    try {
      await API.post(`/worksheet/entries/${entry.id}/files`, fd, {
        onUploadProgress: (p) => p.total && setUploading(Math.round((p.loaded / p.total) * 100))
      })
      await onChanged()
    } catch (e) {
      flash('error', getApiError(e, 'Upload failed'))
      if (e.response && e.response.status === 403) onChanged()
    } finally {
      setUploading(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (f) => {
    if (!window.confirm(`Delete "${f.fileName}"?`)) return
    setBusyId(f.id)
    try {
      await API.delete(`/worksheet/files/${f.id}`)
      await onChanged()
    } catch (e) {
      flash('error', getApiError(e, 'Delete failed'))
      onChanged()
    } finally {
      setBusyId(null)
    }
  }

  const download = async (f) => {
    setBusyId(f.id)
    try {
      await downloadWorksheetFile(f.id)
    } catch (e) {
      flash('error', getApiError(e, 'Download failed'))
    } finally {
      setBusyId(null)
    }
  }

  const saveProof = async () => {
    setSavingProof(true)
    await onPatch(entry, 'proof', proof)
    setSavingProof(false)
  }

  const carry = async (on) => {
    setCarrying(true)
    const ok = await onPatch(entry, on ? { carryForward: true, carryReason: reason } : { carryForward: false })
    setCarrying(false)
    if (ok && !on) setReason('')
  }

  return createPortal(
    <div className='ws-dr-ov' onClick={onClose}>
      <div className='ws-dr' onClick={(e) => e.stopPropagation()}>
        <div className='ws-dr-head'>
          <div>
            <div className='ws-dr-title'>{entry.title}</div>
            <div className='ws-dr-sub'>
              {entry.taskType ? `${entry.taskType} · ` : ''}{entry.client || 'No client'} · {entry.doneCount}/{entry.targetCount ?? '-'} done
            </div>
          </div>
          <button className='ws-x' onClick={onClose}>×</button>
        </div>

        <div className='ws-dr-body'>
          {(entry.isAssigned || entry.carriedFromId) && (
            <div className='ws-banner'>
              {entry.isAssigned && 'Assigned by admin. '}
              {entry.carriedFromId && `Carried forward from an earlier day (carry ${entry.carryCount} of ${MAX_CARRIES}).`}
            </div>
          )}

          {isAdmin && ownerIsAdmin && (
            <div className='ws-sec'>
              <label className='ws-switch'>
                <input
                  type='checkbox'
                  checked={!!entry.isShared}
                  onChange={(e) => onPatch(entry, 'isShared', e.target.checked)}
                />
                Share this row and its files with staff
              </label>
            </div>
          )}

          <div className='ws-sec'>
            <div className='ws-sec-t'>
              <span>Files</span>
              <span>{entry.files.length}/{MAX_FILES_PER_ROW}</span>
            </div>

            {canUpload && (
              <div
                className={`ws-drop ${dragOver ? 'on' : ''}`}
                onClick={() => inputRef.current && inputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files) }}
              >
                Drop files here or <b>click to browse</b>
                <div className='ws-hint' style={{ margin: '4px 0 0' }}>
                  Docs, sheets, slides, PDF, images, ZIP. Max {MAX_FILE_MB} MB each.
                </div>
                <input
                  ref={inputRef}
                  type='file'
                  multiple
                  accept={ACCEPT}
                  style={{ display: 'none' }}
                  onChange={(e) => upload(e.target.files)}
                />
                {uploading !== null && (
                  <div className='ws-upbar'><i style={{ width: `${uploading}%` }} /></div>
                )}
              </div>
            )}

            <div className='ws-files'>
              {entry.files.length === 0 && <div className='ws-hint'>No files attached.</div>}
              {entry.files.map((f) => {
                const b = fileBadge(f.fileName)
                return (
                  <div key={f.id} className='ws-file'>
                    <div className={`ws-fb ${b.cls}`}>{b.label}</div>
                    <div className='ws-fi'>
                      <div className='ws-fn' title={f.fileName}>{f.fileName}</div>
                      <div className='ws-fm'>
                        {formatBytes(f.fileSize)} · {f.uploaderName}
                        {f.byAdmin && <span className='ws-admin-tag'>ADMIN</span>}
                      </div>
                    </div>
                    <div className='ws-fa'>
                      <button className='ws-btn small' disabled={busyId === f.id} onClick={() => download(f)}>Download</button>
                      {canDeleteFile(f) && (
                        <button className='ws-del' disabled={busyId === f.id} onClick={() => remove(f)}>Delete</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className='ws-sec'>
            <div className='ws-sec-t'>
              <span>Proof links</span>
              <span>{links.length} link{links.length !== 1 ? 's' : ''}</span>
            </div>
            <textarea
              className='ws-textarea'
              value={proof}
              readOnly={!canEditProof}
              maxLength={20000}
              onChange={(e) => setProof(e.target.value)}
              placeholder='One link per line'
            />
            {canEditProof && (
              <div className='ws-modal-actions'>
                <button className='ws-btn primary' disabled={!proofDirty || savingProof} onClick={saveProof}>
                  {savingProof ? 'Saving...' : 'Save proof'}
                </button>
              </div>
            )}
          </div>

          {(entry.carryForward || canCarry) && (
            <div className='ws-sec'>
              <div className='ws-sec-t'>
                <span>Carry forward</span>
                <span>{entry.carryCount || 0}/{MAX_CARRIES} used</span>
              </div>
              {entry.carryForward ? (
                <>
                  <div className='ws-banner'>
                    Marked to carry forward to the next working day. Reason: {entry.carryReason}
                  </div>
                  {canEditExec && (
                    <button className='ws-btn' disabled={carrying} onClick={() => carry(false)}>Undo carry forward</button>
                  )}
                </>
              ) : (
                <>
                  <textarea
                    className='ws-textarea'
                    style={{ minHeight: 70 }}
                    maxLength={300}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder='Why could this not be finished today?'
                  />
                  {carriesLeft <= 0 && (
                    <div className='ws-hint'>This work was already carried forward {MAX_CARRIES} times. Finish it or ask admin.</div>
                  )}
                  <div className='ws-modal-actions'>
                    <button
                      className='ws-btn'
                      disabled={carrying || reason.trim().length < 3 || carriesLeft <= 0}
                      onClick={() => carry(true)}
                    >
                      {carrying ? 'Saving...' : 'Carry forward to next day'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}