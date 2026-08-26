(function () {
  var ov = document.getElementById('ov')
  var frame = document.querySelector('.frame')
  var el = {
    verse: document.getElementById('verse'),
    ref: document.getElementById('ref'),
    ver: document.getElementById('ver'),
    credit: document.getElementById('credit')
  }
  var OUT_MS = 300

  function fit() {
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
    var x = Math.max(0, (window.innerWidth - 1920 * scale) / 2)
    var y = Math.max(0, (window.innerHeight - 1080 * scale) / 2)
    frame.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')'
  }

  function content(passage) {
    if (!passage) return
    ov.dataset.fit = passage.fit
    el.verse.innerHTML = passage.html
    el.ref.textContent = passage.reference
    el.ver.textContent = passage.version
    el.credit.textContent = passage.credit
  }

  function show() {
    void ov.offsetWidth
    ov.classList.add('is-visible')
  }

  function hide() {
    if (!ov.classList.contains('is-visible')) return
    ov.classList.add('is-leaving')
    ov.classList.remove('is-visible')
    setTimeout(function () {
      ov.classList.remove('is-leaving')
    }, OUT_MS)
  }

  function apply(message) {
    if (message.type === 'estado') {
      content(message.passage)
      if (message.visible) show()
      else hide()
      return
    }
    if (message.type === 'contenido') content(message.passage)
    if (message.type === 'mostrar') show()
    if (message.type === 'ocultar') hide()
  }

  function connect() {
    var socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws')
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
  connect()
})()
