import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

export default function Modal({ title, subtitle, onClose, children, footer, tabs, size = 'md' }) {
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [])

  return createPortal(
    <div
      className='v-overlay'
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`v-modal ${size}`} role='dialog' aria-modal='true'>
        <div className='v-modal-head'>
          <div>
            <h2 className='v-modal-title'>{title}</h2>
            {subtitle && <p className='v-modal-sub'>{subtitle}</p>}
          </div>
          <button type='button' className='v-icon-btn' onClick={onClose} aria-label='Close'>
            <Icon name='x' size={18} />
          </button>
        </div>
        {tabs}
        <div className='v-modal-body'>{children}</div>
        {footer && <div className='v-modal-foot'>{footer}</div>}
      </div>
    </div>,
    document.body
  )
}