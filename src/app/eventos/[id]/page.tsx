'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useEventsStore } from '@/lib/stores/useEventsStore';
import { useAttendanceStore } from '@/lib/stores/useAttendanceStore';
import { usePersonsStore } from '@/lib/stores/usePersonsStore';
import { useSouvenirsStore } from '@/lib/stores/useSouvenirsStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EventModel } from '@/lib/types';
import {
  generateSouvenirsPDF,
  generateSouvenirsExcel,
  generateInvitadosExcel
} from '@/lib/utils/reports';

export default function EventDashboard() {
  const params = useParams();
  const eventId = parseInt(params.id as string);

  const { events, fetchEvents } = useEventsStore();
  const {
    recentAttendances,
    totalAttendances,
    fetchRecentAttendances,
    fetchAttendances
  } = useAttendanceStore();
  const {
    persons,
    totalPersons,
    fetchPersons,
    isLoading: isLoadingPersons
  } = usePersonsStore();

  const {
    souvenirs,
    deliveries,
    fetchSouvenirs,
    fetchDeliveries,
    addSouvenir
  } = useSouvenirsStore();

  const [activeTab, setActiveTab] = useState<'asistencias' | 'souvenirs' | 'personas' | 'stats'>('asistencias');
  const [stats, setStats] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showAddSouvenir, setShowAddSouvenir] = useState(false);
  const [newSouvenir, setNewSouvenir] = useState({ codigo: '', nombre: '', descripcion: '', cantidad_inicial: 0 });
  const [event, setEvent] = useState<EventModel | undefined>(events.find(e => e.id === eventId));

  // Estados de búsqueda
  const [searchAsistencias, setSearchAsistencias] = useState('');
  const [searchPersonas, setSearchPersonas] = useState('');
  const [searchSouvenirs, setSearchSouvenirs] = useState('');
  const [punctualityFilter, setPunctualityFilter] = useState<'all' | 'punctual' | 'late' | 'out'>('all');

  // Fetch inicial
  useEffect(() => {
    if (!event) {
      fetchEvents();
    }
    fetchAttendances(eventId);
    fetchRecentAttendances(eventId, 50);
    fetchPersons(eventId); // Sin límite para mostrar todos los invitados
    fetchSouvenirs(eventId);
    fetchDeliveries(eventId);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/stats`);
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Actualizar evento cuando se cargue
  useEffect(() => {
    const foundEvent = events.find(e => e.id === eventId);
    if (foundEvent) {
      setEvent(foundEvent);
    }
  }, [events, eventId]);

  // Polling cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecentAttendances(eventId, 50);
      fetchAttendances(eventId);
      // Actualizar lista de personas para ver estado actual (Dentro/Fuera)
      fetchPersons(eventId); // Sin límite
      if (activeTab === 'souvenirs') {
        fetchSouvenirs(eventId);
        fetchDeliveries(eventId);
      }
      if (activeTab === 'stats') {
        fetchStats();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [eventId, fetchRecentAttendances, fetchAttendances, activeTab]);

  const handleAddSouvenir = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addSouvenir(eventId, newSouvenir);
    if (result.success) {
      setShowAddSouvenir(false);
      setNewSouvenir({ codigo: '', nombre: '', descripcion: '', cantidad_inicial: 0 });
    } else {
      alert(result.error);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('eventId', eventId.toString());

    try {
      const { importPersonsFromExcel } = await import('@/lib/actions/import-persons');
      const result = await importPersonsFromExcel(formData);

      if (result.success) {
        const count = result.count || 0;
        const skipped = (result as any).skipped || 0;
        alert(`Se importaron ${count} personas correctamente.${skipped > 0 ? ` Se saltaron ${skipped} filas por datos incompletos.` : ''}`);
        fetchPersons(eventId);
      } else {
        alert(result.error || 'Error al importar personas');
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Error crítico al procesar el archivo');
    } finally {
      setIsImporting(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeletePersons = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar TODOS los invitados de este evento? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}/persons`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        fetchPersons(eventId);
      } else {
        alert(result.error || 'Error al eliminar invitados');
      }
    } catch (error) {
      console.error('Error deleting persons:', error);
      alert('Error crítico al eliminar invitados');
    }
  };

  // Funciones para generar reportes
  const handleGenerateSouvenirsPDF = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/reports/souvenirs`);
      const result = await response.json();

      if (result.success) {
        await generateSouvenirsPDF(result.data.event, result.data.deliveries);
      } else {
        alert(result.error || 'Error al generar reporte');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar reporte PDF');
    }
  };

  const handleGenerateSouvenirsExcel = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/reports/souvenirs`);
      const result = await response.json();

      if (result.success) {
        await generateSouvenirsExcel(result.data.event, result.data.deliveries);
      } else {
        alert(result.error || 'Error al generar reporte');
      }
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Error al generar reporte Excel');
    }
  };

  const handleGenerateInvitadosExcel = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/reports/invitados`);
      const result = await response.json();

      if (result.success) {
        await generateInvitadosExcel(
          result.data.event,
          result.data.invitados,
          {
            total: result.data.total,
            asistieron: result.data.asistieron,
            noAsistieron: result.data.noAsistieron
          }
        );
      } else {
        alert(result.error || 'Error al generar reporte');
      }
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Error al generar reporte Excel');
    }
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-secondary-light">Cargando evento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Volver
            </button>
            <div>
              <h1 className="text-4xl font-bold text-secondary">{event.name}</h1>
              <p className="text-secondary-light mt-2">
                📍 {event.location} • 📅 {(() => {
                  const dateStr = String(event.date).split('T')[0];
                  const [year, month, day] = dateStr.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return format(date, 'dd MMMM yyyy', { locale: es });
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-light">Total Asistentes</p>
                <p className="text-4xl font-bold text-primary mt-2">{totalAttendances}</p>
              </div>
              <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-light">Souvenirs Entregados</p>
                <p className="text-4xl font-bold text-secondary mt-2">{deliveries.length}</p>
              </div>
              <div className="w-16 h-16 bg-secondary bg-opacity-10 rounded-full flex items-center justify-center">
                <span className="text-3xl">🎁</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-light">Personas Invitadas</p>
                <p className="text-4xl font-bold text-secondary mt-2">{totalPersons}</p>
              </div>
              <div className="w-16 h-16 bg-secondary bg-opacity-10 rounded-full flex items-center justify-center">
                <span className="text-3xl">👥</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('asistencias')}
                className={`px-4 md:px-6 py-4 text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 ${activeTab === 'asistencias' ? 'text-primary border-b-2 border-primary' : 'text-secondary-light hover:text-secondary border-b-2 border-transparent'}`}
              >
                Asistencias
              </button>
              <button
                onClick={() => setActiveTab('souvenirs')}
                className={`px-4 md:px-6 py-4 text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 ${activeTab === 'souvenirs' ? 'text-primary border-b-2 border-primary' : 'text-secondary-light hover:text-secondary border-b-2 border-transparent'}`}
              >
                Souvenirs
              </button>
              <button
                onClick={() => setActiveTab('personas')}
                className={`px-4 md:px-6 py-4 text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 ${activeTab === 'personas' ? 'text-primary border-b-2 border-primary' : 'text-secondary-light hover:text-secondary border-b-2 border-transparent'}`}
              >
                Invitados
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 md:px-6 py-4 text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 ${activeTab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-secondary-light hover:text-secondary border-b-2 border-transparent'}`}
              >
                Estadísticas
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'asistencias' && (
              <>
                <div className="mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <h2 className="text-xl font-bold text-secondary">
                    Últimos Registros (Entradas/Salidas)
                  </h2>
                  
                  {/* Filtros de Puntualidad */}
                  <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button
                      onClick={() => setPunctualityFilter('all')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${punctualityFilter === 'all' ? 'bg-white text-secondary shadow-sm' : 'text-secondary-light hover:text-secondary'}`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setPunctualityFilter('punctual')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${punctualityFilter === 'punctual' ? 'bg-white text-green-700 shadow-sm' : 'text-secondary-light hover:text-green-600'}`}
                    >
                      A tiempo
                    </button>
                    <button
                      onClick={() => setPunctualityFilter('late')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${punctualityFilter === 'late' ? 'bg-white text-amber-700 shadow-sm' : 'text-secondary-light hover:text-amber-600'}`}
                    >
                      Tardíos
                    </button>
                    <button
                      onClick={() => setPunctualityFilter('out')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${punctualityFilter === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-secondary-light hover:text-red-500'}`}
                    >
                      Salidas
                    </button>
                  </div>

                  <div className="relative flex-1 max-w-md">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar por DNI o nombre..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      value={searchAsistencias}
                      onChange={(e) => setSearchAsistencias(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-secondary-light">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Actualización en tiempo real (cada 5s)</span>
                  </div>
                </div>

                {recentAttendances
                  .filter(a =>
                    a.cnomper.toLowerCase().includes(searchAsistencias.toLowerCase()) ||
                    a.cnrodni.includes(searchAsistencias)
                  )
                  .filter(a => {
                    if (punctualityFilter === 'all') return true;
                    if (punctualityFilter === 'punctual') return a.type === 'IN' && !a.is_late;
                    if (punctualityFilter === 'late') return a.type === 'IN' && a.is_late;
                    if (punctualityFilter === 'out') return a.type === 'OUT';
                    return true;
                  }).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-secondary mb-2">
                      No hay registros coincidentes
                    </h3>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentAttendances
                      .filter(a =>
                        a.cnomper.toLowerCase().includes(searchAsistencias.toLowerCase()) ||
                        a.cnrodni.includes(searchAsistencias)
                      )
                      .filter(a => {
                        if (punctualityFilter === 'all') return true;
                        if (punctualityFilter === 'punctual') return a.type === 'IN' && !a.is_late;
                        if (punctualityFilter === 'late') return a.type === 'IN' && a.is_late;
                        if (punctualityFilter === 'out') return a.type === 'OUT';
                        return true;
                      })
                      .map((attendance, index) => {
                        // Buscar souvenirs de esta persona
                        const personDeliveries = deliveries.filter(d => d.person_id === attendance.person_id);

                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-4 bg-neutral-light rounded-lg hover:bg-gray-100 transition-colors border-l-4 ${attendance.type === 'IN' ? (attendance.is_late ? 'border-l-amber-500' : 'border-l-green-500') : 'border-l-red-500'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 ${attendance.type === 'IN' ? (attendance.is_late ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600') : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center font-bold`}>
                                {attendance.type === 'IN' ? '↓' : '↑'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-secondary">{attendance.cnomper}</p>
                                  {attendance.type === 'IN' && (
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${attendance.is_late ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                      {attendance.is_late ? '⏰ Tardío' : '✓ A tiempo'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-secondary-light">
                                  {attendance.type === 'IN' ? 'ENTRADA' : 'SALIDA'} • DNI: {attendance.cnrodni}
                                </p>
                                {personDeliveries.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {personDeliveries.map((pd, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-secondary bg-opacity-10 text-secondary text-[10px] rounded font-bold">
                                        🎁 {pd.souvenir_nombre}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-secondary">
                                {format(new Date(attendance.check_time || attendance.check_in_time), 'HH:mm:ss')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </>
            )}

            {activeTab === 'personas' && (
              <>
                <div className="mb-6 space-y-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-secondary">
                      Lista de Invitados
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleGenerateInvitadosExcel}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                        title="Descargar reporte de invitados en Excel"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Reporte Excel
                      </button>
                      <label className={`px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-opacity-90 transition-colors flex items-center gap-2 ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isImporting ? 'Cargando...' : '📄 Importar Excel'}
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          className="hidden"
                          onChange={handleImportExcel}
                          disabled={isImporting}
                        />
                      </label>
                      <button
                        onClick={handleDeletePersons}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2 font-medium"
                      >
                        🗑️ Eliminar Importación
                      </button>
                    </div>
                  </div>

                  <div className="relative max-w-md">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar invitado por DNI o nombre..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                      value={searchPersonas}
                      onChange={(e) => setSearchPersonas(e.target.value)}
                    />
                  </div>
                </div>

                {persons.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-semibold text-secondary mb-2">
                      No hay invitados registrados
                    </h3>
                    <p className="text-secondary-light">Carga un archivo Excel para comenzar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="p-4 font-semibold text-secondary">Nombre</th>
                          <th className="p-4 font-semibold text-secondary">DNI</th>
                          <th className="p-4 font-semibold text-secondary">Cargo</th>
                          <th className="p-4 font-semibold text-secondary">Área / Oficina</th>
                          <th className="p-4 font-semibold text-secondary">Estado Actual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {persons
                          .filter(p =>
                            p.cnomper.toLowerCase().includes(searchPersonas.toLowerCase()) ||
                            p.cnrodni.includes(searchPersonas)
                          )
                          .map((person) => (
                            <tr key={person.id} className="border-b hover:bg-gray-50">
                              <td className="p-4">{person.cnomper}</td>
                              <td className="p-4 font-mono">{person.cnrodni}</td>
                              <td className="p-4 text-sm text-secondary-light">{person.ccargo}</td>
                              <td className="p-4 text-sm text-secondary-light">{person.carea} / {person.cnomofi}</td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${person.is_inside ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {person.is_inside ? 'DENTRO' : 'FUERA'}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'souvenirs' && (
              <div className="space-y-8">
                {/* Gestión de Souvenirs */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-secondary">Stock de Souvenirs</h2>
                    <button
                      onClick={() => setShowAddSouvenir(true)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                      + Agregar Souvenir
                    </button>
                  </div>

                  {souvenirs.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-secondary-light">No hay souvenirs configurados para este evento</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {souvenirs.map((s) => (
                        <div key={s.id} className="bg-white border rounded-xl p-5 shadow-sm">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold text-lg text-secondary">{s.nombre}</h3>
                              <p className="text-xs text-secondary-light font-mono">{s.codigo}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${s.cantidad_disponible > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              Stock: {s.cantidad_disponible} / {s.cantidad_inicial}
                            </span>
                          </div>
                          <p className="text-sm text-secondary-light mb-4 line-clamp-2">{s.descripcion || 'Sin descripción'}</p>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${(s.cantidad_disponible / s.cantidad_inicial) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Entregas */}
                <div>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-xl font-bold text-secondary">Entregas Realizadas</h2>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-1 md:flex-initial md:min-w-[300px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
                        <input
                          type="text"
                          placeholder="Buscar entrega por DNI o nombre..."
                          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                          value={searchSouvenirs}
                          onChange={(e) => setSearchSouvenirs(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleGenerateSouvenirsPDF}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium"
                          title="Descargar reporte en PDF"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          PDF
                        </button>
                        <button
                          onClick={handleGenerateSouvenirsExcel}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                          title="Descargar reporte en Excel"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Excel
                        </button>
                      </div>
                    </div>
                  </div>
                  {deliveries.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-secondary-light">Aún no se han realizado entregas</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="p-4 font-semibold text-secondary">Persona</th>
                            <th className="p-4 font-semibold text-secondary">Souvenir</th>
                            <th className="p-4 font-semibold text-secondary">Fecha/Hora</th>
                            <th className="p-4 font-semibold text-secondary">Firma</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveries
                            .filter(d =>
                              d.cnomper.toLowerCase().includes(searchSouvenirs.toLowerCase()) ||
                              d.cnrodni.includes(searchSouvenirs)
                            )
                            .map((d) => (
                              <tr key={d.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">
                                  <p className="font-medium">{d.cnomper}</p>
                                  <p className="text-xs text-secondary-light">DNI: {d.cnrodni}</p>
                                </td>
                                <td className="p-4">
                                  <p className="font-medium">{d.souvenir_nombre}</p>
                                  <p className="text-xs text-secondary-light">{d.souvenir_codigo}</p>
                                </td>
                                <td className="p-4 text-sm">
                                  {format(new Date(d.delivery_time), 'dd/MM/yyyy HH:mm')}
                                </td>
                                <td className="p-4">
                                  {d.signature_path && (
                                    <img
                                      src={d.signature_path}
                                      alt="Firma"
                                      className="h-10 border rounded bg-white hover:h-40 transition-all cursor-zoom-in"
                                    />
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Modal Agregar Souvenir */}
                {showAddSouvenir && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
                      <h2 className="text-2xl font-bold text-secondary mb-6">Nuevo Souvenir</h2>
                      <form onSubmit={handleAddSouvenir} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Código</label>
                          <input
                            type="text" required
                            className="w-full p-2 border rounded-lg"
                            value={newSouvenir.codigo}
                            onChange={(e) => setNewSouvenir({ ...newSouvenir, codigo: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Nombre</label>
                          <input
                            type="text" required
                            className="w-full p-2 border rounded-lg"
                            value={newSouvenir.nombre}
                            onChange={(e) => setNewSouvenir({ ...newSouvenir, nombre: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Descripción</label>
                          <textarea
                            className="w-full p-2 border rounded-lg"
                            value={newSouvenir.descripcion}
                            onChange={(e) => setNewSouvenir({ ...newSouvenir, descripcion: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary mb-1">Cantidad Inicial</label>
                          <input
                            type="number" required min="1"
                            className="w-full p-2 border rounded-lg"
                            value={newSouvenir.cantidad_inicial}
                            onChange={(e) => setNewSouvenir({ ...newSouvenir, cantidad_inicial: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="flex gap-4 mt-8">
                          <button
                            type="button"
                            onClick={() => setShowAddSouvenir(false)}
                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90"
                          >
                            Guardar
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Gráfica de Llegadas */}
                  <div className="bg-white p-6 border rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-secondary mb-4">Distribución de Llegadas por Hora</h3>
                    <div className="h-64 flex items-end gap-2 px-2">
                      {stats?.arrivals_by_hour?.length > 0 ? (
                        stats.arrivals_by_hour.map((h: any, i: number) => {
                          const maxCount = Math.max(...stats.arrivals_by_hour.map((x: any) => x.count));
                          const height = `${(h.count / maxCount) * 100}%`;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                              <div className="w-full bg-primary bg-opacity-20 rounded-t-lg relative group-hover:bg-opacity-40 transition-all" style={{ height }}>
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                  {h.count}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-secondary-light">{h.hour}:00</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-secondary-light">Sin datos de llegadas</div>
                      )}
                    </div>
                  </div>

                  {/* Frecuencias de Movimiento */}
                  <div className="bg-white p-6 border rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold text-secondary mb-4">Top Colaboradores con más Movimientos</h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {stats?.movement_frequency?.slice(0, 10).map((m: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-neutral-light rounded-lg">
                          <div className="min-w-0">
                            <p className="font-bold text-secondary truncate">{m.cnomper}</p>
                            <p className="text-xs text-secondary-light">DNI: {m.cnrodni}</p>
                          </div>
                          <div className="flex gap-2 text-center ml-4">
                            <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                              <span className="block font-bold">{m.entries}</span>
                              Entradas
                            </div>
                            <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                              <span className="block font-bold">{m.exits}</span>
                              Salidas
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!stats?.movement_frequency || stats.movement_frequency.length === 0) && (
                        <p className="text-center text-secondary-light py-8">No hay registros de movimientos</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Alerta de Salidas Prematuras */}
                  <div className="bg-white p-6 border rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                      ⚠️ Salidas Prematuras
                    </h3>
                    <p className="text-sm text-secondary-light mb-4">Personas que salieron antes de 30 minutos desde su entrada.</p>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {stats?.short_stayers?.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 border-l-4 border-red-500 bg-red-50 rounded-lg">
                          <div>
                            <p className="font-bold text-secondary text-sm">{s.cnomper}</p>
                            <p className="text-xs text-secondary-light">DNI: {s.cnrodni}</p>
                          </div>
                          <div className="text-right text-xs">
                            <p className="text-red-700">Entró: {format(new Date(s.first_in), 'HH:mm')}</p>
                            <p className="text-red-700">Salió: {format(new Date(s.last_out), 'HH:mm')}</p>
                          </div>
                        </div>
                      ))}
                      {(!stats?.short_stayers || stats.short_stayers.length === 0) && (
                        <p className="text-center text-secondary-light py-8">✅ No se detectaron salidas prematuras</p>
                      )}
                    </div>
                  </div>

                  {/* Listado de Inasistencias */}
                  <div className="bg-white p-6 border rounded-xl shadow-sm">
                    <h3 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                      👥 Invitados que no asistieron ({stats?.non_attendees?.length || 0})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {stats?.non_attendees?.map((p: any, i: number) => (
                        <div key={i} className="p-3 border rounded-lg bg-gray-50 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-secondary text-sm">{p.cnomper}</p>
                            <p className="text-[10px] text-secondary-light">Cargo: {p.ccargo}</p>
                          </div>
                          <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded">AUSENTE</span>
                        </div>
                      ))}
                      {(!stats?.non_attendees || stats.non_attendees.length === 0) && (
                        <p className="text-center text-secondary-light py-8">✅ Todos los invitados asistieron</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
