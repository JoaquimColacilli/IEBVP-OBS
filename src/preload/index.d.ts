import type { VersiculosApi } from '@shared/api'

declare global {
  interface Window {
    versiculos: VersiculosApi
  }
}

export {}
