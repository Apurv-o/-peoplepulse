import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Dynamically locate the exact existing 3D video file in project root
const files = fs.readdirSync(__dirname);
const videoFile = files.find(f => f.startsWith('PeoplePulse_3D_Background_Video') && f.endsWith('.mp4')) || 'PeoplePulse_3D_Background_Video_\u2026_202609040215.mp4';
const videoFullPath = path.resolve(__dirname, videoFile);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@video': videoFullPath,
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
