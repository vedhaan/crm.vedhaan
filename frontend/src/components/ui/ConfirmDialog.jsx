import Modal from './Modal'

export default function ConfirmDialog({ title, message, confirmText = 'Delete', busy = false, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      size='sm'
      onClose={onCancel}
      footer={
        <>
          <button type='button' className='v-btn' onClick={onCancel}>Cancel</button>
          <button type='button' className='v-btn danger' onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait...' : confirmText}
          </button>
        </>
      }
    >
      <p className='v-muted'>{message}</p>
    </Modal>
  )
}