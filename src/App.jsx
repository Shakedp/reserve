import React, { useState, useEffect } from 'react'
import Home from './pages/Home'
import Admin from './pages/Admin'

function getPathSegment() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  let pathname = window.location.pathname
  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length)
  }
  const parts = pathname.split('/').filter(Boolean)
  return parts[0] || ''
}

function App() {
  const [segment, setSegment] = useState(getPathSegment())

  useEffect(() => {
    const onPopState = () => setSegment(getPathSegment())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (segment === 'admin') return <Admin />
  return <Home />
}

export default App
