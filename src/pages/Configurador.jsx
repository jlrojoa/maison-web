// src/pages/Configurador.jsx
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDistribuidor } from '../contexts/DistribuidorContext'
import './Configurador.css'

const GRADOS = ['AA', 'A', 'B', 'C']
const fmt = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)

export default function Configurador() {
  const ctx = useDistribuidor()
  const distribuidor = ctx?.distribuidor ?? null

  return (
    <div className="cfg-page">
      <header className="cfg-header">
        <div className="cfg-header-content">
          <div className="cfg-logo">Brendell</div>
          <span className="cfg-auth-status">
            {distribuidor ? '👤 Distribuidor logueado' : '📍 Sin sesión'}
          </span>
        </div>
      </header>
      <div className="cfg-container">
        <h1 className="cfg-h1">Configura tu Sofá</h1>
        <p className="cfg-subtitle">Personaliza seleccionando tipo, modelo, medida y tela que mejor se adapte a tu espacio.</p>
        <div className="cfg-grid-2col">
          <div>Left column placeholder</div>
          <div>Right column placeholder</div>
        </div>
      </div>
    </div>
  )
}
