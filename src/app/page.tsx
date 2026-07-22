import Link from 'next/link';
import os from 'os';

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  try {
    for (const name of Object.keys(interfaces)) {
      for (const netInterface of interfaces[name] || []) {
        if (netInterface.family === 'IPv4' && !netInterface.internal) {
          addresses.push(netInterface.address);
        }
      }
    }
  } catch (error) {
    console.error('Error getting local IPs:', error);
  }
  return addresses.length > 0 ? addresses : ['127.0.0.1'];
}

export default function Home() {
  const localIps = getLocalIPs();
  const primaryIp = localIps[0];
  const serverPort = 3001;
  const connectionUrl = `http://${primaryIp}:${serverPort}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(connectionUrl)}`;

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="max-w-4xl w-full space-y-10 text-center">
        {/* Header */}
        <div className="space-y-4">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-full border border-emerald-500/20">
            Servidor Local Activo
          </span>
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 tracking-tight">
            Control de Asistencias
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Sistema unificado de gestión de eventos y souvenirs - Caja Huancayo.
          </p>
        </div>

        {/* Panel principal */}
        <div className="grid md:grid-cols-2 gap-8 text-left">
          {/* Tarjeta izquierda: Opciones de navegación */}
          <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <span>💻</span> Panel Administrativo
              </h2>
              <p className="text-slate-400 text-sm">
                Accede al listado de eventos, carga invitados desde archivos de Excel, gestiona el stock de souvenirs y descarga el reporte final de asistencia.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Visualización en tiempo real
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Control de ingresos tardíos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Exportación a Excel (Windows/macOS)
                </li>
              </ul>
            </div>
            <Link
              href="/eventos"
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 text-center rounded-xl font-bold tracking-wide transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
            >
              Gestionar Eventos
            </Link>
          </div>

          {/* Tarjeta derecha: Conexión Móvil Zebra */}
          <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1 space-y-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span>📱</span> Conexión Zebra TC15
              </h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Escanea el código QR desde la pantalla de configuración en tu dispositivo móvil para enlazar la app con esta base de datos local.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                <div className="text-slate-500 uppercase font-semibold tracking-wider">Dirección IP de Enlace:</div>
                {localIps.map((ip) => (
                  <div key={ip} className="text-cyan-400 font-bold">
                    http://{ip}:{serverPort}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xl flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR Code para enlace local"
                width={150}
                height={150}
                className="w-[150px] h-[150px]"
              />
            </div>
          </div>
        </div>

        <div className="text-slate-500 text-xs">
          Nota: Asegúrate de que tanto esta computadora como los dispositivos Zebra estén conectados a la misma red WiFi.
        </div>
      </div>
    </main>
  );
}
