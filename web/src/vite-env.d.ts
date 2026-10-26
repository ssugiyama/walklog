/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  readonly NEXT_PUBLIC_GOOGLE_API_KEY?: string
  readonly NEXT_PUBLIC_GOOGLE_API_VERSION?: string
  readonly NEXT_PUBLIC_APP_VERSION?: string
  readonly NEXT_PUBLIC_DEFAULT_CENTER?: string
  readonly NEXT_PUBLIC_DEFAULT_ZOOM?: string
  readonly NEXT_PUBLIC_MAP_TYPE_IDS?: string
  readonly NEXT_PUBLIC_MAP_ID?: string
  readonly NEXT_PUBLIC_SHAPE_STYLES_JSON_URL?: string
  readonly NEXT_PUBLIC_THEME_JSON_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
