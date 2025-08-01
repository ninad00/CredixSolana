// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import viteTsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  base: '/CredixSolana/',
  plugins: [
    react(),
    viteTsconfigPaths({
      root: resolve(__dirname),
    }),
    // Correctly configure the nodePolyfills plugin
    nodePolyfills({
      // To add support for globals like 'Buffer'
      globals: {
        Buffer: true, // This fills the Buffer global
        global: true,
        process: true,
      },
      // To add support for process.env
      protocolImports: true,
    }),
  ],
})