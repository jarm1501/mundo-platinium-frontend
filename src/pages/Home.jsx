import React, { useEffect, useMemo, useState } from 'react'

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="card pad" style={{ scrollMarginTop: 86 }}>
      <div className="h2">{title}</div>
      {subtitle ? <div className="muted" style={{ marginTop: 6, maxWidth: 900 }}>{subtitle}</div> : null}
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  )
}

function PillLink({ href, children }) {
  return (
    <a href={href} className="mp-pillLink">
      {children}
    </a>
  )
}

function Stat({ k, v }) {
  return (
    <div className="mp-stat">
      <div className="mp-statV">{v}</div>
      <div className="mp-statK">{k}</div>
    </div>
  )
}

function PlaceholderImage({ label = 'Imagen corporativa' }) {
  // Placeholder propio (sin dependencias externas ni imágenes con copyright)
  const svg = useMemo(() => {
    const safe = String(label || 'Imagen corporativa').slice(0, 40)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#1f2a44"/>
    </linearGradient>
  </defs>
  <rect width="800" height="420" rx="22" fill="url(#g)"/>
  <circle cx="680" cy="110" r="70" fill="#2563eb" opacity="0.35"/>
  <circle cx="610" cy="180" r="95" fill="#22c55e" opacity="0.12"/>
  <rect x="60" y="70" width="520" height="18" rx="9" fill="#e8ecf1" opacity="0.18"/>
  <rect x="60" y="110" width="440" height="12" rx="6" fill="#e8ecf1" opacity="0.12"/>
  <rect x="60" y="140" width="500" height="12" rx="6" fill="#e8ecf1" opacity="0.12"/>
  <rect x="60" y="170" width="360" height="12" rx="6" fill="#e8ecf1" opacity="0.10"/>
  <text x="60" y="310" font-family="Arial, sans-serif" font-size="22" fill="#e8ecf1" opacity="0.9">${safe}</text>
</svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
  }, [label])

  return (
    <img className="mp-img" src={svg} alt={label} loading="lazy" />
  )
}

function SectionNav() {
  const [collapsed, setCollapsed] = useState(false)
  const items = [
    { href: '#quienes', label: 'Quiénes somos' },
    { href: '#servicios', label: 'Servicios' },
    { href: '#sectores', label: 'Sectores' },
    { href: '#proceso', label: 'Proceso' },
    { href: '#compromisos', label: 'Compromisos' },
    { href: '#galeria', label: 'Galería' },
    { href: '#faq', label: 'Preguntas' },
    { href: '#contacto', label: 'Contacto' }
  ]

  return (
    <div className={`card mp-subnav ${collapsed ? 'isCollapsed' : ''}`}> 
      <div className="row sectionTabsHeader" style={{ gap: 8, flexWrap: 'wrap', width: '100%' }}>
        {!collapsed && (
          <div className="row mp-subnavLinks sectionTabsBody" style={{ gap: 8, flexWrap: 'wrap' }}>
            {items.map((it) => (
              <PillLink key={it.href} href={it.href}>{it.label}</PillLink>
            ))}
          </div>
        )}
        <button
          className="btn sectionToggleIcon"
          type="button"
          aria-label="Mostrar u ocultar índice"
          onClick={() => setCollapsed((v) => !v)}
          style={{ marginLeft: 'auto' }}
        >
          {collapsed ? '▾' : '▴'}
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const year = new Date().getFullYear()
  const [serviceTab, setServiceTab] = useState('operaciones')

  useEffect(() => {
    // Si entran con un hash (#contacto), hacer scroll suave.
    const { hash } = window.location
    if (!hash) return
    const el = document.querySelector(hash)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="card hero mp-hero">
        <div className="mp-heroGrid">
          <div>
            <div className="mp-kicker">Operaciones · Proyectos · Mantenimiento</div>
            <div className="h1" style={{ marginTop: 6 }}>Mundo Platinium</div>
            <div className="muted" style={{ marginTop: 8, maxWidth: 920 }}>
              Soluciones integrales para operaciones y proyectos, con enfoque en cumplimiento,
              trazabilidad y atención oportuna. Ejecutamos con orden, comunicación clara y control de calidad.
            </div>

            <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <a className="btn primary link" href="#contacto">Solicitar cotización</a>
              <a className="btn link" href="#servicios">Ver servicios</a>
              <a className="btn link" href="#quienes">Quiénes somos</a>
            </div>

            <div className="mp-stats" style={{ marginTop: 14 }}>
              <Stat k="Atención" v="Lun–Sáb" />
              <Stat k="Tiempo de respuesta" v="≤ 24h" />
              <Stat k="Cobertura" v="Zona centro" />
              <Stat k="Garantía" v="Por contrato" />
            </div>
          </div>

          <div className="mp-heroMedia">
            <PlaceholderImage label="Equipo y operaciones" />
          </div>
        </div>
      </div>

      <SectionNav />

      <Section
        id="quienes"
        title="Quiénes somos"
        subtitle="Un equipo enfocado en ejecución, orden y resultados para clientes residenciales y corporativos."
      >
        <div className="mp-two">
          <div>
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li><strong>Misión</strong>: entregar soluciones confiables con atención rápida y comunicación clara.</li>
              <li><strong>Visión</strong>: ser un aliado reconocido por calidad, seriedad y cumplimiento.</li>
              <li><strong>Valores</strong>: responsabilidad, seguridad, transparencia y mejora continua.</li>
            </ul>
            <div className="card pad panel" style={{ marginTop: 12 }}>
              <div className="muted">
                Trabajamos con planificación, evidencia y control de calidad.
                Cada proyecto se documenta y se entrega con cierre formal.
              </div>
            </div>
          </div>
          <div>
            <PlaceholderImage label="Nuestra trayectoria" />
          </div>
        </div>
      </Section>

      <Section
        id="servicios"
        title="Servicios"
        subtitle="Selecciona una categoría para ver el alcance y los entregables principales."
      >
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button className={serviceTab === 'operaciones' ? 'btn primary' : 'btn'} type="button" onClick={() => setServiceTab('operaciones')}>Operaciones</button>
          <button className={serviceTab === 'mantenimiento' ? 'btn primary' : 'btn'} type="button" onClick={() => setServiceTab('mantenimiento')}>Mantenimiento</button>
          <button className={serviceTab === 'proyectos' ? 'btn primary' : 'btn'} type="button" onClick={() => setServiceTab('proyectos')}>Proyectos</button>
        </div>

        <div className="mp-services" style={{ marginTop: 12 }}>
          {serviceTab === 'operaciones' ? (
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Atención operativa a requerimientos del día a día (planificado y urgente).</li>
              <li>Gestión de equipos/herramientas, logística y soporte en campo.</li>
              <li>Supervisión, checklist y entregables por actividad.</li>
            </ul>
          ) : null}
          {serviceTab === 'mantenimiento' ? (
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Mantenimiento preventivo y correctivo (según alcance).</li>
              <li>Reportes técnicos, recomendaciones y plan de acción.</li>
              <li>Repuestos/consumibles: control de uso y justificación.</li>
            </ul>
          ) : null}
          {serviceTab === 'proyectos' ? (
            <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Ejecución por etapas: alcance, cronograma, riesgos, control de cambios.</li>
              <li>Documentación: actas, evidencias y entregables.</li>
              <li>Soporte post-entrega y garantía según contrato.</li>
            </ul>
          ) : null}
        </div>
      </Section>

      <Section
        id="sectores"
        title="Sectores atendidos"
        subtitle="Atendemos requerimientos operativos y de proyecto con foco en continuidad y seguridad."
      >
        <div className="mp-cards3">
          <div className="card pad panel">
            <div className="h2">Empresas</div>
            <div className="muted" style={{ marginTop: 6 }}>Soporte operativo, mantenimiento, mejoras.</div>
          </div>
          <div className="card pad panel">
            <div className="h2">Obras</div>
            <div className="muted" style={{ marginTop: 6 }}>Trabajo por frentes, control y cierre por actividad.</div>
          </div>
          <div className="card pad panel">
            <div className="h2">Residencial</div>
            <div className="muted" style={{ marginTop: 6 }}>Servicios puntuales con agenda y garantía.</div>
          </div>
        </div>
      </Section>

      <Section
        id="proceso"
        title="Cómo trabajamos"
        subtitle="Un proceso simple para que el cliente tenga claridad."
      >
        <div className="mp-steps">
          <div className="mp-step">
            <div className="mp-stepN">1</div>
            <div>
              <div className="mp-stepT">Levantamiento</div>
              <div className="muted">Entendemos necesidad, alcance y urgencia.</div>
            </div>
          </div>
          <div className="mp-step">
            <div className="mp-stepN">2</div>
            <div>
              <div className="mp-stepT">Propuesta</div>
              <div className="muted">Cotización, tiempos y condiciones claras.</div>
            </div>
          </div>
          <div className="mp-step">
            <div className="mp-stepN">3</div>
            <div>
              <div className="mp-stepT">Ejecución</div>
              <div className="muted">Trabajo con evidencias y comunicación.</div>
            </div>
          </div>
          <div className="mp-step">
            <div className="mp-stepN">4</div>
            <div>
              <div className="mp-stepT">Cierre</div>
              <div className="muted">Entrega, verificación y garantía según contrato.</div>
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="compromisos"
        title="Compromisos"
        subtitle="Estándares que guían cada entrega y comunicación con el cliente."
      >
        <div className="mp-cards3">
          <div className="card pad panel">
            <div className="h2">Planificación</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Alcances claros, cronograma realista y responsables definidos.
            </div>
          </div>
          <div className="card pad panel">
            <div className="h2">Evidencias</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Registro de avances, cambios y entregables por actividad.
            </div>
          </div>
          <div className="card pad panel">
            <div className="h2">Calidad</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Revisión final y cierre formal con garantía según contrato.
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="galeria"
        title="Galería"
        subtitle="Muestras de proyectos y actividades recientes."
      >
        <div className="mp-gallery">
          <PlaceholderImage label="Proyecto 1" />
          <PlaceholderImage label="Proyecto 2" />
          <PlaceholderImage label="Proyecto 3" />
        </div>
      </Section>

      <Section
        id="faq"
        title="Preguntas frecuentes"
        subtitle="Respuestas rápidas a dudas habituales."
      >
        <div className="mp-faq">
          <details className="card pad panel">
            <summary><strong>¿En qué zonas trabajan?</strong></summary>
            <div className="muted" style={{ marginTop: 8 }}>
              Cobertura referencial: zona centro y alrededores. Podemos evaluar otras zonas según el proyecto.
            </div>
          </details>
          <details className="card pad panel">
            <summary><strong>¿Cómo se calcula una cotización?</strong></summary>
            <div className="muted" style={{ marginTop: 8 }}>
              Depende del alcance, materiales, tiempos y complejidad. Enviamos una propuesta clara con condiciones y fechas.
            </div>
          </details>
          <details className="card pad panel">
            <summary><strong>¿Ofrecen garantía?</strong></summary>
            <div className="muted" style={{ marginTop: 8 }}>
              Sí, según lo acordado en contrato/orden de servicio.
            </div>
          </details>
        </div>
      </Section>

      <Section
        id="contacto"
        title="Contacto"
        subtitle="Canales de atención y solicitud de cotización."
      >
        <div className="mp-two">
          <div>
            <div className="card pad panel">
              <div className="h2">Información</div>
              <div className="muted" style={{ marginTop: 8 }}>
                <div><strong>Dirección:</strong> Atención por agenda y coordinación previa.</div>
                <div style={{ marginTop: 6 }}><strong>Teléfono:</strong> Disponible al solicitar cotización.</div>
                <div style={{ marginTop: 6 }}><strong>Correo:</strong> contacto@mundoplatinium.com</div>
                <div style={{ marginTop: 6 }}><strong>RIF:</strong> J-00000000-0</div>
                <div style={{ marginTop: 6 }}><strong>Horario:</strong> Lunes a Sábado, 8:00–17:00</div>
              </div>
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              Para cotizaciones, indica: tipo de servicio, ubicación, fechas y fotos si aplica.
            </div>
          </div>
          <div>
            <PlaceholderImage label="Ubicación / mapa" />
          </div>
        </div>
      </Section>

      <div className="card pad mp-footer">
        <div className="muted">© {year} Mundo Platinium. Todos los derechos reservados.</div>
        <div className="muted" style={{ marginTop: 6 }}>
          <a className="link" href="#">Volver arriba</a>
        </div>
      </div>
    </div>
  )
}
