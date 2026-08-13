import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    // "@/..." -> src/... (shadcn/ui convention).
    // fileURLToPath keeps this working on older Node than import.meta.dirname.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    rollupOptions: {
      output: {
        // ag-grid + xlsx are shared by every dashboard's
        // _shared/dashboardKit import.
        // Without this, they may be duplicated into each
        // dashboard's own lazy chunk.
        manualChunks(id) {
          if (
            id.includes('ag-grid-community') ||
            id.includes('ag-grid-react') ||
            id.includes('ag-stack') ||
            id.includes('/xlsx/')
          ) {
            return 'vendor-datagrid';
          }
        },
      },
    },
  },

  server: {
    // Allow access from all network interfaces.
    host: true,

    port: 5176,

    // Allow all hostnames/domains.
    allowedHosts: true,

    // The repo is bind-mounted into the container and dashboard
    // files are written by a different container.
    // Filesystem events don't cross those mounts, so watch by polling.
    watch: {
      usePolling: true,
      interval: 1000,
      binaryInterval: 2000,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.tsbuildinfo',
      ],
    },

    proxy: {
      // Shared /api proxy — points at the RYTAIL backend (Express + Mongo,
      // see ../Backend). Path is forwarded as-is (e.g. /api/auth/login,
      // /api/users, /api/audit-log) — no prefix stripped.
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:4040',
        changeOrigin: true,
      },
    },
  },
});