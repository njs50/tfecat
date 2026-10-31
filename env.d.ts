/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set only by preview-deploy.yml; blank in prod builds. */
  readonly VITE_PREVIEW_REF?: string
  /** Full commit SHA from github.sha; UI shows a short prefix. */
  readonly VITE_PREVIEW_SHA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
