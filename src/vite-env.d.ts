/// <reference lib="dom" />

// Minimal Vite client type replacements for environments where `vite/client`
// isn't available (e.g. node_modules not installed).

interface ImportMetaEnv {
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean

  // Allow VITE_* keys (and any other keys) without TS index-signature errors.
  readonly [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.jpeg' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}

declare module '*.gif' {
  const src: string
  export default src
}

/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: ImportMetaEnv
}
