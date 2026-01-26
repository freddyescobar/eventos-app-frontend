import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { ApiResponse } from '@/lib/types';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventId } = await params;
        const db = getDatabase();

        // 1. Personas que no asistieron (no tienen registros en attendances)
        const nonAttendees = db.prepare(`
      SELECT p.* FROM persons p
      WHERE p.event_id = ? AND p.id NOT IN (
        SELECT DISTINCT person_id FROM attendances WHERE event_id = ?
      )
    `).all(eventId, eventId);

        // 2. Frecuencia de entrada/salida por persona
        const movementFrequency = db.prepare(`
      SELECT p.cnomper, p.cnrodni, COUNT(a.id) as total_movements,
             SUM(CASE WHEN a.type = 'IN' THEN 1 ELSE 0 END) as entries,
             SUM(CASE WHEN a.type = 'OUT' THEN 1 ELSE 0 END) as exits
      FROM persons p
      JOIN attendances a ON p.id = a.person_id
      WHERE p.event_id = ?
      GROUP BY p.id
      ORDER BY total_movements DESC
    `).all(eventId);

        // 3. Personas que estuvieron poco tiempo (ej: salieron antes de 30 min desde su primera entrada)
        // Usaremos una consulta para encontrar la primera entrada y la última salida para simplificar
        const shortStayers = db.prepare(`
      SELECT p.cnomper, p.cnrodni,
             MIN(CASE WHEN a.type = 'IN' THEN a.check_time END) as first_in,
             MAX(CASE WHEN a.type = 'OUT' THEN a.check_time END) as last_out
      FROM persons p
      JOIN attendances a ON p.id = a.person_id
      WHERE p.event_id = ?
      GROUP BY p.id
      HAVING first_in IS NOT NULL AND last_out IS NOT NULL
      AND (strftime('%s', last_out) - strftime('%s', first_in)) < 1800 -- 30 minutos
    `).all(eventId);

        // 4. Distribución de llegadas por hora (para gráficas)
        const arrivalsByHour = db.prepare(`
      SELECT strftime('%H', check_time) as hour, COUNT(*) as count
      FROM attendances
      WHERE event_id = ? AND type = 'IN'
      GROUP BY hour
      ORDER BY hour ASC
    `).all(eventId);

        // 5. Resumen general
        const totalPersons = db.prepare('SELECT COUNT(*) as count FROM persons WHERE event_id = ?').get(eventId) as any;
        const actualAttendeesCount = db.prepare('SELECT COUNT(DISTINCT person_id) as count FROM attendances WHERE event_id = ?').get(eventId) as any;

        return NextResponse.json({
            success: true,
            data: {
                total_invited: totalPersons.count,
                actual_attendees: actualAttendeesCount.count,
                non_attendees: nonAttendees,
                movement_frequency: movementFrequency,
                short_stayers: shortStayers,
                arrivals_by_hour: arrivalsByHour
            }
        } as ApiResponse<any>);

    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener estadísticas' },
            { status: 500 }
        );
    }
}
