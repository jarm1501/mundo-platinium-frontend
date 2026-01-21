import React, { useEffect, useMemo, useRef, useState } from 'react'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function safeGet(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export default function NotesDock({ authed, usuario }) {
  const userKey = String(usuario || '').trim()
  const notesKey = useMemo(() => (authed && userKey ? `mp2_notes_session:${userKey}` : ''), [authed, userKey])
  const stateKey = useMemo(() => (authed && userKey ? `mp2_notes_session_ui:${userKey}` : ''), [authed, userKey])

  const handleRef = useRef(null)
  const panelRef = useRef(null)
  const dragRef = useRef({ active: false, dx: 0, dy: 0, pointerId: null, startX: 0, startY: 0, moved: false })
  const clickBlockRef = useRef(false)

  const [notes, setNotes] = useState('')
  const [ui, setUi] = useState({
    open: false,
    edge: 'right', // left|right|top|bottom|float
    x: 0,
    y: 160
  })

  // Load per-session state
  useEffect(() => {
    if (!authed || !userKey) {
      setNotes('')
      setUi({ open: false, edge: 'right', x: 0, y: 160 })
      return
    }

    // Notes text
    try {
      const saved = notesKey && !notesKey.endsWith(':') ? sessionStorage.getItem(notesKey) : ''
      setNotes(saved || '')
    } catch {
      setNotes('')
    }

    // UI state
    const def = { open: false, edge: 'right', x: 0, y: 160 }
    const loaded = stateKey ? safeGet(stateKey, def) : def
    setUi({ ...def, ...(loaded || {}) })
  }, [authed, userKey, notesKey, stateKey])

  function updateNotes(value) {
    setNotes(value)
    try {
      if (!notesKey || notesKey.endsWith(':')) return
      sessionStorage.setItem(notesKey, value)
    } catch {
      // ignore
    }
  }

  function persistUi(nextOrUpdater) {
    setUi((prev) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater
      if (stateKey) safeSet(stateKey, next)
      return next
    })
  }

  function getHandleRect() {
    const el = handleRef.current
    if (!el) return { w: 76, h: 40 }
    const r = el.getBoundingClientRect()
    return { w: r.width || 76, h: r.height || 40 }
  }

  function getPanelRect() {
    const el = panelRef.current
    if (!el) return { w: 360, h: 320 }
    const r = el.getBoundingClientRect()
    return { w: r.width || 360, h: r.height || 320 }
  }

  function snapToEdges(next) {
    const { w, h } = getHandleRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const snap = 18
    const inset = 12

    const x = clamp(next.x, inset, Math.max(inset, vw - w - inset))
    const y = clamp(next.y, inset, Math.max(inset, vh - h - inset))

    const nearLeft = x <= snap
    const nearRight = x >= vw - w - snap
    const nearTop = y <= snap
    const nearBottom = y >= vh - h - snap

    let edge = 'float'
    if (nearLeft) edge = 'left'
    else if (nearRight) edge = 'right'
    else if (nearTop) edge = 'top'
    else if (nearBottom) edge = 'bottom'

    // When snapped, pin into the edge with inset
    if (edge === 'left') return { ...next, edge, x: inset, y }
    if (edge === 'right') return { ...next, edge, x: vw - w - inset, y }
    if (edge === 'top') return { ...next, edge, x, y: inset }
    if (edge === 'bottom') return { ...next, edge, x, y: vh - h - inset }
    return { ...next, edge, x, y }
  }

  function startDrag(e, { allowFromButton = false } = {}) {
    if (!authed) return
    const el = handleRef.current
    if (!el) return

    // Si se hace click en un botón (minimizar), no iniciar drag.
    if (!allowFromButton) {
      try {
        if (e?.target?.closest && e.target.closest('button')) return
      } catch {
        // ignore
      }
    }

    const r = el.getBoundingClientRect()
    dragRef.current = {
      active: true,
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  function onPointerDown(e) {
    startDrag(e, { allowFromButton: true })
  }

  function onPointerMove(e) {
    if (!dragRef.current.active) return
    const { w, h } = getHandleRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const inset = 12

    const x = clamp(e.clientX - dragRef.current.dx, inset, Math.max(inset, vw - w - inset))
    const y = clamp(e.clientY - dragRef.current.dy, inset, Math.max(inset, vh - h - inset))

    const movedEnough =
      Math.abs(e.clientX - dragRef.current.startX) > 6 || Math.abs(e.clientY - dragRef.current.startY) > 6
    if (!movedEnough) return
    dragRef.current.moved = true

    // live move (don’t snap hard until release)
    setUi((p) => ({ ...p, x, y, edge: 'float' }))
  }

  function onPointerUp(e) {
    if (!dragRef.current.active) return
    const moved = Boolean(dragRef.current.moved)
    dragRef.current.active = false
    dragRef.current.pointerId = null
    dragRef.current.moved = false

    // Si hubo drag, bloquear el click inmediato (evita abrir/cerrar al soltar).
    clickBlockRef.current = moved

    // snap on release (usar el estado más reciente)
    persistUi((prev) => snapToEdges(prev))

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }

    // Liberar bloqueo en el próximo tick.
    setTimeout(() => {
      clickBlockRef.current = false
    }, 0)
  }

  function onMinClick() {
    if (clickBlockRef.current) return
    toggleOpen()
  }

  function toggleOpen() {
    persistUi((prev) => ({ ...prev, open: !prev.open }))
  }

  if (!authed) return null

  const className = `notesFloat ${ui.edge} ${ui.open ? 'open' : 'closed'}`
  const style = { left: ui.x, top: ui.y }

  const { w: handleW, h: handleH } = getHandleRect()
  const { w: panelW, h: panelH } = getPanelRect()
  const gap = 10

  let panelDx = 0
  let panelDy = 0
  if (ui.edge === 'left') {
    panelDx = handleW + gap
    panelDy = 0
  } else if (ui.edge === 'right') {
    panelDx = -(panelW + gap)
    panelDy = 0
  } else if (ui.edge === 'top') {
    panelDx = 0
    panelDy = handleH + gap
  } else if (ui.edge === 'bottom') {
    panelDx = 0
    panelDy = -(panelH + gap)
  } else {
    // float: escoger dirección con más espacio
    const vw = window.innerWidth
    const vh = window.innerHeight
    const spaceRight = vw - (ui.x + handleW)
    const spaceLeft = ui.x
    const spaceDown = vh - (ui.y + handleH)
    const spaceUp = ui.y

    const openLeft = spaceLeft > spaceRight
    const openUp = spaceUp > spaceDown

    panelDx = openLeft ? -(panelW + gap) : handleW + gap
    panelDy = openUp ? -(panelH + gap) : handleH + gap
  }

  // Asegurar que el panel no se salga de pantalla (sin mover el botón/handle).
  try {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const inset = 12
    const absLeft = ui.x + panelDx
    const absTop = ui.y + panelDy
    const clampedLeft = clamp(absLeft, inset, Math.max(inset, vw - panelW - inset))
    const clampedTop = clamp(absTop, inset, Math.max(inset, vh - panelH - inset))
    panelDx = clampedLeft - ui.x
    panelDy = clampedTop - ui.y
  } catch {
    // ignore
  }

  const panelStyle = { left: panelDx, top: panelDy }

  return (
    <div className={className} style={style}>
      <button
        ref={handleRef}
        type="button"
        className={`btn notesFloatButton ${ui.open ? 'isOpen' : 'isClosed'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onMinClick}
        title={ui.open ? 'Minimizar' : 'Abrir notas'}
      >
        {ui.open ? '—' : 'Notas'}
      </button>

      {ui.open ? (
        <div className="notesFloatPanelWrap" style={panelStyle}>
          <div ref={panelRef} className="card notesFloatPanel">
            <div className="h2">Notas</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Mini ayuda personal. Solo dura esta sesión.
            </div>
            <textarea
              className="input"
              style={{ marginTop: 12, minHeight: 220, resize: 'vertical' }}
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder="Escribe aquí tus notas..."
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
