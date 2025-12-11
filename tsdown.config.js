import { defineConfig } from 'tsdown'

export default defineConfig({
  exports: true,
  inputOptions: {
    experimental: {
      attachDebugInfo: 'none'
    }
  }
})
