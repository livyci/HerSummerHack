/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCANDIT_LICENSE_KEY?: string
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.json' {
  const value: unknown
  export default value
}
