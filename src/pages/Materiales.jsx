import React, { useEffect, useMemo, useState } from 'react'
import {
  getToken,
  materialesCreate,
  materialesDelete,
  materialesList,
  materialesMovimientosList,
  materialesUsoCreate,
  materialesUsoDetail,
  materialesUsoReturn,
  materialesUsosList,
  materialesVentaCreate,
  materialesVentasList,
  materialesUpdate
} from '../api'

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="h2">{title}</div>
          <button className="btn" onClick={onClose}>Cerrar</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function fmtQty(q, unidad) {
  const n = Number(q ?? 0)
  const unit = (unidad || '').trim()
  if (!Number.isFinite(n)) return `0${unit ? ` ${unit}` : ''}`
  const s = (Math.round(n * 1000) / 1000).toString()
  return `${s}${unit ? ` ${unit}` : ''}`
}

function FormMaterial({ initial, onSubmit, saving, suggestions }) {
  const [v, setV] = useState(() => ({
    nombre: initial?.nombre || '',
    tipo: initial?.tipo || '',
    unidad: initial?.unidad || 'unidad',
    precio: initial?.precio ?? 0,
    vendible: Boolean(initial?.vendible),
    precio_venta: initial?.precio_venta ?? 0,
    ubicacion: initial?.ubicacion || '',
    cantidad: initial?.cantidad ?? 0,
    minimo: initial?.minimo ?? 0,
    propio: Boolean(initial?.propio)
  }))

  function setField(k, val) {
    setV((p) => {
      if (k === 'propio') {
        const nextPropio = Boolean(val)
        if (!nextPropio && p.vendible) {
          return { ...p, propio: false, vendible: false, precio_venta: 0 }
        }
      }

      return { ...p, [k]: val }
    })
  }

  const tipoOpts = Array.isArray(suggestions?.tipos) ? suggestions.tipos : []
  const unidadOpts = Array.isArray(suggestions?.unidades) ? suggestions.unidades : []
  const ubicacionOpts = Array.isArray(suggestions?.ubicaciones) ? suggestions.ubicaciones : []

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(v) }} className="grid" style={{ gap: 10 }}>
      <datalist id="dl_tipo">
        {tipoOpts.map((t) => <option key={t} value={t} />)}
      </datalist>
      <datalist id="dl_unidad">
        {unidadOpts.map((u) => <option key={u} value={u} />)}
      </datalist>
      <datalist id="dl_ubicacion">
        {ubicacionOpts.map((u) => <option key={u} value={u} />)}
      </datalist>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className="muted">Nombre</label>
          <input className="input" value={v.nombre} onChange={(e) => setField('nombre', e.target.value)} />
        </div>
        <div>
          <label className="muted">Tipo</label>
          <input className="input" value={v.tipo} onChange={(e) => setField('tipo', e.target.value)} list="dl_tipo" placeholder="Ej: herramienta, material, insumo..." />
        </div>
        <div>
          <label className="muted">Cantidad</label>
          <input className="input" type="number" step="0.001" value={v.cantidad} onChange={(e) => setField('cantidad', e.target.value)} />
        </div>
        <div>
          <label className="muted">Mínimo</label>
          <input className="input" type="number" step="0.001" value={v.minimo} onChange={(e) => setField('minimo', e.target.value)} />
          <div className="muted" style={{ marginTop: 6 }}>
            Umbral de alerta: si <strong>Disponible</strong> ≤ <strong>Mínimo</strong>, se considera bajo stock.
          </div>
        </div>
        <div>
          <label className="muted">Unidad</label>
          <input className="input" value={v.unidad} onChange={(e) => setField('unidad', e.target.value)} list="dl_unidad" placeholder="Ej: unidad, kg, bolsa, litro..." />
        </div>
        <div>
          <label className="muted">Costo unitario</label>
          <input className="input" type="number" step="0.01" value={v.precio} onChange={(e) => setField('precio', e.target.value)} />
        </div>
        <div>
          <label className="muted">Precio de venta (referencia)</label>
          <input className="input" type="number" step="0.01" value={v.precio_venta} onChange={(e) => setField('precio_venta', e.target.value)} placeholder={v.propio ? 'Opcional' : 'Solo aplica si es propio'} disabled={!v.propio} />
        </div>
        <div>
          <label className="muted">Ubicación</label>
          <input className="input" value={v.ubicacion} onChange={(e) => setField('ubicacion', e.target.value)} list="dl_ubicacion" placeholder="Ej: almacén, estante A, bodega..." />
        </div>
      </div>
      <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
        <label className="row" style={{ gap: 10 }}>
          <input type="checkbox" checked={v.propio} onChange={(e) => setField('propio', e.target.checked)} />
          <span><strong>Inventario propio</strong> (pertenece a la empresa)</span>
        </label>
        <label className="row" style={{ gap: 10 }}>
          <input type="checkbox" checked={v.vendible} disabled={!v.propio} onChange={(e) => setField('vendible', e.target.checked)} />
          <span><strong>Vendible</strong> (habilita registro de ventas)</span>
        </label>
      </div>
      {!v.propio ? (
        <div className="muted" style={{ marginTop: 6 }}>
          Para habilitar <strong>Vendible</strong>, primero marca <strong>Inventario propio</strong>.
        </div>
      ) : null}
      <div className="muted" style={{ marginTop: 6 }}>
        <strong>Propio</strong>: el material pertenece a la empresa y puede registrarse como <strong>venta</strong> si además está marcado como <strong>vendible</strong>.
        Si <strong>no</strong> es propio, se controla como existencias de terceros (por ejemplo, del cliente): se puede usar y devolver, pero <strong>no</strong> se registra como venta.
      </div>
      <button className="btn primary" disabled={saving} type="submit">{saving ? 'Guardando...' : 'Guardar'}</button>
    </form>
  )
}

function VentaForm({ onClose, onCreated }) {
  const [notas, setNotas] = useState('')
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [items, setItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    setSearching(true)
    materialesList({ q: search, page: 1, page_size: 60 })
      .then((r) => {
        if (!alive) return
        const mats = (r?.materiales || []).filter((m) => Boolean(m.vendible) && Boolean(m.propio))
        setResults(mats)
      })
      .catch(() => { if (alive) setResults([]) })
      .finally(() => { if (alive) setSearching(false) })
    return () => { alive = false }
  }, [search])

  function addMaterial(m) {
    setItems((prev) => {
      if (prev.some((x) => x.material.id === m.id)) return prev
      return [...prev, { material: m, cantidad: '', precio_venta_unitario: m.precio_venta ?? '' }]
    })
  }

  function setRow(mid, key, val) {
    setItems((prev) => prev.map((x) => (x.material.id === mid ? { ...x, [key]: val } : x)))
  }

  function removeItem(mid) {
    setItems((prev) => prev.filter((x) => x.material.id !== mid))
  }

  const totals = useMemo(() => {
    let totalVenta = 0
    let totalCosto = 0
    for (const it of items) {
      const qty = Number(it.cantidad || 0)
      if (!Number.isFinite(qty) || qty <= 0) continue
      const pv = Number(it.precio_venta_unitario ?? it.material.precio_venta ?? 0)
      const cu = Number(it.material.precio ?? 0)
      totalVenta += qty * (Number.isFinite(pv) ? pv : 0)
      totalCosto += qty * (Number.isFinite(cu) ? cu : 0)
    }
    return { totalVenta, totalCosto, ganancia: totalVenta - totalCosto }
  }, [items])

  async function submit() {
    setErr('')
    const cleanItems = items
      .map((x) => ({
        material_id: x.material.id,
        cantidad: Number(x.cantidad || 0),
        precio_venta_unitario: x.precio_venta_unitario === '' ? undefined : Number(x.precio_venta_unitario)
      }))
      .filter((x) => Number.isFinite(x.cantidad) && x.cantidad > 0)

    if (!cleanItems.length) {
      setErr('Agrega al menos un producto con cantidad válida.')
      return
    }

    setSaving(true)
    try {
      const r = await materialesVentaCreate({ notas, items: cleanItems })
      onCreated?.(r)
      onClose()
    } catch (e) {
      setErr(e?.message || 'No se pudo registrar la venta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid" style={{ gap: 10 }}>
      {err ? <div style={{ color: 'var(--bad)' }}>{err}</div> : null}
      <div className="muted">
        Registro interno de ventas (no es caja). Guarda cantidades y totales estimados; no registra cliente, vendedor ni comprobantes.
      </div>

      <div>
        <label className="muted">Notas (opcional)</label>
        <textarea className="input" value={notas} onChange={(e) => setNotas(e.target.value)} style={{ minHeight: 70 }} placeholder="Ej: venta semanal, ajuste por descuento, etc." />
      </div>

      <div className="card pad" style={{ padding: 12 }}>
        <div className="h2">Buscar productos vendibles</div>
        <div className="row" style={{ gap: 10, marginTop: 10 }}>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre/tipo/ubicación" />
          <span className="muted">{searching ? 'Buscando…' : `${results.length} resultados`}</span>
        </div>
        <div style={{ marginTop: 10, maxHeight: 180, overflow: 'auto' }}>
          {(results || []).map((m) => (
            <div key={m.id} className="row between" style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <strong>{m.nombre}</strong>
                <div className="muted">
                  Disponible: {fmtQty(m.cantidad, m.unidad)} · Costo: {Number(m.precio || 0).toFixed(2)} · Venta: {Number(m.precio_venta || 0).toFixed(2)}
                </div>
              </div>
              <button className="btn" onClick={() => addMaterial(m)}>Agregar</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card pad" style={{ padding: 12 }}>
        <div className="row between">
          <div className="h2">Detalle</div>
          <div className="muted">
            Ingreso: {totals.totalVenta.toFixed(2)} · Costo: {totals.totalCosto.toFixed(2)} · Ganancia est.: {totals.ganancia.toFixed(2)}
          </div>
        </div>
        {items.length === 0 ? <div className="muted" style={{ marginTop: 8 }}>Sin items agregados.</div> : null}
        <div style={{ marginTop: 10 }}>
          {items.map((x) => (
            <div key={x.material.id} className="row" style={{ gap: 10, alignItems: 'flex-end', marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div><strong>{x.material.nombre}</strong></div>
                <div className="muted">Disponible: {fmtQty(x.material.cantidad, x.material.unidad)} · Costo: {Number(x.material.precio || 0).toFixed(2)}</div>
              </div>
              <div style={{ width: 150 }}>
                <label className="muted">Cantidad</label>
                <input className="input" type="number" step="0.001" value={x.cantidad} onChange={(e) => setRow(x.material.id, 'cantidad', e.target.value)} />
              </div>
              <div style={{ width: 170 }}>
                <label className="muted">Precio venta</label>
                <input className="input" type="number" step="0.01" value={x.precio_venta_unitario} onChange={(e) => setRow(x.material.id, 'precio_venta_unitario', e.target.value)} />
              </div>
              <button className="btn" onClick={() => removeItem(x.material.id)}>Quitar</button>
            </div>
          ))}
        </div>
        <button className="btn primary" disabled={saving} onClick={submit}>{saving ? 'Registrando…' : 'Registrar venta'}</button>
      </div>
    </div>
  )
}

function UsoForm({ onClose, onCreated }) {
  const [responsable, setResponsable] = useState('')
  const [destino, setDestino] = useState('')
  const [notas, setNotas] = useState('')
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [items, setItems] = useState([]) // {material, cantidad}
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    setSearching(true)
    materialesList({ q: search, page: 1, page_size: 50 })
      .then((r) => { if (alive) setResults(r?.materiales || []) })
      .catch(() => { if (alive) setResults([]) })
      .finally(() => { if (alive) setSearching(false) })
    return () => { alive = false }
  }, [search])

  function addMaterial(m) {
    setItems((prev) => {
      if (prev.some((x) => x.material.id === m.id)) return prev
      return [...prev, { material: m, cantidad: '' }]
    })
  }

  function setQty(mid, val) {
    setItems((prev) => prev.map((x) => (x.material.id === mid ? { ...x, cantidad: val } : x)))
  }

  function removeItem(mid) {
    setItems((prev) => prev.filter((x) => x.material.id !== mid))
  }

  async function submit() {
    setErr('')
    const cleanItems = items
      .map((x) => ({ material_id: x.material.id, cantidad: Number(x.cantidad || 0) }))
      .filter((x) => Number.isFinite(x.cantidad) && x.cantidad > 0)
    if (!cleanItems.length) {
      setErr('Agrega al menos un material con cantidad válida.')
      return
    }
    setSaving(true)
    try {
      const r = await materialesUsoCreate({ responsable, destino, notas, items: cleanItems })
      onCreated?.(r)
      onClose()
    } catch (e) {
      setErr(e?.message || 'No se pudo crear')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid" style={{ gap: 10 }}>
      {err ? <div style={{ color: 'var(--bad)' }}>{err}</div> : null}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className="muted">Responsable</label>
          <input className="input" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Quién retira / quién usa" />
        </div>
        <div>
          <label className="muted">Destino / Obra</label>
          <input className="input" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Lugar, proyecto, área" />
        </div>
      </div>
      <div>
        <label className="muted">Notas</label>
        <textarea className="input" value={notas} onChange={(e) => setNotas(e.target.value)} style={{ minHeight: 70 }} placeholder="Motivo, equipo, turno, etc." />
      </div>

      <div className="card pad" style={{ padding: 12 }}>
        <div className="h2">Buscar y agregar</div>
        <div className="row" style={{ gap: 10, marginTop: 10 }}>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar material (nombre/tipo/ubicación)" />
          <span className="muted">{searching ? 'Buscando...' : `${results.length} resultados`}</span>
        </div>
        <div style={{ marginTop: 10, maxHeight: 180, overflow: 'auto' }}>
          {(results || []).map((m) => (
            <div key={m.id} className="row between" style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <strong>{m.nombre}</strong>
                <div className="muted">Disponible: {fmtQty(m.cantidad, m.unidad)} · En uso: {fmtQty(m.en_uso, m.unidad)}</div>
              </div>
              <button className="btn" onClick={() => addMaterial(m)}>Agregar</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card pad" style={{ padding: 12 }}>
        <div className="h2">Salida / Uso</div>
        {items.length === 0 ? <div className="muted" style={{ marginTop: 8 }}>Aún no agregas materiales.</div> : null}
        <div style={{ marginTop: 10 }}>
          {items.map((x) => (
            <div key={x.material.id} className="row" style={{ gap: 10, alignItems: 'flex-end', marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div><strong>{x.material.nombre}</strong></div>
                <div className="muted">Disponible: {fmtQty(x.material.cantidad, x.material.unidad)}</div>
              </div>
              <div style={{ width: 160 }}>
                <label className="muted">Cantidad</label>
                <input className="input" type="number" step="0.001" value={x.cantidad} onChange={(e) => setQty(x.material.id, e.target.value)} />
              </div>
              <div className="muted" style={{ width: 90, paddingBottom: 10 }}>{x.material.unidad || 'unidad'}</div>
              <button className="btn" onClick={() => removeItem(x.material.id)}>Quitar</button>
            </div>
          ))}
        </div>
        <button className="btn primary" disabled={saving} onClick={submit}>{saving ? 'Creando...' : 'Registrar salida'}</button>
      </div>
    </div>
  )
}

function UsoReturnForm({ usoId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true)
  const [uso, setUso] = useState(null)
  const [err, setErr] = useState('')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState([])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setErr('')
    materialesUsoDetail(usoId)
      .then((r) => {
        if (!alive) return
        setUso(r)
        const init = (r?.items || []).map((it) => ({
          material_id: it.material?.id,
          nombre: it.material?.nombre,
          unidad: it.material?.unidad,
          salida: Number(it.cantidad_salida || 0),
          ya: Number(it.cantidad_devuelta || 0) + Number(it.cantidad_consumida || 0) + Number(it.cantidad_rota || 0) + Number(it.cantidad_perdida || 0),
          devuelto: '',
          consumido: '',
          roto: '',
          perdido: ''
        }))
        setRows(init)
      })
      .catch((e) => { if (alive) setErr(e?.message || 'No se pudo cargar') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [usoId])

  function setRow(mid, key, val) {
    setRows((prev) => prev.map((r) => (r.material_id === mid ? { ...r, [key]: val } : r)))
  }

  function fillAll(mode) {
    setRows((prev) => prev.map((r) => {
      const pendiente = Math.max(0, (r.salida - r.ya))
      if (pendiente <= 0) return r
      if (mode === 'dev') return { ...r, devuelto: String(pendiente), consumido: '', roto: '', perdido: '' }
      if (mode === 'cons') return { ...r, devuelto: '', consumido: String(pendiente), roto: '', perdido: '' }
      return r
    }))
  }

  async function submit() {
    setErr('')
    const items = rows
      .map((r) => ({
        material_id: r.material_id,
        devuelto: Number(r.devuelto || 0),
        consumido: Number(r.consumido || 0),
        roto: Number(r.roto || 0),
        perdido: Number(r.perdido || 0)
      }))
      .filter((x) => (x.devuelto + x.consumido + x.roto + x.perdido) > 0)
    if (!items.length) {
      setErr('Ingresa al menos una cantidad (devuelto/consumido/roto/perdido).')
      return
    }
    setSaving(true)
    try {
      await materialesUsoReturn(usoId, { nota, items })
      onSaved?.()
      onClose()
    } catch (e) {
      setErr(e?.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="muted">Cargando...</div>
  if (err) return <div style={{ color: 'var(--bad)' }}>{err}</div>

  return (
    <div className="grid" style={{ gap: 10 }}>
      <div className="muted">Uso #{uso?.id} · {uso?.responsable || '—'} · {uso?.destino || '—'}</div>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => fillAll('dev')}>Devolver todo lo pendiente</button>
        <button className="btn" onClick={() => fillAll('cons')}>Marcar como consumido (todo lo pendiente)</button>
      </div>

      <div className="card">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Material</th>
                <th style={{ textAlign: 'right' }}>Salida</th>
                <th style={{ textAlign: 'right' }}>Pendiente</th>
                <th style={{ textAlign: 'right' }}>Devuelto</th>
                <th style={{ textAlign: 'right' }}>Consumido</th>
                <th style={{ textAlign: 'right' }}>Roto</th>
                <th style={{ textAlign: 'right' }}>Perdido</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pendiente = Math.max(0, r.salida - r.ya)
                return (
                  <tr key={r.material_id}>
                    <td>
                      <div><strong>{r.nombre}</strong></div>
                      <div className="muted">Unidad: {r.unidad || 'unidad'}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtQty(r.salida, '')}</td>
                    <td style={{ textAlign: 'right' }}>{fmtQty(pendiente, '')}</td>
                    <td style={{ textAlign: 'right' }}><input className="input" type="number" step="0.001" value={r.devuelto} onChange={(e) => setRow(r.material_id, 'devuelto', e.target.value)} /></td>
                    <td style={{ textAlign: 'right' }}><input className="input" type="number" step="0.001" value={r.consumido} onChange={(e) => setRow(r.material_id, 'consumido', e.target.value)} /></td>
                    <td style={{ textAlign: 'right' }}><input className="input" type="number" step="0.001" value={r.roto} onChange={(e) => setRow(r.material_id, 'roto', e.target.value)} /></td>
                    <td style={{ textAlign: 'right' }}><input className="input" type="number" step="0.001" value={r.perdido} onChange={(e) => setRow(r.material_id, 'perdido', e.target.value)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <label className="muted">Nota (opcional)</label>
        <input className="input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: se rompió 1 por golpe, se consumieron 5kg en mezcla..." />
      </div>

      {err ? <div style={{ color: 'var(--bad)' }}>{err}</div> : null}
      <button className="btn primary" disabled={saving} onClick={submit}>{saving ? 'Guardando...' : 'Registrar devolución / cierre parcial'}</button>
    </div>
  )
}

export default function Materiales() {
  const [tab, setTab] = useState('inventario') // inventario|terceros|usos|ventas|historial
  const [q, setQ] = useState('')
  const [logic, setLogic] = useState('and')
  const [tipo, setTipo] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [propiedad, setPropiedad] = useState('') // '' | 'empresa' | 'tercero'
  const [vendibleFilter, setVendibleFilter] = useState('') // '' | '1' | '0'
  const [lowStock, setLowStock] = useState(false)
  const [cantidadMin, setCantidadMin] = useState('')
  const [cantidadMax, setCantidadMax] = useState('')
  const [page, setPage] = useState(1)
  const [invRefresh, setInvRefresh] = useState(0)

  const [data, setData] = useState({ materiales: [], tipos: [], page: { page: 1, pages: 1, page_size: 25, filtered_total: 0 } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [sortKey, setSortKey] = useState('id')
  const [sortDir, setSortDir] = useState('asc')

  const collator = useMemo(() => new Intl.Collator('es', { numeric: true, sensitivity: 'base' }), [])
  const suggestions = useMemo(() => {
    const tipos = Array.from(new Set([...(data?.tipos || [])].map((x) => String(x || '').trim()).filter(Boolean))).sort(collator.compare)
    const unidades = Array.from(
      new Set((data?.materiales || []).map((m) => String(m?.unidad || '').trim()).filter(Boolean))
    ).sort(collator.compare)
    const ubicaciones = Array.from(
      new Set((data?.materiales || []).map((m) => String(m?.ubicacion || '').trim()).filter(Boolean))
    ).sort(collator.compare)
    return { tipos, unidades, ubicaciones }
  }, [data?.tipos, data?.materiales, collator])
  const materialesSorted = useMemo(() => {
    const items = Array.isArray(data?.materiales) ? data.materiales : []
    const map = {
      id: { type: 'number', get: (m) => m.id },
      nombre: { type: 'string', get: (m) => m.nombre },
      tipo: { type: 'string', get: (m) => m.tipo },
      cantidad: { type: 'number', get: (m) => m.cantidad },
      en_uso: { type: 'number', get: (m) => m.en_uso },
      precio: { type: 'number', get: (m) => m.precio },
      ubicacion: { type: 'string', get: (m) => m.ubicacion }
    }
    const spec = map[sortKey] || map.id

    function cmp(a, b) {
      const av = spec.get(a) ?? null
      const bv = spec.get(b) ?? null
      if (av === null && bv === null) return 0
      if (av === null) return sortDir === 'asc' ? 1 : -1
      if (bv === null) return sortDir === 'asc' ? -1 : 1
      const out = spec.type === 'number' ? (Number(av) - Number(bv)) : collator.compare(String(av), String(bv))
      return sortDir === 'asc' ? out : -out
    }

    return [...items].sort(cmp)
  }, [data?.materiales, sortKey, sortDir])

  const [modal, setModal] = useState(null) // {mode:'create'|'edit', item}
  const [usoModal, setUsoModal] = useState(null) // {mode:'create'|'return'|'venta', usoId?}
  const [saving, setSaving] = useState(false)
  const [tabsCollapsed, setTabsCollapsed] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    const propioParam = tab === 'terceros' ? 0 : (propiedad === 'empresa' ? 1 : (propiedad === 'tercero' ? 0 : undefined))
    materialesList({
      q,
      logic,
      tipo,
      ubicacion,
      propio: propioParam,
      vendible: vendibleFilter,
      low_stock: lowStock ? 1 : undefined,
      cantidad_gte: cantidadMin,
      cantidad_lte: cantidadMax,
      sort: sortKey,
      order: sortDir,
      page,
      page_size: 25
    })
      .then((r) => { if (alive) setData(r) })
      .catch((e) => { if (alive) setError(e?.message || 'No se pudo cargar') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [tab, q, logic, tipo, ubicacion, propiedad, vendibleFilter, lowStock, cantidadMin, cantidadMax, sortKey, sortDir, page, invRefresh])

  async function save(payload) {
    setSaving(true)
    setError('')
    try {
      const clean = {
        ...payload,
        precio: Number(payload?.precio || 0),
        precio_venta: Number(payload?.precio_venta || 0),
        cantidad: Number(payload?.cantidad || 0),
        minimo: Number(payload?.minimo || 0),
        unidad: String(payload?.unidad || 'unidad').trim() || 'unidad',
        propio: Boolean(payload?.propio),
        vendible: Boolean(payload?.vendible)
      }

      if (modal?.mode === 'edit') await materialesUpdate(modal.item.id, clean)
      else await materialesCreate(clean)

      setModal(null)
      setPage(1)
      setInvRefresh((x) => x + 1)
    } catch (e) {
      setError(e?.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  // Usos
  const [usosQ, setUsosQ] = useState('')
  const [usosEstado, setUsosEstado] = useState('abierto')
  const [usosPage, setUsosPage] = useState(1)
  const [usosData, setUsosData] = useState({ items: [], page: { page: 1, pages: 1, total: 0, page_size: 25 } })
  const [usosLoading, setUsosLoading] = useState(false)
  const [usosErr, setUsosErr] = useState('')

  useEffect(() => {
    if (tab !== 'usos') return
    let alive = true
    setUsosLoading(true)
    setUsosErr('')
    materialesUsosList({ estado: usosEstado, q: usosQ, page: usosPage, page_size: 25 })
      .then((r) => { if (alive) setUsosData(r) })
      .catch((e) => { if (alive) setUsosErr(e?.message || 'No se pudo cargar') })
      .finally(() => { if (alive) setUsosLoading(false) })
    return () => { alive = false }
  }, [tab, usosEstado, usosQ, usosPage])

  function refreshUsos() {
    setUsosPage(1)
    setTimeout(() => setUsosPage((p) => p), 0)
  }

  // Historial
  const [movQ, setMovQ] = useState('')
  const [movTipo, setMovTipo] = useState('')
  const [movPage, setMovPage] = useState(1)
  const [movData, setMovData] = useState({ items: [], page: { page: 1, pages: 1, total: 0, page_size: 25 } })
  const [movLoading, setMovLoading] = useState(false)
  const [movErr, setMovErr] = useState('')

  useEffect(() => {
    if (tab !== 'historial') return
    let alive = true
    setMovLoading(true)
    setMovErr('')
    materialesMovimientosList({ tipo: movTipo, q: movQ, page: movPage, page_size: 25 })
      .then((r) => { if (alive) setMovData(r) })
      .catch((e) => { if (alive) setMovErr(e?.message || 'No se pudo cargar') })
      .finally(() => { if (alive) setMovLoading(false) })
    return () => { alive = false }
  }, [tab, movTipo, movQ, movPage])

  // Ventas
  const [ventasQ, setVentasQ] = useState('')
  const [ventasPage, setVentasPage] = useState(1)
  const [ventasData, setVentasData] = useState({
    items: [],
    page: { page: 1, pages: 1, total: 0, page_size: 25 },
    summary: { total_venta: 0, total_costo: 0, ganancia_estimada: 0 }
  })
  const [ventasLoading, setVentasLoading] = useState(false)
  const [ventasErr, setVentasErr] = useState('')

  useEffect(() => {
    if (tab !== 'ventas') return
    let alive = true
    setVentasLoading(true)
    setVentasErr('')
    materialesVentasList({ q: ventasQ, page: ventasPage, page_size: 25 })
      .then((r) => { if (alive) setVentasData(r) })
      .catch((e) => { if (alive) setVentasErr(e?.message || 'No se pudo cargar') })
      .finally(() => { if (alive) setVentasLoading(false) })
    return () => { alive = false }
  }, [tab, ventasQ, ventasPage])

  async function remove(item) {
    if (!confirm(`Eliminar "${item.nombre}"?`)) return
    setError('')
    try {
      await materialesDelete(item.id)
      setPage(1)
      setInvRefresh((x) => x + 1)
    } catch (e) {
      setError(e?.message || 'No se pudo eliminar')
    }
  }

  async function exportCsv({ scope = 'filtered' } = {}) {
    setError('')
    try {
      const sp = new URLSearchParams()
      if (scope === 'all') sp.set('scope', 'all')
      else {
        if (q) sp.set('q', q)
        if (logic) sp.set('logic', logic)
        if (tipo) sp.set('tipo', tipo)
        if (ubicacion) sp.set('ubicacion', ubicacion)
        const propioParam = tab === 'terceros' ? 0 : (propiedad === 'empresa' ? 1 : (propiedad === 'tercero' ? 0 : undefined))
        if (propioParam !== undefined) sp.set('propio', String(propioParam))
        if (vendibleFilter !== '') sp.set('vendible', String(vendibleFilter))
        if (lowStock) sp.set('low_stock', '1')
        if (cantidadMin !== '') sp.set('cantidad_gte', String(cantidadMin))
        if (cantidadMax !== '') sp.set('cantidad_lte', String(cantidadMax))
      }
      if (sortKey) sp.set('sort', sortKey)
      if (sortDir) sp.set('order', sortDir)
      const url = `/api/materiales/export.csv${sp.toString() ? `?${sp.toString()}` : ''}`

      const token = getToken()
      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      downloadBlob(blob, 'materiales.csv')
    } catch (e) {
      setError(e?.message || 'No se pudo exportar')
    }
  }

  async function exportUsosCsv({ scope = 'filtered' } = {}) {
    setUsosErr('')
    try {
      const sp = new URLSearchParams()
      if (scope === 'all') sp.set('scope', 'all')
      else {
        if (usosEstado) sp.set('estado', usosEstado)
        if (usosQ) sp.set('q', usosQ)
      }
      const url = `/api/materiales/usos/export.csv${sp.toString() ? `?${sp.toString()}` : ''}`

      const token = getToken()
      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      downloadBlob(blob, 'usos.csv')
    } catch (e) {
      setUsosErr(e?.message || 'No se pudo exportar')
    }
  }

  async function exportVentasCsv({ scope = 'filtered' } = {}) {
    setVentasErr('')
    try {
      const sp = new URLSearchParams()
      if (scope === 'all') sp.set('scope', 'all')
      else {
        if (ventasQ) sp.set('q', ventasQ)
      }
      const url = `/api/materiales/ventas/export.csv${sp.toString() ? `?${sp.toString()}` : ''}`

      const token = getToken()
      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      downloadBlob(blob, 'ventas.csv')
    } catch (e) {
      setVentasErr(e?.message || 'No se pudo exportar')
    }
  }

  async function exportMovCsv({ scope = 'filtered' } = {}) {
    setMovErr('')
    try {
      const sp = new URLSearchParams()
      if (scope === 'all') sp.set('scope', 'all')
      else {
        if (movTipo) sp.set('tipo', movTipo)
        if (movQ) sp.set('q', movQ)
      }
      const url = `/api/materiales/movimientos/export.csv${sp.toString() ? `?${sp.toString()}` : ''}`

      const token = getToken()
      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      downloadBlob(blob, 'movimientos.csv')
    } catch (e) {
      setMovErr(e?.message || 'No se pudo exportar')
    }
  }

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className={`card sectionTabs ${tabsCollapsed ? 'isCollapsed' : ''}`}> 
        <div className="row sectionTabsHeader" style={{ gap: 10, flexWrap: 'wrap', width: '100%' }}>
          {!tabsCollapsed && (
            <div className="row sectionTabsBody" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className={`btn ${tab === 'inventario' ? 'primary' : ''}`} onClick={() => setTab('inventario')}>Inventario</button>
              <button className={`btn ${tab === 'terceros' ? 'primary' : ''}`} onClick={() => setTab('terceros')}>Terceros</button>
              <button className={`btn ${tab === 'usos' ? 'primary' : ''}`} onClick={() => setTab('usos')}>Usos</button>
              <button className={`btn ${tab === 'ventas' ? 'primary' : ''}`} onClick={() => setTab('ventas')}>Ventas</button>
              <button className={`btn ${tab === 'historial' ? 'primary' : ''}`} onClick={() => setTab('historial')}>Historial</button>
            </div>
          )}
          <button className="btn sectionToggleIcon" type="button" aria-label="Mostrar u ocultar secciones" onClick={() => setTabsCollapsed((v) => !v)} style={{ marginLeft: 'auto' }}>
            {tabsCollapsed ? '▾' : '▴'}
          </button>
        </div>
      </div>

      {tab === 'inventario' || tab === 'terceros' ? (
      <>
      <div className="card pad">
        <div className="row between">
          <div>
            <div className="h1">{tab === 'terceros' ? 'Inventario de terceros' : 'Inventario'}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              {tab === 'terceros'
                ? 'Existencias que se administran (cliente/proyecto), pero no pertenecen a la empresa.'
                : 'Control de existencias (disponible / en uso), costos y parámetros de venta.'}
            </div>
          </div>
          <div>
            <button className="btn" onClick={() => exportCsv({ scope: 'filtered' })}>Exportar filtrado</button>
            <button className="btn" style={{ marginLeft: 8 }} onClick={() => exportCsv({ scope: 'all' })}>Exportar todo</button>
            <button className="btn primary" style={{ marginLeft: 8 }} onClick={() => setModal({ mode: 'create', item: tab === 'terceros' ? { propio: false } : null })}>+ Agregar</button>
          </div>
        </div>
        {error ? <div style={{ color: 'var(--bad)', marginTop: 10 }}>{error}</div> : null}

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer' }}><strong>Guía rápida</strong></summary>
          <div className="muted" style={{ marginTop: 8 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li><strong>Disponible</strong>: stock en almacén. <strong>En uso</strong>: stock fuera (obra/prestado).</li>
              <li><strong>Costo unitario</strong>: base para estimar pérdidas y ganancia.</li>
              <li><strong>Vendible</strong> + <strong>Precio de venta</strong>: habilita el registro de ventas (control interno).</li>
              <li><strong>Propiedad</strong>: <strong>Empresa</strong> (propio) vs <strong>Tercero</strong> (existencias del cliente/proyecto).</li>
              <li><strong>Mínimo</strong>: umbral de alerta para bajo stock (Disponible ≤ Mínimo).</li>
              <li><strong>Exportar filtrado</strong>: respeta filtros y orden. <strong>Exportar todo</strong>: ignora filtros.</li>
            </ul>
          </div>
        </details>
      </div>

      <div className="card pad">
        <div className="grid" style={{ gridTemplateColumns: '1fr 220px', gap: 10 }}>
          <input className="input" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Búsqueda general (nombre/tipo/ubicación)" />
          <select className="input" value={logic} onChange={(e) => { setLogic(e.target.value); setPage(1) }}>
            <option value="and">Filtrar con: Y (AND)</option>
            <option value="or">Filtrar con: O (OR)</option>
          </select>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
          <input className="input" value={tipo} onChange={(e) => { setTipo(e.target.value); setPage(1) }} list="dl_filtro_tipo" placeholder="Tipo (ej: EPP, herramienta...)" />
          <input className="input" value={ubicacion} onChange={(e) => { setUbicacion(e.target.value); setPage(1) }} list="dl_filtro_ubicacion" placeholder="Ubicación (ej: almacén, estante A...)" />
          <select className="input" value={vendibleFilter} onChange={(e) => { setVendibleFilter(e.target.value); setPage(1) }}>
            <option value="">Vendible: todos</option>
            <option value="1">Vendible: sí</option>
            <option value="0">Vendible: no</option>
          </select>
        </div>

        <datalist id="dl_filtro_tipo">
          {(suggestions.tipos || []).map((t) => <option key={t} value={t} />)}
        </datalist>
        <datalist id="dl_filtro_ubicacion">
          {(suggestions.ubicaciones || []).map((u) => <option key={u} value={u} />)}
        </datalist>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="row" style={{ gap: 10 }}>
              <input type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1) }} />
              <span><strong>Bajo mínimo</strong></span>
            </label>
            <span className="muted">Disponible ≤ Mínimo</span>
          </div>

          {tab === 'terceros' ? (
            <div className="muted" style={{ paddingTop: 10 }}><strong>Propiedad</strong>: fijo en <strong>Tercero</strong></div>
          ) : (
            <select className="input" value={propiedad} onChange={(e) => { setPropiedad(e.target.value); setPage(1) }}>
              <option value="">Propiedad: todas</option>
              <option value="empresa">Propiedad: empresa</option>
              <option value="tercero">Propiedad: tercero</option>
            </select>
          )}

          <div className="row" style={{ gap: 10 }}>
            <input className="input" style={{ width: '100%' }} value={cantidadMin} onChange={(e) => { setCantidadMin(e.target.value); setPage(1) }} placeholder="Cantidad ≥ (opcional)" />
            <input className="input" style={{ width: '100%' }} value={cantidadMax} onChange={(e) => { setCantidadMax(e.target.value); setPage(1) }} placeholder="Cantidad ≤ (opcional)" />
          </div>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          <button className="btn" onClick={() => {
            setQ('')
            setLogic('and')
            setTipo('')
            setUbicacion('')
            setVendibleFilter('')
            setLowStock(false)
            setCantidadMin('')
            setCantidadMax('')
            if (tab !== 'terceros') setPropiedad('')
            setPage(1)
          }}>Limpiar filtros</button>
          <span className="muted">Puedes combinar filtros y elegir AND/OR.</span>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
          <span className="muted">Ordenar por</span>
          <select className="input" value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ width: 220 }}>
            <option value="id">ID</option>
            <option value="nombre">Nombre</option>
            <option value="tipo">Tipo</option>
            <option value="cantidad">Disponible</option>
            <option value="en_uso">En uso</option>
            <option value="precio">Costo unitario</option>
            <option value="precio_venta">Precio venta</option>
            <option value="minimo">Mínimo</option>
            <option value="vendible">Vendible</option>
            <option value="propio">Propiedad</option>
            <option value="ubicacion">Ubicación</option>
          </select>
          <button className="btn" onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}>{sortDir === 'asc' ? 'Asc' : 'Desc'}</button>
          <span className="muted">Orden aplicado a todo el listado</span>
        </div>
      </div>

      <div className="card">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'right' }}>Disponible</th>
                <th style={{ textAlign: 'right' }}>En uso</th>
                <th style={{ textAlign: 'right' }}>Mín.</th>
                <th style={{ textAlign: 'right' }}>Costo</th>
                <th style={{ textAlign: 'right' }}>Venta</th>
                <th>Vendible</th>
                <th>Propiedad</th>
                <th>Ubicación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data.materiales || []).map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <strong>{m.nombre}</strong>
                      {Number(m.minimo || 0) > 0 && Number(m.cantidad || 0) <= Number(m.minimo || 0) ? (
                        <span className="badge bad" style={{ marginLeft: 0 }}>Bajo mínimo</span>
                      ) : null}
                    </div>
                  </td>
                  <td>{m.tipo || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{fmtQty(m.cantidad, m.unidad)}</td>
                  <td style={{ textAlign: 'right' }}>{fmtQty(m.en_uso, m.unidad)}</td>
                  <td style={{ textAlign: 'right' }} className="muted">{fmtQty(m.minimo, m.unidad)}</td>
                  <td style={{ textAlign: 'right' }}>{Number(m.precio || 0).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>{Number(m.precio_venta || 0).toFixed(2)}</td>
                  <td>{m.vendible ? <span className="badge good" style={{ marginLeft: 0 }}>Sí</span> : <span className="muted">—</span>}</td>
                  <td>{m.propio ? <span className="badge" style={{ marginLeft: 0 }}>Empresa</span> : <span className="badge" style={{ marginLeft: 0 }}>Tercero</span>}</td>
                  <td>{m.ubicacion || '—'}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn" onClick={() => setModal({ mode: 'edit', item: m })}>Editar</button>
                      <button className="btn danger" onClick={() => remove(m)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.materiales?.length && !loading ? <tr><td colSpan={12} className="muted">Sin datos</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="row between" style={{ padding: 12 }}>
          <span className="muted">Página {data.page?.page || 1} / {data.page?.pages || 1}</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn" disabled={(data.page?.page || 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
            <button className="btn" disabled={(data.page?.page || 1) >= (data.page?.pages || 1)} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
          </div>
        </div>
      </div>

      {modal ? (
        <Modal title={modal.mode === 'edit' ? 'Editar material' : 'Agregar material'} onClose={() => setModal(null)}>
          <FormMaterial initial={modal.item} onSubmit={save} saving={saving} suggestions={suggestions} />
        </Modal>
      ) : null}

      </>
      ) : null}

      {tab === 'usos' ? (
        <div className="grid" style={{ gap: 12 }}>
          <div className="card pad">
            <div className="row between">
              <div>
                <div className="h1">Usos</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Registra salidas (materiales fuera) y luego contabiliza lo pendiente: devuelto / consumido / roto / perdido.
                </div>
              </div>
              <div>
                <button className="btn" onClick={() => exportUsosCsv({ scope: 'filtered' })}>Exportar filtrado</button>
                <button className="btn" style={{ marginLeft: 8 }} onClick={() => exportUsosCsv({ scope: 'all' })}>Exportar todo</button>
                <button className="btn primary" style={{ marginLeft: 8 }} onClick={() => setUsoModal({ mode: 'create' })}>+ Nueva salida</button>
              </div>
            </div>
            {usosErr ? <div style={{ color: 'var(--bad)', marginTop: 10 }}>{usosErr}</div> : null}

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer' }}><strong>Guía rápida</strong></summary>
              <div className="muted" style={{ marginTop: 8 }}>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li><strong>Nueva salida</strong> descuenta de <strong>Disponible</strong> y suma a <strong>En uso</strong>.</li>
                  <li><strong>Devolver</strong> permite cierre parcial: devuelto vuelve a stock; consumido/roto/perdido quedan como salida definitiva.</li>
                  <li>Un uso se cierra automáticamente cuando todo queda contabilizado.</li>
                  <li><strong>Exportar filtrado</strong>: respeta estado y búsqueda. <strong>Exportar todo</strong>: ignora filtros.</li>
                </ul>
              </div>
            </details>

            <div className="grid" style={{ gridTemplateColumns: '1fr 220px', gap: 10, marginTop: 12 }}>
              <input className="input" value={usosQ} onChange={(e) => { setUsosQ(e.target.value); setUsosPage(1) }} placeholder="Buscar por responsable/destino/notas" />
              <select className="input" value={usosEstado} onChange={(e) => { setUsosEstado(e.target.value); setUsosPage(1) }}>
                <option value="abierto">Abiertos</option>
                <option value="cerrado">Cerrados</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>
          </div>

          <div className="card">
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Estado</th>
                    <th>Responsable</th>
                    <th>Destino</th>
                    <th style={{ textAlign: 'right' }}>Items</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usosLoading ? (
                    <tr><td colSpan={6} style={{ padding: 16 }} className="muted">Cargando...</td></tr>
                  ) : (usosData?.items || []).length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 16 }} className="muted">Sin resultados</td></tr>
                  ) : (
                    (usosData.items || []).map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td><span className="badge">{u.estado}</span></td>
                        <td>{u.responsable || <span className="muted">—</span>}</td>
                        <td>{u.destino || <span className="muted">—</span>}</td>
                        <td style={{ textAlign: 'right' }}>{u.items_count}</td>
                        <td>
                          <button className="btn" onClick={() => setUsoModal({ mode: 'return', usoId: u.id })}>Devolver</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="row between" style={{ padding: 12 }}>
              <span className="muted">Página {usosData.page?.page || 1} / {usosData.page?.pages || 1}</span>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn" disabled={(usosData.page?.page || 1) <= 1} onClick={() => setUsosPage((p) => Math.max(1, p - 1))}>Anterior</button>
                <button className="btn" disabled={(usosData.page?.page || 1) >= (usosData.page?.pages || 1)} onClick={() => setUsosPage((p) => p + 1)}>Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'ventas' ? (
        <div className="grid" style={{ gap: 12 }}>
          <div className="card pad">
            <div className="row between">
              <div>
                <div className="h1">Ventas</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Registro interno de ventas de productos vendibles (no es caja). Se usa para métricas de ingreso, costo y ganancia estimada.
                </div>
              </div>
              <div>
                <button className="btn" onClick={() => exportVentasCsv({ scope: 'filtered' })}>Exportar filtrado</button>
                <button className="btn" style={{ marginLeft: 8 }} onClick={() => exportVentasCsv({ scope: 'all' })}>Exportar todo</button>
                <button className="btn primary" style={{ marginLeft: 8 }} onClick={() => setUsoModal({ mode: 'venta' })}>+ Registrar venta</button>
              </div>
            </div>
            {ventasErr ? <div style={{ color: 'var(--bad)', marginTop: 10 }}>{ventasErr}</div> : null}

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer' }}><strong>Guía rápida</strong></summary>
              <div className="muted" style={{ marginTop: 8 }}>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Solo se pueden vender materiales <strong>Propiedad=Empresa</strong> y marcados como <strong>Vendible</strong>.</li>
                  <li>Al registrar una venta, se descuenta del <strong>Disponible</strong> y se crea un movimiento tipo <strong>venta</strong>.</li>
                  <li>Los totales usan snapshots (costo/precio de venta) para mantener reportes consistentes.</li>
                  <li><strong>Exportar filtrado</strong>: respeta la búsqueda. <strong>Exportar todo</strong>: ignora filtros.</li>
                </ul>
              </div>
            </details>

            <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <span className="badge" style={{ marginLeft: 0 }}>Ingreso: {Number(ventasData?.summary?.total_venta || 0).toFixed(2)}</span>
              <span className="badge" style={{ marginLeft: 0 }}>Costo: {Number(ventasData?.summary?.total_costo || 0).toFixed(2)}</span>
              <span className="badge good" style={{ marginLeft: 0 }}>Ganancia est.: {Number(ventasData?.summary?.ganancia_estimada || 0).toFixed(2)}</span>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 10, marginTop: 12 }}>
              <input className="input" value={ventasQ} onChange={(e) => { setVentasQ(e.target.value); setVentasPage(1) }} placeholder="Buscar por notas o por producto" />
            </div>
          </div>

          <div className="card">
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Notas</th>
                    <th style={{ textAlign: 'right' }}>Items</th>
                    <th style={{ textAlign: 'right' }}>Ingreso</th>
                    <th style={{ textAlign: 'right' }}>Costo</th>
                    <th style={{ textAlign: 'right' }}>Ganancia est.</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasLoading ? (
                    <tr><td colSpan={7} style={{ padding: 16 }} className="muted">Cargando...</td></tr>
                  ) : (ventasData?.items || []).length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 16 }} className="muted">Sin resultados</td></tr>
                  ) : (
                    (ventasData.items || []).map((v) => (
                      <tr key={v.id}>
                        <td>{v.id}</td>
                        <td className="muted">{String(v.created_at || '').replace('T', ' ').slice(0, 19)}</td>
                        <td>{v.notas ? v.notas : <span className="muted">—</span>}</td>
                        <td style={{ textAlign: 'right' }}>{v.items_count}</td>
                        <td style={{ textAlign: 'right' }}>{Number(v.total_venta || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{Number(v.total_costo || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right' }}>{Number(v.ganancia_estimada || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="row between" style={{ padding: 12 }}>
              <span className="muted">Página {ventasData.page?.page || 1} / {ventasData.page?.pages || 1}</span>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn" disabled={(ventasData.page?.page || 1) <= 1} onClick={() => setVentasPage((p) => Math.max(1, p - 1))}>Anterior</button>
                <button className="btn" disabled={(ventasData.page?.page || 1) >= (ventasData.page?.pages || 1)} onClick={() => setVentasPage((p) => p + 1)}>Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'historial' ? (
        <div className="grid" style={{ gap: 12 }}>
          <div className="card pad">
            <div className="h1">Historial</div>
            <div className="muted" style={{ marginTop: 6 }}>Movimientos: salida, devolución, consumo, roto, perdido, venta.</div>
            {movErr ? <div style={{ color: 'var(--bad)', marginTop: 10 }}>{movErr}</div> : null}

            <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <button className="btn" onClick={() => exportMovCsv({ scope: 'filtered' })}>Exportar filtrado</button>
              <button className="btn" style={{ marginLeft: 8 }} onClick={() => exportMovCsv({ scope: 'all' })}>Exportar todo</button>
            </div>

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer' }}><strong>Guía rápida</strong></summary>
              <div className="muted" style={{ marginTop: 8 }}>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Es la trazabilidad completa del inventario: qué salió, qué volvió, qué se consumió, y qué se vendió.</li>
                  <li>Filtra por <strong>tipo</strong> para auditorías rápidas (por ejemplo: solo <strong>venta</strong> o solo <strong>perdido</strong>).</li>
                  <li>El CSV incluye un costo total estimado usando el <strong>costo unitario actual</strong> del material.</li>
                </ul>
              </div>
            </details>

            <div className="grid" style={{ gridTemplateColumns: '1fr 220px', gap: 10, marginTop: 12 }}>
              <input className="input" value={movQ} onChange={(e) => { setMovQ(e.target.value); setMovPage(1) }} placeholder="Buscar por material/actor/nota" />
              <select className="input" value={movTipo} onChange={(e) => { setMovTipo(e.target.value); setMovPage(1) }}>
                <option value="">Todos</option>
                <option value="salida">salida</option>
                <option value="devolucion">devolucion</option>
                <option value="consumo">consumo</option>
                <option value="roto">roto</option>
                <option value="perdido">perdido</option>
                <option value="venta">venta</option>
              </select>
            </div>
          </div>

          <div className="card">
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Material</th>
                    <th style={{ textAlign: 'right' }}>Cantidad</th>
                    <th>Actor</th>
                    <th>Nota</th>
                    <th style={{ textAlign: 'right' }}>Uso</th>
                  </tr>
                </thead>
                <tbody>
                  {movLoading ? (
                    <tr><td colSpan={7} style={{ padding: 16 }} className="muted">Cargando...</td></tr>
                  ) : (movData?.items || []).length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 16 }} className="muted">Sin resultados</td></tr>
                  ) : (
                    (movData.items || []).map((mv) => (
                      <tr key={mv.id}>
                        <td className="muted">{String(mv.ts || '').replace('T', ' ').slice(0, 19)}</td>
                        <td><span className="badge">{mv.tipo}</span></td>
                        <td>
                          <strong>{mv.material?.nombre || '—'}</strong>
                          <div className="muted">{mv.material?.tipo || '—'} · {mv.material?.unidad || 'unidad'}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>{fmtQty(mv.cantidad, mv.material?.unidad)}</td>
                        <td>{mv.actor || <span className="muted">—</span>}</td>
                        <td>{mv.nota || <span className="muted">—</span>}</td>
                        <td style={{ textAlign: 'right' }}>{mv.uso_id || <span className="muted">—</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="row between" style={{ padding: 12 }}>
              <span className="muted">Página {movData.page?.page || 1} / {movData.page?.pages || 1}</span>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn" disabled={(movData.page?.page || 1) <= 1} onClick={() => setMovPage((p) => Math.max(1, p - 1))}>Anterior</button>
                <button className="btn" disabled={(movData.page?.page || 1) >= (movData.page?.pages || 1)} onClick={() => setMovPage((p) => p + 1)}>Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {usoModal?.mode === 'create' ? (
        <Modal title="Nueva salida / uso" onClose={() => setUsoModal(null)}>
          <UsoForm onClose={() => setUsoModal(null)} onCreated={() => { refreshUsos(); setPage(1) }} />
        </Modal>
      ) : null}

      {usoModal?.mode === 'return' ? (
        <Modal title={`Registrar devolución (Uso #${usoModal.usoId})`} onClose={() => setUsoModal(null)}>
          <UsoReturnForm usoId={usoModal.usoId} onClose={() => setUsoModal(null)} onSaved={() => { refreshUsos(); setPage(1) }} />
        </Modal>
      ) : null}

      {usoModal?.mode === 'venta' ? (
        <Modal title="Registrar venta" onClose={() => setUsoModal(null)}>
          <VentaForm
            onClose={() => setUsoModal(null)}
            onCreated={() => {
              setTab('ventas')
              setVentasPage(1)
              setTimeout(() => setVentasPage((p) => p), 0)
              setPage(1)
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}
