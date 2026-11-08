import { defineConfig } from 'vite'

// GitHub Pages のサブパス配信に対応するため相対パスにする
export default defineConfig({
  base: './',
})
