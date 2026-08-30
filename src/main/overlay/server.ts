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
let staged: Passage | null = null
let shown: Passage | null = null
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

interface Built {
  http: Server
  sockets: WebSocketServer
}

function build(current: OverlayPaths): Built {
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
  http.on('error', (cause) => {
    void cause
  })
  const wss = new WebSocketServer({ server: http, path: '/ws' })
  wss.on('error', (cause) => {
    void cause
  })
  wss.on('connection', (socket) => {
    socket.send(
      JSON.stringify({
        type: 'estado',
        passage: visible ? shown : staged,
        staged,
        visible
      } satisfies OverlayMessage)
    )
    socket.on('close', emit)
    emit()
  })
  return { http, sockets: wss }
}

function bind(http: Server, candidate: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (cause: NodeJS.ErrnoException): void => {
      http.removeListener('listening', onListening)
      reject(cause)
    }
    const onListening = (): void => {
      http.removeListener('error', onError)
      resolve()
    }
    http.once('error', onError)
    http.once('listening', onListening)
    http.listen(candidate, HOST)
  })
}

async function discard(built: Built): Promise<void> {
  for (const client of built.sockets.clients) client.terminate()
  await new Promise<void>((resolve) => built.sockets.close(() => resolve()))
  if (built.http.listening) {
    await new Promise<void>((resolve) => built.http.close(() => resolve()))
  }
}

export async function startOverlayServer(
  next: OverlayPaths,
  desired: number
): Promise<OverlayState> {
  await stopOverlayServer()
  port = 0
  error = null
  for (let attempt = 0; attempt <= PORT_ATTEMPTS; attempt++) {
    const candidate = desired + attempt
    const built = build(next)
    try {
      await bind(built.http, candidate)
      server = built.http
      sockets = built.sockets
      port = candidate
      error = null
      break
    } catch (cause) {
      await discard(built)
      error = cause instanceof Error ? cause.message : String(cause)
      if ((cause as NodeJS.ErrnoException).code !== 'EADDRINUSE') break
    }
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

function same(one: Passage | null, other: Passage): boolean {
  return (
    one !== null &&
    one.reference === other.reference &&
    one.version === other.version &&
    one.html === other.html
  )
}

export function setOverlayContent(passage: Passage): boolean {
  if (same(staged, passage)) return false
  staged = passage
  if (!visible) shown = passage
  send({ type: 'contenido', passage })
  return true
}

export function showOverlay(): void {
  visible = true
  shown = staged ?? shown
  send({ type: 'mostrar' })
}

export function hideOverlay(): void {
  visible = false
  send({ type: 'ocultar' })
}
