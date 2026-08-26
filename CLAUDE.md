# CLAUDE.md

## Stack

Electron + electron-vite (main / preload / renderer), React + TypeScript en el renderer.
`obs-websocket-js`, `express` + `ws`, `electron-store` y `bible-passage-reference-parser` viven en el proceso main.
Biblias en JSON embebido (`resources/bibles/`), sin módulos nativos.

## Scripts

| Comando                           | Qué hace                                                     |
| --------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                     | app en desarrollo con HMR                                    |
| `npm run build`                   | typecheck + build de los tres procesos                       |
| `npm run typecheck`               | `tsc` sobre node y web                                       |
| `npm run lint` / `npm run format` | eslint / prettier                                            |
| `node scripts/build-bibles.mjs`   | baja y normaliza las biblias a `resources/bibles/`           |
| `node scripts/build-fonts.mjs`    | baja los `.woff2` a `resources/fonts/`                       |
| `node scripts/sync-design.mjs`    | copia `design-reference/tokens.css` a `resources/tokens.css` |

## design-reference/

Es la fuente de verdad visual y **no se modifica**. Cualquier cambio de estilo sale de ahí:
`tokens.css` se copia tal cual, el CSS de componentes está unificado en
`src/renderer/src/styles/app.css` y el overlay de producción vive en `resources/overlay/`.
`design-reference/` y `resources/bibles/` están en `.prettierignore`: no se formatean.

## Git

- Siempre con la cuenta **JoaquimColacilli**. Los commits salen solo a su nombre: nunca
  `Co-Authored-By` ni menciones a Claude en el mensaje ni en la metadata.
- Commits de una línea, en español, en minúscula, cortos y atómicos.
- `git add` por rutas explícitas. Nunca `git add .` ni `-A`.
- Push directo a `main`. No hay PRs en este repo: no se crean `PR-BODY.md` ni archivos similares.

## Código

Sin comentarios: el código va limpio y las explicaciones al `README.md`.

## Esta máquina

- No hay `rg`. Buscar con `grep`, `git grep` o `cat`.
- Hay un `GH_TOKEN` de otro proyecto en el environment: no usar `gh`. Git puro con el
  credential manager de Windows.
- El entorno del editor exporta `ELECTRON_RUN_AS_NODE=1`, que rompe `npm run dev`
  (Electron arranca como Node y `require('electron')` no devuelve la API). En una terminal
  normal no pasa; si pasa, hay que limpiar esa variable antes de arrancar.
