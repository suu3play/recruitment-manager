import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      build: {
        sourcemap: isDev ? 'inline' : false,
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        sourcemap: isDev ? 'inline' : false,
      },
    },
    renderer: {
      resolve: {
        alias: {
          '@': resolve('src')
        }
      },
      plugins: [react()],
      root: resolve('.'),
      build: {
        sourcemap: isDev ? 'inline' : false,
        rollupOptions: {
          input: resolve('index.html')
        }
      }
    }
  }
})
