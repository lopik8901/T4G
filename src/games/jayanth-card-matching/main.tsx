import React from 'react'
import { createRoot } from 'react-dom/client'
import CardMatchingGame from './CardMatchingGame'

const initialLevel=new URLSearchParams(location.search).get('level')==='memory'||location.pathname.startsWith('/demos/memory-peek')?'memory':'direct'
createRoot(document.getElementById('root')!).render(<React.StrictMode><CardMatchingGame initialLevel={initialLevel}/></React.StrictMode>)
