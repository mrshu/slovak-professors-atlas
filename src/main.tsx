import '@fontsource-variable/newsreader'
import '@fontsource-variable/instrument-sans'
import './styles/tokens.css'
import './styles/global.css'
import './styles/components.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Koreňový prvok aplikácie sa nenašiel.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
