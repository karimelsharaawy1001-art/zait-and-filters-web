import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { FilterProvider } from './context/FilterContext.jsx'

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AuthProvider>
        <CartProvider>
          <FilterProvider>
            <App />
          </FilterProvider>
        </CartProvider>
      </AuthProvider>
    </StrictMode>,
  )
} catch (error) {
  document.body.innerHTML = `
    <div style="color: red; padding: 20px; font-family: sans-serif;">
      <h1>Application Crash</h1>
      <p>Failed to initialize application.</p>
      <pre>${error.toString()}</pre>
    </div>
  `;
  console.error("CRITICAL INIT ERROR:", error);
}
