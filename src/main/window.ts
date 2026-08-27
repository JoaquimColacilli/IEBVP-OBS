import type { BrowserWindow } from 'electron'

export const NORMAL_MIN = { width: 360, height: 240 }
export const COMPACT_MIN = { width: 320, height: 190 }
export const COMPACT_SIZE = { width: 420, height: 244 }

const previous = new WeakMap<BrowserWindow, Electron.Rectangle>()

export function setCompact(window: BrowserWindow, on: boolean): void {
  if (on) {
    if (window.isMaximized()) window.unmaximize()
    const bounds = window.getBounds()
    if (!previous.has(window)) previous.set(window, bounds)
    window.setMinimumSize(COMPACT_MIN.width, COMPACT_MIN.height)
    window.setBounds({
      x: bounds.x + Math.max(0, bounds.width - COMPACT_SIZE.width),
      y: bounds.y,
      width: COMPACT_SIZE.width,
      height: COMPACT_SIZE.height
    })
    return
  }
  window.setMinimumSize(NORMAL_MIN.width, NORMAL_MIN.height)
  const restore = previous.get(window)
  previous.delete(window)
  if (restore) window.setBounds(restore)
}
