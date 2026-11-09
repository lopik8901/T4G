import React from 'react'
import { createRoot } from 'react-dom/client'
import CardMatchingGame from './CardMatchingGame'

createRoot(document.getElementById('root')!).render(<React.StrictMode><CardMatchingGame /></React.StrictMode>)
