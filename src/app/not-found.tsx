import Link from 'next/link'
import Logo from '@/components/ui/Logo'

export default function NoEncontrada() {
  return (
    <div
      style={{
        minHeight: 'var(--vh-full)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <Logo size={44} sobre="claro" />
      <h1 className="display" style={{ fontSize: 32 }}>Esta pantalla no existe</h1>
      <p style={{ fontSize: 14, color: 'var(--texto-dim)', maxWidth: 380 }}>
        Puede que el enlace esté mal, o que sea una pantalla que todavía no se
        construye. Las fases están en la documentación del proyecto.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 6,
          padding: '9px 16px',
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
          background: 'var(--verde)',
          color: 'var(--sobre-acento)',
          border: '1px solid var(--verde-hondo)',
          borderRadius: 6,
        }}
      >
        Volver al inicio
      </Link>
    </div>
  )
}
