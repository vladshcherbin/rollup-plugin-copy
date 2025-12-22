import config from '@shcherbin/eslint-config-node'
import { defineConfig } from 'eslint/config'

export default defineConfig({
  extends: config,
  rules: {
    'no-await-in-loop': 'off'
  }
})
