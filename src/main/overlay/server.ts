import { createServer, type Server } from 'node:http'
import { join } from 'node:path'
import express from 'express'
import { WebSocketServer } from 'ws'
import type { OverlayMessage, OverlayState, Passage } from '@shared/types'

const HOST = '127.0.0.1'
const PORT_ATTEMPTS = 10

export interface OverlayPaths {
  overlayDir: string
  fontsDir: string
  tokensFile: string
}

let server: Server | null = null
let sockets: WebSocketServer | null = null
let port = 0
let error: string | null = null
let content: Passage | null = null
let visible = false

const listeners = new Set<(state: OverlayState) => void>()

export function overlayState(): OverlayState {
  return {
    running: Boolean(server?.listening),
    port,
    url: port ? `http://localhost:${port}/overlay.html?live=1` : '',
    clients: sockets ? sockets.clients.size : 0,
    error
  }
}

export function onOverlayState(listener: (state: OverlayState) => void): void {
  listeners.add(listener)
}

function emit(): void {
  const state = overlayState()
  for (const listener of listeners) listener(state)
}

function send(message: OverlayMessage): void {
  const raw = JSON.stringify(message)
  for (const client of sockets?.clients ?? []) {
    if (client.readyState === client.OPEN) client.send(raw)
  }
}

function build(current: OverlayPaths): Server {
  const app = express()
  app.disable('x-powered-by')
  app.get('/', (_request, response) => {
    response.redirect('/overlay.html')
  })
  app.get('/overlay', (_request, response) => {
    response.sendFile(join(current.overlayDir, 'overlay.html'))
  })
  app.get('/tokens.css', (_request, response) => {
    response.sendFile(current.tokensFile)
  })
  app.use('/fonts', express.static(current.fontsDir))
  app.use(express.static(current.overlayDir))

  const http = createServer(app)
  const wss = new WebSocketServer({ server: http, path: '/ws' })
  wss.on('connection', (socket) => {
    socket.send(
      JSON.stringify({ type: 'estado', passage: content, visible } satisfies OverlayMessage)
    )
    socket.on('close', emit)
    emit()
  })
  sockets = wss
  return http
}

function listen(http: Server, from: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempt = 0
    const tryPort = (candidate: number): void => {
      const onError = (cause: NodeJS.ErrnoException): void => {
        http.removeListener('error', onError)
        if (cause.code === 'EADDRINUSE' && attempt < PORT_ATTEMPTS) {
          attempt++
          tryPort(candidate + 1)
          return
        }
        reject(cause)
      }
      http.once('error', onError)
      http.listen(candidate, HOST, () => {
        http.removeListener('error', onError)
        resolve(candidate)
      })
    }
    tryPort(from)
  })
}

export async function startOverlayServer(
  next: OverlayPaths,
  desired: number
): Promise<OverlayState> {
  await stopOverlayServer()
  const http = build(next)
  try {
    port = await listen(http, desired)
    server = http
    error = null
  } catch (cause) {
    server = null
    sockets = null
    port = 0
    error = cause instanceof Error ? cause.message : String(cause)
  }
  emit()
  return overlayState()
}

export async function stopOverlayServer(): Promise<void> {
  const current = server
  const currentSockets = sockets
  server = null
  sockets = null
  if (currentSockets) {
    for (const client of currentSockets.clients) client.terminate()
    await new Promise<void>((resolve) => currentSockets.close(() => resolve()))
  }
  if (current) await new Promise<void>((resolve) => current.close(() => resolve()))
}

export function setOverlayContent(passage: Passage): void {
  content = passage
  send({ type: 'contenido', passage })
}

export function showOverlay(): void {
  visible = true
  send({ type: 'mostrar' })
}

export function hideOverlay(): void {
  visible = false
  send({ type: 'ocultar' })
}
