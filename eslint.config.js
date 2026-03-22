import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
export default [
  { ignores: ['dist', 'backend'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 2020, globals: { window: true, document: true, localStorage: true, console: true, fetch: true, setTimeout: true, clearTimeout: true, setInterval: true, clearInterval: true, Promise: true, URL: true, URLSearchParams: true } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: { ...reactHooks.configs.recommended.rules, 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }] },
  },
]
