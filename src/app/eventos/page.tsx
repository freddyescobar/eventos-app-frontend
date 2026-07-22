'use client';

import { useEffect, useState } from 'react';
import { useEventsStore } from '@/lib/stores/useEventsStore';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EventosPage() {
  const router = useRouter();
  const { events, isLoading, error, fetchEvents, createEvent, removeEvent, setActiveEvent, toggleEventActive, closeEvent } = useEventsStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterTab, setFilterTab] = useState<'open' | 'closed'>('open');
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: '',
    cutoff_time: '',
  });
  const [networkInfo, setNetworkInfo] = useState<{ ips: string[], port: number } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Fetch info de red local para sincronización
  useEffect(() => {
    fetch('/api/admin/network')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNetworkInfo(data.data);
        }
      })
      .catch((err) => console.error('Error fetching network info:', err));
  }, []);

  // Fetch inicial y polling cada 5 segundos
  useEffect(() => {
    fetchEvents();

    const interval = setInterval(() => {
      fetchEvents();
    }, 5000); // Polling cada 5 segundos

    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const newEvent = await createEvent({
      ...formData,
      is_active: true,
      status: 'open',
      background_image_path: null,
    });

    if (newEvent) {
      setShowCreateModal(false);
      setFormData({ name: '', location: '', date: '', cutoff_time: '' });
    }
  };

  const handleCloseEvent = async (id: number) => {
    if (confirm('¿Estás seguro de cerrar definitivamente este evento? Esto inhabilitará su uso en los dispositivos móviles.')) {
      await closeEvent(id);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este evento? Esto también eliminará todas las personas y asistencias relacionadas.')) {
      await removeEvent(id);
    }
  };

  const handleViewEvent = (event: typeof events[0]) => {
    setActiveEvent(event);
    router.push(`/eventos/${event.id}`);
  };

  const handleToggleActive = async (eventId: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    await toggleEventActive(eventId, newStatus);
  };

  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-secondary">Eventos</h1>
            <p className="text-secondary-light mt-2">
              Gestiona los eventos de asistencia
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <span>+</span>
            Nuevo Evento
          </button>
        </div>

        {/* Banner de Sincronización WiFi */}
        {networkInfo && networkInfo.ips.length > 0 && (
          <div className="mb-6 p-5 bg-[#0f172a] border border-slate-800 text-slate-100 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            <div className="space-y-1">
              <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-base">
                <span className="text-xl animate-pulse">📡</span> Enlace de Sincronización WiFi Activo
              </h3>
              <p className="text-xs text-slate-400">
                Usa la siguiente URL en la pantalla de configuración de tu aplicación móvil Zebra para conectar con la base de datos:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {networkInfo.ips.map((ip) => (
                  <span key={ip} className="px-2 py-1 bg-slate-950 border border-slate-800 text-cyan-400 font-mono text-xs rounded select-all font-semibold">
                    http://{ip}:{networkInfo.port}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowQrModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-bold rounded-lg text-xs transition-transform hover:scale-[1.02] shadow"
            >
              Ver Código QR
            </button>
          </div>
        )}

        {/* Tabs de Filtro */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setFilterTab('open')}
            className={`py-3 px-6 font-semibold border-b-2 text-sm transition-colors ${filterTab === 'open' ? 'border-primary text-primary' : 'border-transparent text-secondary-light hover:text-secondary'}`}
          >
            📂 Eventos Activos / Abiertos ({events.filter(e => e.status !== 'closed').length})
          </button>
          <button
            onClick={() => setFilterTab('closed')}
            className={`py-3 px-6 font-semibold border-b-2 text-sm transition-colors ${filterTab === 'closed' ? 'border-primary text-primary' : 'border-transparent text-secondary-light hover:text-secondary'}`}
          >
            📁 Historial de Cerrados ({events.filter(e => e.status === 'closed').length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && events.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-secondary-light">Cargando eventos...</p>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && events.filter(e => filterTab === 'open' ? e.status !== 'closed' : e.status === 'closed').length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-secondary mb-2">
              No hay eventos en esta sección
            </h3>
            <p className="text-secondary-light mb-6">
              {filterTab === 'open' ? 'Crea tu primer evento para comenzar' : 'Los eventos cerrados aparecerán aquí'}
            </p>
            {filterTab === 'open' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
              >
                Crear Evento
              </button>
            )}
          </div>
        )}

        {events.filter(e => filterTab === 'open' ? e.status !== 'closed' : e.status === 'closed').length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events
              .filter(e => filterTab === 'open' ? e.status !== 'closed' : e.status === 'closed')
              .map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-secondary">
                      {event.name}
                    </h3>
                    {event.is_active && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                        Activo
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-secondary-light">
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      {(() => {
                        const dateStr = String(event.date).split('T')[0];
                        const [year, month, day] = dateStr.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        return format(date, 'dd MMMM yyyy', { locale: es });
                      })()}
                    </div>
                    {event.cutoff_time && (
                      <div className="flex items-center gap-2 text-amber-600 font-medium">
                        <span>⏰</span>
                        <span>Límite de ingreso: {event.cutoff_time}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    {/* Toggle Activo/Inactivo si está abierto */}
                    {event.status !== 'closed' ? (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-secondary">Estado del Evento</span>
                        <button
                          onClick={() => handleToggleActive(event.id!, event.is_active)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${event.is_active ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${event.is_active ? 'translate-x-6' : 'translate-x-1'
                              }`}
                          />
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 text-red-700 text-center text-xs font-semibold rounded-lg">
                        🔒 EVENTO CERRADO
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewEvent(event)}
                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm font-semibold"
                      >
                        Ver Dashboard
                      </button>
                      {event.status !== 'closed' && (
                        <button
                          onClick={() => handleCloseEvent(event.id!)}
                          className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors text-sm"
                          title="Cerrar Evento"
                        >
                          🔒
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(event.id!)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm"
                        title="Eliminar Evento"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-secondary mb-6">
              Crear Nuevo Evento
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Nombre del Evento
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ej: Conferencia Anual 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Ubicación
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ej: Auditorio Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Hora Límite de Ingreso (Opcional)
                </label>
                <input
                  type="time"
                  value={formData.cutoff_time}
                  onChange={(e) => setFormData({ ...formData, cutoff_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ej: 08:10"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-secondary rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors font-semibold"
                >
                  Crear Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal del Código QR de Conexión WiFi */}
      {showQrModal && networkInfo && networkInfo.ips.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-65 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <span>📱</span> Enlace Zebra WiFi
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-200 text-2xl font-bold transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xl flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`http://${networkInfo.ips[0]}:${networkInfo.port}`)}`}
                  alt="QR Code de Enlace"
                  className="w-[200px] h-[200px]"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Escanea este código QR desde la pantalla de configuración en tu dispositivo móvil Zebra para enlazar la app con esta base de datos local.
              </p>
              <div className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs break-all text-cyan-400 select-all font-semibold">
                http://{networkInfo.ips[0]}:{networkInfo.port}
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
