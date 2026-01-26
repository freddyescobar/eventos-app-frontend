'use client';

import { useEffect, useState } from 'react';
import { useEventsStore } from '@/lib/stores/useEventsStore';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EventosPage() {
  const router = useRouter();
  const { events, isLoading, error, fetchEvents, createEvent, removeEvent, setActiveEvent, toggleEventActive } = useEventsStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: '',
  });

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
      background_image_path: null,
    });

    if (newEvent) {
      setShowCreateModal(false);
      setFormData({ name: '', location: '', date: '' });
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
        {!isLoading && events.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-secondary mb-2">
              No hay eventos creados
            </h3>
            <p className="text-secondary-light mb-6">
              Crea tu primer evento para comenzar
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            >
              Crear Evento
            </button>
          </div>
        )}

        {events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
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
                  </div>

                  <div className="mt-6 space-y-3">
                    {/* Toggle Activo/Inactivo */}
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

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewEvent(event)}
                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm font-semibold"
                      >
                        Ver Dashboard
                      </button>
                      <button
                        onClick={() => handleDelete(event.id!)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm"
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
    </div>
  );
}
