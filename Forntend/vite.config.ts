import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()], 
  server: {
    port: 7057, // You can change the port if needed
    open: true, // Opens the browser on server start
    host: '192.168.10.14', // Or '192.168.10.165' to listen on all addresses
  }
})
