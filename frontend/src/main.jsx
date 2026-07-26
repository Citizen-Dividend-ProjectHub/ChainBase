import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WEB3AUTH_NETWORK } from '@web3auth/modal'
import { Web3AuthProvider } from '@web3auth/modal/react'
import { WagmiProvider } from '@web3auth/modal/react/wagmi'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID

const tree = (
  <BrowserRouter>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </BrowserRouter>
)

// Embedded wallet provisioning (MetaMask Embedded Wallets / Web3Auth) is
// entirely optional — with no client ID configured, the app renders exactly
// as before and WalletSetupGate falls back to "connect an existing wallet."
const root = clientId ? (
  <Web3AuthProvider
    config={{
      web3AuthOptions: {
        clientId,
        web3AuthNetwork:
          WEB3AUTH_NETWORK[import.meta.env.VITE_WEB3AUTH_NETWORK?.toUpperCase()] ||
          WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
      },
    }}
  >
    <QueryClientProvider client={new QueryClient()}>
      <WagmiProvider>{tree}</WagmiProvider>
    </QueryClientProvider>
  </Web3AuthProvider>
) : (
  tree
)

ReactDOM.createRoot(document.getElementById('root')).render(root)
