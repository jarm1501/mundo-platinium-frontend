import React, { useEffect, useMemo, useRef, useState } from 'react'
import { chatList, chatSend } from '../api'

const NOTES_KEY_PREFIX = 'mp2_notes:'
const JOIN_KEY_PREFIX = 'mp2_chat_join:'
const SEEN_KEY_PREFIX = 'mp2_chat_seen:'
const SUPPORT_SEEN_PREFIX = 'mp2_support_seen:'
const WIN_POS_PREFIX = 'mp2_chat_win_pos:'

function isAdmin(session) {
  return Number(session?.nivel) === 0
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function ssGetNumber(key, fallback = 0) {
  try {
    const raw = sessionStorage.getItem(key)
    const n = raw ? Number(raw) : fallback
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

function ssSetNumber(key, n) {
  try {
    sessionStorage.setItem(key, String(Number(n) || 0))
  } catch {
    // ignore
  }
}

function lsGetPos(key) {
  try {
    const raw = localStorage.getItem(key)
    const data = raw ? JSON.parse(raw) : null
    if (!data || typeof data !== 'object') return null
    const x = Number(data.x)
    const y = Number(data.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    return { x, y }
  } catch {
    return null
  }
}

function lsSetPos(key, pos) {
  try {
    localStorage.setItem(key, JSON.stringify({ x: pos.x, y: pos.y }))
  } catch {
    // ignore
  }
}

function notesKeyForUser(usuario) {
  return `${NOTES_KEY_PREFIX}${String(usuario || '').trim()}`
}

function loadNotes(usuario) {
  try {
    const key = notesKeyForUser(usuario)
    const raw = key ? sessionStorage.getItem(key) : null
    const data = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function saveNotes(usuario, notes) {
  try {
    const key = notesKeyForUser(usuario)
    if (!key) return
    sessionStorage.setItem(key, JSON.stringify(notes))
  } catch {
    // ignore
  }
}

function joinKey(usuario, channel) {
  return `${JOIN_KEY_PREFIX}${String(usuario || '').trim()}:${channel}`
}

function getJoinTs(usuario, channel) {
  const key = joinKey(usuario, channel)
  const existing = ssGetNumber(key, 0)
  if (existing > 0) return existing
  const now = Math.floor(Date.now() / 1000)
  ssSetNumber(key, now)
  return now
}

function seenKey(usuario, channel) {
  return `${SEEN_KEY_PREFIX}${String(usuario || '').trim()}:${channel}`
}

function supportSeenKey(usuario, kind) {
  return `${SUPPORT_SEEN_PREFIX}${String(usuario || '').trim()}:${kind}`
}

export default function ChatPanel({ session }) {
  const authed = Boolean(session?.token)
  const admin = isAdmin(session)
  const usuario = String(session?.usuario || '').trim()

  const chats = useMemo(() => {
    const base = [
      { key: 'group', label: 'Grupo' },
      { key: 'support', label: 'Soporte' },
      { key: 'notes', label: 'Propio' }
    ]
    return admin ? [{ key: 'admins', label: 'Admins' }, ...base] : base
  }, [admin])

  const [active, setActive] = useState(null) // 'group'|'admins'|'support'|'notes'|null
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [composer, setComposer] = useState('')

  const [unread, setUnread] = useState({ group: false, admins: false, support: false })

  const [streams, setStreams] = useState({
    group: { messages: [], lastId: 0 },
    admins: { messages: [], lastId: 0 }
  })

  const [notes, setNotes] = useState(() => loadNotes(usuario))

  const [supportTicket, setSupportTicket] = useState(null)
  const [supportTickets, setSupportTickets] = useState([])
  const [supportSelected, setSupportSelected] = useState('')
  const [supportUserDraft, setSupportUserDraft] = useState('')
  const [supportAdminDraft, setSupportAdminDraft] = useState('')

  const bodyRef = useRef(null)

  useEffect(() => {
    if (!authed) return
    setNotes(loadNotes(usuario))
  }, [authed, usuario])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [active, streams.group.messages.length, streams.admins.messages.length, notes.length, supportTicket?.user_event_id, supportTicket?.admin_event_id])

  function markSeen(key) {
    if (key === 'group' || key === 'admins') {
      const last = streams[key]?.lastId || 0
      ssSetNumber(seenKey(usuario, key), last)
      setUnread((u) => ({ ...u, [key]: false }))
    }
    if (key === 'support') {
      if (admin) {
        const maxEv = Math.max(0, ...supportTickets.map((t) => Number(t.last_event_id || 0)))
        ssSetNumber(supportSeenKey(usuario, 'admin'), maxEv)
      } else {
        ssSetNumber(supportSeenKey(usuario, 'user'), Number(supportTicket?.admin_event_id || 0))
      }
      setUnread((u) => ({ ...u, support: false }))
    }
  }

  async function openChat(key) {
    setError('')
    setActive(key)

    try {
      if (key === 'group' || key === 'admins') {
        if (key === 'admins' && !admin) return
        const joinTs = getJoinTs(usuario, key)
        const r = await chatList({ channel: key, since_id: 0, since_ts: joinTs, limit: 200 })
        const list = Array.isArray(r?.messages) ? r.messages : []
        const lastId = list.length ? list[list.length - 1].id : 0
        setStreams((s) => ({ ...s, [key]: { messages: list, lastId } }))
        markSeen(key)
        return
      }

      if (key === 'notes') {
        setNotes(loadNotes(usuario))
        return
      }

      if (key === 'support') {
        if (admin) {
          const r = await chatList({ channel: 'support', limit: 200 })
          const tickets = Array.isArray(r?.tickets) ? r.tickets : []
          setSupportTickets(tickets)
          setSupportSelected('')
          setSupportTicket(null)
          setSupportAdminDraft('')
          markSeen('support')
        } else {
          const r = await chatList({ channel: 'support' })
          const t = r?.ticket || null
          setSupportTicket(t)
          setSupportUserDraft(String(t?.user_text || ''))
          markSeen('support')
        }
      }
    } catch (e) {
      setError(e?.message || 'No se pudo cargar.')
    }
  }

  const activeLastId = active ? (streams?.[active]?.lastId || 0) : 0

  useEffect(() => {
    if (!authed) return
    if (!active) return

    let stopped = false
    let hardStop = false

    async function tick() {
      if (stopped || hardStop) return
      try {
        if (active === 'group' || active === 'admins') {
          if (active === 'admins' && !admin) return
          const joinTs = getJoinTs(usuario, active)
          const r = await chatList({ channel: active, since_id: activeLastId, since_ts: joinTs, limit: 200 })
          const list = Array.isArray(r?.messages) ? r.messages : []
          if (list.length) {
            const lastId = list[list.length - 1].id
            setStreams((s) => ({
              ...s,
              [active]: { messages: [...(s[active]?.messages || []), ...list].slice(-400), lastId }
            }))
            markSeen(active)
          }
          return
        }

        if (active === 'support') {
          if (admin) {
            if (!supportSelected) return
            const r = await chatList({ channel: 'support', usuario: supportSelected })
            const t = r?.ticket || null
            setSupportTicket(t)
            setSupportAdminDraft(String(t?.admin_text || ''))
          } else {
            const r = await chatList({ channel: 'support' })
            const t = r?.ticket || null
            setSupportTicket(t)
          }
          return
        }
      } catch (e) {
        const st = Number(e?.status || 0)
        // si el backend falla o no hay permiso, frenamos para no spamear.
        if (st === 403 || st === 500) {
          hardStop = true
          setError(e?.message || 'Chat no disponible por ahora.')
        }
      }
    }

    tick()
    const id = setInterval(tick, 4000)
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [authed, active, admin, usuario, activeLastId, supportSelected])

  async function sendChatMessage(e) {
    e?.preventDefault?.()
    setError('')
    const t = (composer || '').trim()
    if (!t) return
    if (active !== 'group' && active !== 'admins') return

    setSending(true)
    try {
      await chatSend({ channel: active, text: t })
      setComposer('')
    } catch (e2) {
      setError(e2?.message || 'No se pudo enviar.')
    } finally {
      setSending(false)
    }
  }

  async function addNote(e) {
    e?.preventDefault?.()
    const t = (composer || '').trim()
    if (!t) return
    const next = [...notes, { ts: Math.floor(Date.now() / 1000), text: t }]
    setNotes(next)
    saveNotes(usuario, next)
    setComposer('')
  }

  async function supportUserSave() {
    setError('')
    const t = (supportUserDraft || '').trim()
    setSending(true)
    try {
      const r = await chatSend({ channel: 'support', text: t })
      setSupportTicket(r?.ticket || supportTicket)
      markSeen('support')
    } catch (e) {
      setError(e?.message || 'No se pudo guardar.')
    } finally {
      setSending(false)
    }
  }

  async function supportUserDelete() {
    setError('')
    setSending(true)
    try {
      const r = await chatSend({ channel: 'support', op: 'delete' })
      setSupportTicket(r?.ticket || supportTicket)
      setSupportUserDraft('')
      markSeen('support')
    } catch (e) {
      setError(e?.message || 'No se pudo eliminar.')
    } finally {
      setSending(false)
    }
  }

  async function supportAdminSelect(u) {
    setSupportSelected(u)
    setSupportTicket(null)
    setSupportAdminDraft('')
    setError('')
    try {
      const r = await chatList({ channel: 'support', usuario: u })
      const t = r?.ticket || null
      setSupportTicket(t)
      setSupportAdminDraft(String(t?.admin_text || ''))
      markSeen('support')
    } catch (e) {
      setError(e?.message || 'No se pudo cargar.')
    }
  }

  async function supportAdminSave() {
    if (!supportSelected) return
    setError('')
    const t = (supportAdminDraft || '').trim()
    setSending(true)
    try {
      const r = await chatSend({ channel: 'support', usuario: supportSelected, text: t })
      setSupportTicket(r?.ticket || supportTicket)
      markSeen('support')
    } catch (e) {
      setError(e?.message || 'No se pudo guardar.')
    } finally {
      setSending(false)
    }
  }

  async function supportAdminDelete() {
    if (!supportSelected) return
    setError('')
    setSending(true)
    try {
      const r = await chatSend({ channel: 'support', usuario: supportSelected, op: 'delete' })
      setSupportTicket(r?.ticket || supportTicket)
      setSupportAdminDraft('')
      markSeen('support')
    } catch (e) {
      setError(e?.message || 'No se pudo eliminar.')
    } finally {
      setSending(false)
    }
  }

  if (!authed) return null

  const activeTitle = chats.find((c) => c.key === active)?.label || ''
  const activeMessages = active === 'group' ? streams.group.messages : active === 'admins' ? streams.admins.messages : []

  return (
    <div className="mpChatDock">
      {active ? (
        <div className="mpChatWindow">
          <div className="mpChatWindowHeader">
            <div className="mpChatWindowTitle">
              {active === 'support' && admin && supportSelected ? `Soporte: ${supportSelected}` : activeTitle}
            </div>
            <button className="mpChatWindowClose" type="button" onClick={() => setActive(null)}>
              x
            </button>
          </div>

          <div className="mpChatWindowBody" ref={bodyRef}>
            {(active === 'group' || active === 'admins') ? (
              activeMessages.map((m) => {
                const self = String(m.from_username || '').trim() === usuario
                return (
                  <div key={m.id} className={self ? 'mpChatBubble self' : 'mpChatBubble'}>
                    <div className="mpChatBubbleMeta">{self ? 'Tú' : (m.from_username || '—')}</div>
                    <div>{m.text}</div>
                  </div>
                )
              })
            ) : null}

            {active === 'notes' ? (
              notes.map((n, idx) => (
                <div key={idx} className="mpChatBubble self">
                  <div className="mpChatBubbleMeta">Propio</div>
                  <div>{n.text}</div>
                </div>
              ))
            ) : null}

            {active === 'support' && !admin ? (
              <div>
                <div className="muted" style={{ marginBottom: 8 }}>
                  Usuario: {supportTicket?.username || usuario} #{supportTicket?.uid || 0}
                </div>

                <div className="supportBlock">
                  <div className="supportTitle">Tu mensaje (editable)</div>
                  <textarea
                    className="input"
                    style={{ minHeight: 120, resize: 'vertical' }}
                    placeholder="Escribe tu mensaje para admins..."
                    value={supportUserDraft}
                    onChange={(e) => setSupportUserDraft(e.target.value)}
                  />
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn primary" disabled={sending} type="button" onClick={supportUserSave}>
                      Guardar
                    </button>
                    <button className="btn" disabled={sending} type="button" onClick={supportUserDelete}>
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="supportBlock" style={{ marginTop: 10 }}>
                  <div className="supportTitle">Respuesta de admins</div>
                  {supportTicket?.admin_text ? <div className="supportMsg">{supportTicket.admin_text}</div> : <div className="muted">Aún no hay respuesta.</div>}
                </div>
              </div>
            ) : null}

            {active === 'support' && admin ? (
              <div>
                {!supportSelected ? (
                  <div>
                    <div className="supportTitle">Buzones de soporte</div>
                    <div className="supportList">
                      {supportTickets.length ? (
                        supportTickets.map((t) => (
                          <button
                            key={t.username}
                            type="button"
                            className="supportListItem"
                            onClick={() => supportAdminSelect(t.username)}
                          >
                            <div className="supportListTop">
                              <strong>{t.username}</strong>
                              <span className="muted">#{t.uid || 0}</span>
                            </div>
                            <div className="supportListBottom">{(t.user_text || '').slice(0, 60) || '—'}</div>
                          </button>
                        ))
                      ) : (
                        <div className="muted">No hay mensajes.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <button type="button" className="btn" onClick={() => setSupportSelected('')}>
                      Volver
                    </button>

                    <div style={{ marginTop: 10 }} className="supportBlock">
                      <div className="supportTitle">
                        Usuario: {supportSelected} #{supportTicket?.uid || 0}
                      </div>
                      {(supportTicket?.contact_email || supportTicket?.contact_phone) ? (
                        <div className="muted">
                          {supportTicket?.contact_email ? `Correo: ${supportTicket.contact_email}` : ''}
                          {supportTicket?.contact_email && supportTicket?.contact_phone ? ' · ' : ''}
                          {supportTicket?.contact_phone ? `Tel: ${supportTicket.contact_phone}` : ''}
                        </div>
                      ) : null}

                      <div style={{ marginTop: 10 }}>
                        <div className="supportTitle">Mensaje del usuario</div>
                        <div className="supportMsg">{supportTicket?.user_text || '—'}</div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <div className="supportTitle">Respuesta admins (1 mensaje)</div>
                        <textarea
                          className="input"
                          style={{ minHeight: 120, resize: 'vertical' }}
                          placeholder="Escribe la respuesta para el usuario..."
                          value={supportAdminDraft}
                          onChange={(e) => setSupportAdminDraft(e.target.value)}
                        />
                        <div className="row" style={{ marginTop: 8 }}>
                          <button className="btn primary" disabled={sending} type="button" onClick={supportAdminSave}>
                            Guardar
                          </button>
                          <button className="btn" disabled={sending} type="button" onClick={supportAdminDelete}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="error-box" style={{ margin: '8px 10px 0' }}>
              <small>{error}</small>
            </div>
          ) : null}

          {(active === 'group' || active === 'admins') ? (
            <form className="mpChatWindowFooter" onSubmit={sendChatMessage}>
              <input
                className="input"
                placeholder="Escribe un mensaje..."
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
              />
              <button className="btn primary" disabled={sending} type="submit">
                Enviar
              </button>
            </form>
          ) : null}

          {active === 'notes' ? (
            <form className="mpChatWindowFooter" onSubmit={addNote}>
              <input
                className="input"
                placeholder="Escribe una nota..."
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
              />
              <button className="btn primary" type="submit">
                Agregar
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="mpChatList">
        <div className="mpChatListHeader">
          <div className="mpChatListTitle">Chat</div>
          <div className="muted" style={{ fontSize: 12 }}>{usuario}</div>
        </div>

        <div className="mpChatListBody">
          {chats.map((c) => (
            <button
              key={c.key}
              type="button"
              className={active === c.key ? 'mpChatItem active' : 'mpChatItem'}
              onClick={() => openChat(c.key)}
            >
              <span className="mpChatItemName">{c.label}</span>
              {c.key === 'group' && unread.group ? <span className="mpChatDot" /> : null}
              {c.key === 'admins' && unread.admins ? <span className="mpChatDot" /> : null}
              {c.key === 'support' && unread.support ? <span className="mpChatDot" /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChatPanelLegacy({ session }) {
  const authed = Boolean(session?.token)
  const admin = isAdmin(session)
  const usuario = String(session?.usuario || '').trim()

  const chats = useMemo(() => {
    const base = [
      { key: 'group', label: 'Grupo' },
      { key: 'support', label: 'Soporte' },
      { key: 'notes', label: 'Propio' }
    ]
    return admin ? [{ key: 'admins', label: 'Admins' }, ...base] : base
  }, [admin])

  const [open, setOpen] = useState(null) // key
  const [minimized, setMinimized] = useState(false)
  const [pos, setPos] = useState(null)
  const dragRef = useRef(null)

  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  // Mensajes (grupo/admins)
  const [messages, setMessages] = useState([])
  const [lastShownId, setLastShownId] = useState(0)
  const [text, setText] = useState('')

  // Notas
  const [notes, setNotes] = useState(() => loadNotes(usuario))

  // Soporte
  const [supportTicket, setSupportTicket] = useState(null)
  const [supportTickets, setSupportTickets] = useState([]) // admin list
  const [supportSelected, setSupportSelected] = useState('')
  const [supportUserDraft, setSupportUserDraft] = useState('')
  const [supportAdminDraft, setSupportAdminDraft] = useState('')

  // Unread state
  const [known, setKnown] = useState({ group: 0, admins: 0 })
  const [unread, setUnread] = useState({ group: false, admins: false, support: false })

  const scrollRef = useRef(null)

  useEffect(() => {
    if (!authed) return
    setNotes(loadNotes(usuario))
  }, [authed, usuario])

  // Inicializar posición por ventana
  useEffect(() => {
    if (!authed) return
    if (!open) return
    const k = `${WIN_POS_PREFIX}${open}`
    const p = lsGetPos(k)
    if (p) {
      setPos(p)
      return
    }
    const margin = 12
    const topSafe = 76
    const w = 360
    const h = 520
    const x = clamp(window.innerWidth - w - 60, margin, Math.max(margin, window.innerWidth - w - margin))
    const y = clamp(window.innerHeight - h - margin, topSafe, Math.max(topSafe, window.innerHeight - h - margin))
    setPos({ x, y })
  }, [authed, open])

  useEffect(() => {
    if (!authed) return
    if (!open) return
    if (!pos) return
    lsSetPos(`${WIN_POS_PREFIX}${open}`, pos)
  }, [authed, open, pos])

  function onMouseDownHeader(e) {
    if (e.button !== 0) return
    if (!pos) return
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    e.preventDefault()

    function onMove(ev) {
      const d = dragRef.current
      if (!d) return
      const margin = 12
      const topSafe = 76
      const w = 360
      const h = minimized ? 60 : 520
      const x = clamp(ev.clientX - d.dx, margin, Math.max(margin, window.innerWidth - w - margin))
      const y = clamp(ev.clientY - d.dy, topSafe, Math.max(topSafe, window.innerHeight - h - margin))
      setPos({ x, y })
      ev.preventDefault()
    }
    function onUp() {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, open])

  function markSeen(channelKey) {
    if (channelKey === 'group' || channelKey === 'admins') {
      ssSetNumber(seenKey(usuario, channelKey), known[channelKey] || 0)
      setUnread((u) => ({ ...u, [channelKey]: false }))
    }
    if (channelKey === 'support') {
      if (admin) {
        const maxEv = Math.max(0, ...supportTickets.map((t) => Number(t.last_event_id || 0)))
        ssSetNumber(supportSeenKey(usuario, 'admin'), maxEv)
        setUnread((u) => ({ ...u, support: false }))
      } else {
        const ev = Number(supportTicket?.admin_event_id || 0)
        ssSetNumber(supportSeenKey(usuario, 'user'), ev)
        setUnread((u) => ({ ...u, support: false }))
      }
    }
  }

  function openChat(key) {
    setError('')
    setOpen(key)
    setMinimized(false)
    if (key === 'admins' && !admin) return
    markSeen(key)
  }

  // Background polling para badges (sin abrir ventanas)
  useEffect(() => {
    if (!authed) return
    let stopped = false

    async function tick() {
      if (stopped) return

      // Grupo
      try {
        const joinTs = getJoinTs(usuario, 'group')
        const sinceId = known.group || 0
        const r = await chatList({ channel: 'group', since_id: sinceId, since_ts: joinTs, limit: 50 })
        const list = r?.messages || []
        if (list.length) {
          const newKnown = list[list.length - 1].id
          setKnown((k) => ({ ...k, group: newKnown }))
          const seen = ssGetNumber(seenKey(usuario, 'group'), 0)
          if (newKnown > seen && open !== 'group') setUnread((u) => ({ ...u, group: true }))
        }
      } catch {
        // ignore
      }

      // Admins
      if (admin) {
        try {
          const joinTs = getJoinTs(usuario, 'admins')
          const sinceId = known.admins || 0
          const r = await chatList({ channel: 'admins', since_id: sinceId, since_ts: joinTs, limit: 50 })
          const list = r?.messages || []
          if (list.length) {
            const newKnown = list[list.length - 1].id
            setKnown((k) => ({ ...k, admins: newKnown }))
            const seen = ssGetNumber(seenKey(usuario, 'admins'), 0)
            if (newKnown > seen && open !== 'admins') setUnread((u) => ({ ...u, admins: true }))
          }
        } catch {
          // ignore
        }
      }

      // Soporte
      try {
        if (admin) {
          const r = await chatList({ channel: 'support', limit: 200 })
          const tickets = r?.tickets || []
          setSupportTickets(Array.isArray(tickets) ? tickets : [])
          const maxEv = Math.max(0, ...tickets.map((t) => Number(t.last_event_id || 0)))
          const seenEv = ssGetNumber(supportSeenKey(usuario, 'admin'), 0)
          if (maxEv > seenEv && open !== 'support') setUnread((u) => ({ ...u, support: true }))
        } else {
          const r = await chatList({ channel: 'support' })
          const t = r?.ticket || null
          setSupportTicket(t)
          const adminEv = Number(t?.admin_event_id || 0)
          const seenEv = ssGetNumber(supportSeenKey(usuario, 'user'), 0)
          if (adminEv > seenEv && open !== 'support') setUnread((u) => ({ ...u, support: true }))
        }
      } catch {
        // ignore
      }
    }

    tick()
    const id = setInterval(tick, 2000)
    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [authed, admin, usuario, open, known.group, known.admins, supportTicket?.admin_event_id])

  // Cargar ventana abierta
  useEffect(() => {
    if (!authed) return
    if (!open) return
    let stopped = false
    setError('')

    async function loadInitial() {
      if (stopped) return
      try {
        if (open === 'group' || open === 'admins') {
          if (open === 'admins' && !admin) return
          const joinTs = getJoinTs(usuario, open)
          const r = await chatList({ channel: open, since_id: 0, since_ts: joinTs, limit: 200 })
          const list = r?.messages || []
          setMessages(Array.isArray(list) ? list : [])
          const last = list.length ? list[list.length - 1].id : 0
          setLastShownId(last)
          if (open === 'group') setKnown((k) => ({ ...k, group: Math.max(k.group, last) }))
          if (open === 'admins') setKnown((k) => ({ ...k, admins: Math.max(k.admins, last) }))
          markSeen(open)
          return
        }

        if (open === 'support') {
          if (admin) {
            // list ya viene por polling, pero asegurar
            const r = await chatList({ channel: 'support', limit: 200 })
            const tickets = r?.tickets || []
            setSupportTickets(Array.isArray(tickets) ? tickets : [])
            markSeen('support')
          } else {
            const r = await chatList({ channel: 'support' })
            const t = r?.ticket || null
            setSupportTicket(t)
            setSupportUserDraft(String(t?.user_text || ''))
            markSeen('support')
          }
        }
      } catch (e) {
        setError(e?.message || 'No se pudo cargar.')
      }
    }

    loadInitial()
    const id = setInterval(async () => {
      if (stopped) return
      try {
        if (open === 'group' || open === 'admins') {
          if (open === 'admins' && !admin) return
          const joinTs = getJoinTs(usuario, open)
          const r = await chatList({ channel: open, since_id: lastShownId, since_ts: joinTs, limit: 200 })
          const list = r?.messages || []
          if (list.length) {
            setMessages((prev) => [...prev, ...list].slice(-400))
            const last = list[list.length - 1].id
            setLastShownId(last)
            if (open === 'group') setKnown((k) => ({ ...k, group: Math.max(k.group, last) }))
            if (open === 'admins') setKnown((k) => ({ ...k, admins: Math.max(k.admins, last) }))
            markSeen(open)
          }
        }

        if (open === 'support') {
          if (admin) {
            if (!supportSelected) return
            const r = await chatList({ channel: 'support', usuario: supportSelected })
            const t = r?.ticket || null
            setSupportTicket(t)
            setSupportAdminDraft(String(t?.admin_text || ''))
          } else {
            const r = await chatList({ channel: 'support' })
            const t = r?.ticket || null
            setSupportTicket(t)
          }
        }
      } catch {
        // ignore
      }
    }, 1500)

    return () => {
      stopped = true
      clearInterval(id)
    }
  }, [authed, open, admin, usuario, lastShownId, supportSelected])

  async function sendMessage(e) {
    e?.preventDefault?.()
    setError('')
    const t = (text || '').trim()
    if (!t) return

    setSending(true)
    try {
      await chatSend({ channel: open, text: t })
      setText('')
    } catch (e2) {
      setError(e2?.message || 'No se pudo enviar.')
    } finally {
      setSending(false)
    }
  }

  async function addNote(e) {
    e?.preventDefault?.()
    const t = (text || '').trim()
    if (!t) return
    const next = [...notes, { ts: Math.floor(Date.now() / 1000), text: t }]
    setNotes(next)
    saveNotes(usuario, next)
    setText('')
  }

  async function supportUserSave() {
    setError('')
    const t = (supportUserDraft || '').trim()
    setSending(true)
    try {
      const r = await chatSend({ channel: 'support', text: t })
      setSupportTicket(r?.ticket || supportTicket)
      markSeen('support')
    } catch (e) {
      setError(e?.message || 'No se pudo guardar.')
    } finally {
      setSending(false)
    }
  }

  async function supportUserDelete() {
    setError('')
    setSending(true)
    try {
      const r = await chatSend({ channel: 'support', op: 'delete' })
      setSupportTicket(r?.ticket || supportTicket)
      setSupportUserDraft('')
      markSeen('support')
    } catch (e) {
      setError(e?.message || 'No se pudo eliminar.')
    } finally {
      setSending(false)
    }
  }

  async function supportAdminSelect(u) {
    setSupportSelected(u)
    setSupportTicket(null)
    setSupportAdminDraft('')
    setError('')
    try {
      const r = await chatList({ channel: 'support', usuario: u })
      const t = r?.ticket || null
      setSupportTicket(t)
      setSupportAdminDraft(String(t?.admin_text || ''))
      markSeen('support')
    } catch (e) {
      setError(e?.message || 'No se pudo cargar.')
    }
  }

  async function supportAdminSave() {
    if (!supportSelected) return
    setError('')
    const t = (supportAdminDraft || '').trim()
    setSending(true)
    try {
      const r = await chatSend({ channel: 'support', usuario: supportSelected, text: t })
      setSupportTicket(r?.ticket || supportTicket)
      markSeen('support')
    } catch (e) {
      setError(e?.message || 'No se pudo guardar.')
    } finally {
      setSending(false)
    }
  }

  async function supportAdminDelete() {
    if (!supportSelected) return
    setError('')
    setSending(true)
    try {
      const r = await chatSend({ channel: 'support', usuario: supportSelected, op: 'delete' })
      setSupportTicket(r?.ticket || supportTicket)
      setSupportAdminDraft('')
      markSeen('support')
    } catch (e) {
      setError(e?.message || 'No se pudo eliminar.')
    } finally {
      setSending(false)
    }
  }

  if (!authed) return null

  const winTitle = (() => {
    if (open === 'admins') return 'Admins'
    if (open === 'group') return 'Grupo'
    if (open === 'support' && admin) return supportSelected ? `Soporte: ${supportSelected}` : 'Soporte'
    if (open === 'support' && !admin) return 'Soporte'
    if (open === 'notes') return 'Propio'
    return ''
  })()

  return (
    <>
      <div className="chatSidebar">
        {chats.map((c) => (
          <button
            key={c.key}
            className={open === c.key ? 'chatSideBtn active' : 'chatSideBtn'}
            type="button"
            onClick={() => openChat(c.key)}
          >
            <span className="chatSideLabel">{c.label}</span>
            {c.key === 'group' && unread.group ? <span className="chatBadge" /> : null}
            {c.key === 'admins' && unread.admins ? <span className="chatBadge" /> : null}
            {c.key === 'support' && unread.support ? <span className="chatBadge" /> : null}
          </button>
        ))}
      </div>

      {open ? (
        <div
          className={minimized ? 'chatWin minimized' : 'chatWin'}
          style={pos ? { left: `${pos.x}px`, top: `${pos.y}px` } : undefined}
        >
          <div className="chatWinHeader" onMouseDown={onMouseDownHeader}>
            <div className="chatWinTitle">{winTitle}</div>
            <div className="chatWinActions">
              <button className="chatWinBtn" type="button" onClick={() => setMinimized((m) => !m)}>
                {minimized ? 'abrir' : 'min'}
              </button>
              <button className="chatWinBtn" type="button" onClick={() => setOpen(null)}>
                x
              </button>
            </div>
          </div>

          {!minimized ? (
            <>
              <div className="chatWinBody" ref={scrollRef}>
                {open === 'group' || open === 'admins' ? (
                  messages.map((m) => (
                    <div key={m.id} className="chatMsg">
                      <div className="chatMeta">
                        <span>{m.from_username || '—'}</span>
                      </div>
                      <div className="chatText">{m.text}</div>
                    </div>
                  ))
                ) : null}

                {open === 'notes' ? (
                  notes.map((n, idx) => (
                    <div key={idx} className="chatMsg">
                      <div className="chatMeta">Propio</div>
                      <div className="chatText">{n.text}</div>
                    </div>
                  ))
                ) : null}

                {open === 'support' && !admin ? (
                  <div className="supportBox">
                    <div className="supportBlock">
                      <div className="muted" style={{ marginBottom: 8 }}>
                        Usuario: {supportTicket?.username || usuario} #{supportTicket?.uid || 0}
                      </div>
                      <div className="supportTitle">Tu mensaje (editable)</div>
                      <textarea
                        className="input"
                        style={{ minHeight: 120, resize: 'vertical' }}
                        placeholder="Escribe tu mensaje para admins..."
                        value={supportUserDraft}
                        onChange={(e) => setSupportUserDraft(e.target.value)}
                      />
                      <div className="row" style={{ marginTop: 8 }}>
                        <button className="btn primary" disabled={sending} type="button" onClick={supportUserSave}>
                          Guardar
                        </button>
                        <button className="btn" disabled={sending} type="button" onClick={supportUserDelete}>
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <div className="supportBlock" style={{ marginTop: 10 }}>
                      <div className="supportTitle">Respuesta de admins</div>
                      {supportTicket?.admin_text ? (
                        <div className="supportMsg">{supportTicket.admin_text}</div>
                      ) : (
                        <div className="muted">Aún no hay respuesta.</div>
                      )}
                    </div>
                  </div>
                ) : null}

                {open === 'support' && admin ? (
                  <div className="supportAdmin">
                    {!supportSelected ? (
                      <div>
                        <div className="supportTitle">Buzones de soporte</div>
                        <div className="supportList">
                          {supportTickets.length ? (
                            supportTickets.map((t) => (
                              <button
                                key={t.username}
                                type="button"
                                className="supportListItem"
                                onClick={() => supportAdminSelect(t.username)}
                              >
                                <div className="supportListTop">
                                  <strong>{t.username}</strong>
                                  <span className="muted">#{t.uid || 0}</span>
                                </div>
                                <div className="supportListBottom">
                                  {(t.user_text || '').slice(0, 60) || '—'}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="muted">No hay mensajes.</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <button type="button" className="btn" onClick={() => setSupportSelected('')}>
                          Volver
                        </button>
                        <div style={{ marginTop: 10 }} className="supportBlock">
                          <div className="supportTitle">
                            Usuario: {supportSelected} #{supportTicket?.uid || 0}
                          </div>
                          {(supportTicket?.contact_email || supportTicket?.contact_phone) ? (
                            <div className="muted">
                              {supportTicket?.contact_email ? `Correo: ${supportTicket.contact_email}` : ''}
                              {supportTicket?.contact_email && supportTicket?.contact_phone ? ' · ' : ''}
                              {supportTicket?.contact_phone ? `Tel: ${supportTicket.contact_phone}` : ''}
                            </div>
                          ) : null}
                          <div style={{ marginTop: 10 }}>
                            <div className="supportTitle">Mensaje del usuario</div>
                            <div className="supportMsg">{supportTicket?.user_text || '—'}</div>
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <div className="supportTitle">Respuesta admins (1 mensaje)</div>
                            <textarea
                              className="input"
                              style={{ minHeight: 120, resize: 'vertical' }}
                              placeholder="Escribe la respuesta para el usuario..."
                              value={supportAdminDraft}
                              onChange={(e) => setSupportAdminDraft(e.target.value)}
                            />
                            <div className="row" style={{ marginTop: 8 }}>
                              <button className="btn primary" disabled={sending} type="button" onClick={supportAdminSave}>
                                Guardar
                              </button>
                              <button className="btn" disabled={sending} type="button" onClick={supportAdminDelete}>
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="error-box" style={{ margin: '8px 10px 0' }}>
                  <small>{error}</small>
                </div>
              ) : null}

              {(open === 'group' || open === 'admins') ? (
                <form className="chatWinFooter" onSubmit={sendMessage}>
                  <input
                    className="input"
                    placeholder="Escribe un mensaje..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <button className="btn primary" disabled={sending} type="submit">
                    Enviar
                  </button>
                </form>
              ) : null}

              {open === 'notes' ? (
                <form className="chatWinFooter" onSubmit={addNote}>
                  <input
                    className="input"
                    placeholder="Escribe una nota..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <button className="btn primary" type="submit">
                    Agregar
                  </button>
                </form>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
