import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-neutral-light to-white">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-primary">
            Control de Asistencias
          </h1>
          <p className="text-xl text-secondary">
            Sistema de gestión de eventos - Caja Huancayo
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/eventos"
            className="px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors"
          >
            Ver Eventos
          </Link>
        </div>

        <div className="mt-12 p-6 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-lg font-semibold text-secondary mb-2">
            Características
          </h2>
          <ul className="text-left space-y-2 text-secondary-light">
            <li>✓ Registro de asistencias en tiempo real</li>
            <li>✓ Entrega de souvenirs con firma digital</li>
            <li>✓ Sincronización multi-dispositivo</li>
            <li>✓ Dashboard con estadísticas en vivo</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
