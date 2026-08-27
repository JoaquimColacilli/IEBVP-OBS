;(function () {
  var ov = document.getElementById('ov')
  var frame = document.querySelector('.frame')
  var el = {
    verse: document.getElementById('verse'),
    ref: document.getElementById('ref'),
    ver: document.getElementById('ver'),
    credit: document.getElementById('credit')
  }
  var OUT_MS = 300
  var SAMPLE = 'AÁEÉIÍOÓUÚÜÑñ¿?«»—0123456789'
  var FACES = [
    '400 72px Spectral',
    '400 28px "IBM Plex Sans"',
    '500 28px "IBM Plex Sans"',
    '600 28px "IBM Plex Sans"'
  ]
  var debug = location.search.indexOf('debug=1') >= 0
  var pending = null
  var swapTimer = null
  var leaveTimer = null

  function log(text) {
    if (debug) console.info('[overlay] ' + text)
  }

  function fit() {
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
    var x = Math.max(0, (window.innerWidth - 1920 * scale) / 2)
    var y = Math.max(0, (window.innerHeight - 1080 * scale) / 2)
    frame.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')'
  }

  function warm() {
    if (!document.fonts || !document.fonts.load) return
    for (var index = 0; index < FACES.length; index++) {
      document.fonts.load(FACES[index], SAMPLE)
    }
  }

  function visible() {
    return ov.classList.contains('is-visible')
  }

  function key(passage) {
    return passage ? passage.version + '|' + passage.reference + '|' + passage.html.length : ''
  }

  function render(passage) {
    var started = performance.now()
    ov.dataset.fit = passage.fit
    el.verse.innerHTML = passage.html
    el.ref.textContent = passage.reference
    el.ver.textContent = passage.version
    el.credit.textContent = passage.credit
    log('render ' + passage.reference + ' ' + (performance.now() - started).toFixed(1) + ' ms')
  }

  function stage(passage) {
    if (!passage) return
    pending = passage
    if (!visible()) flush()
  }

  function flush() {
    if (!pending) return
    var passage = pending
    pending = null
    render(passage)
  }

  function reveal() {
    if (leaveTimer) {
      clearTimeout(leaveTimer)
      leaveTimer = null
    }
    ov.classList.remove('is-leaving')
    ov.classList.add('is-visible')
    if (!debug) return
    var started = performance.now()
    requestAnimationFrame(function () {
      log('mostrar a cuadro ' + (performance.now() - started).toFixed(1) + ' ms')
    })
  }

  function revealNextFrame() {
    requestAnimationFrame(function () {
      requestAnimationFrame(reveal)
    })
  }

  function show() {
    if (!visible()) {
      if (!pending) {
        reveal()
        return
      }
      flush()
      revealNextFrame()
      return
    }
    if (!pending) return
    hide()
    if (swapTimer) clearTimeout(swapTimer)
    swapTimer = setTimeout(function () {
      swapTimer = null
      flush()
      revealNextFrame()
    }, OUT_MS)
  }

  function hide() {
    if (!visible()) return
    ov.classList.add('is-leaving')
    ov.classList.remove('is-visible')
    if (leaveTimer) clearTimeout(leaveTimer)
    leaveTimer = setTimeout(function () {
      leaveTimer = null
      ov.classList.remove('is-leaving')
    }, OUT_MS)
  }

  function apply(message) {
    if (message.type === 'estado') {
      pending = message.passage
      flush()
      if (message.visible) reveal()
      else hide()
      if (key(message.staged) !== key(message.passage)) stage(message.staged)
      return
    }
    if (message.type === 'contenido') stage(message.passage)
    if (message.type === 'mostrar') show()
    if (message.type === 'ocultar') hide()
  }

  function connect() {
    var socket = new WebSocket(
      (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'
    )
    socket.addEventListener('message', function (event) {
      try {
        apply(JSON.parse(event.data))
      } catch (error) {
        void error
      }
    })
    socket.addEventListener('close', function () {
      setTimeout(connect, 1000)
    })
    socket.addEventListener('error', function () {
      socket.close()
    })
  }

  window.addEventListener('resize', fit)
  fit()
  warm()
  connect()
})()
