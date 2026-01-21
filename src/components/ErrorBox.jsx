import React from 'react'

function normalizeError(error) {
  if (!error) return { code: '', detail: '' }

  if (typeof error === 'string') {
    return { code: error, detail: '' }
  }

  const data = error?.data
  const code = error?.code || data?.code || data?.error_code || data?.error || ''
  const detail = data?.detail || data?.message || (typeof data?.error === 'string' ? data.error : '') || error?.message || ''
  return { code, detail }
}

function friendlyMessage({ code, detail }) {
  if (detail) return detail

  switch (code) {
    case 'faltan_credenciales':
      return 'Ingresa usuario y clave.'
    case 'credenciales_invalidas':
      return 'El usuario o la clave no son correctos.'
    case 'cuenta_pendiente':
      return 'Tu cuenta está pendiente de aprobación.'
    case 'cuenta_rechazada':
      return 'Tu cuenta fue rechazada. Si crees que es un error, contacta a un administrador.'
    case 'cuenta_baneada':
      return 'Tu cuenta fue bloqueada. Contacta a un administrador.'
    case 'cuenta_inactiva':
      return 'Tu cuenta está inactiva. Contacta a un administrador.'
    default:
      return 'No se pudo iniciar sesión. Intenta de nuevo.'
  }
}

export default function ErrorBox({ error }) {
  if (!error) return null

  const norm = normalizeError(error)
  const msg = friendlyMessage(norm)

  return (
    <div className="error-box" role="alert" style={{ marginTop: 12 }}>
      <div><small>{msg}</small></div>
    </div>
  )
}
