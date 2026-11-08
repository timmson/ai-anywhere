import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // На GitHub Pages проект публикуется по подпути /ai-anywhere/.
  base: command === 'build' ? '/ai-anywhere/' : '/',
  server: {
    port: 5173,
  },
}));
