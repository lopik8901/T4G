import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/nunito-sans/latin-400.css'
import '@fontsource/nunito-sans/latin-600.css'
import '@fontsource/nunito-sans/latin-700.css'
import '@fontsource/nunito-sans/latin-800.css'
import '@fontsource/fraunces/latin-500.css'
import './styles.css'
const App = lazy(() => import('./App'))
const Studio = lazy(() => import('./studio/Studio'))

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Suspense fallback={<p role="status" style={{ padding: 40 }}>Opening your play space…</p>}>{location.pathname === '/balloon' ? <App /> : <Studio />}</Suspense></React.StrictMode>)
