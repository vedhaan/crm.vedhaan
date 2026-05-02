import { useEffect, useState } from 'react'

const PageWrapper = ({ children }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
  }, [])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(6px)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
      willChange: 'opacity, transform'
    }}>
      {children}
    </div>
  )
}

export default PageWrapper