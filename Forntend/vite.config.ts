import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()], 
  // server: {
  //   port: 3000, // You can change the port if needed
  //   open: true, // Opens the browser on server start
  //   host: '0.0.0.0', // Or '192.168.10.165' to listen on all addresses
  // }
})
