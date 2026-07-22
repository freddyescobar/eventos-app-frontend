import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';

// GET /api/events/[id]/reports/invitados - Obtener datos para reporte de invitados
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const db = getDatabase();

    // Obtener información del evento
    const event = db.prepare(`
      SELECT * FROM events WHERE id = ?
    `).get(eventId) as any;

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Obtener todos los invitados con información de si asistieron o no
    const invitados = db.prepare(`
      SELECT
        p.id,
        p.ccodper as codigo,
        p.cnomper as nombre,
        p.cnrodni as dni,
        p.ccargo as cargo,
        p.carea as area,
        p.cnomofi as oficina,
        p.cdesest as estado,
        p.cdeszona as zona,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM attendances
            WHERE person_id = p.id AND event_id = p.event_id
          ) THEN 'SÍ'
          ELSE 'NO'
        END as asistio,
        (
          SELECT check_time FROM attendances
          WHERE person_id = p.id AND event_id = p.event_id AND type = 'IN'
          ORDER BY check_time ASC LIMIT 1
        ) as hora_ingreso,
        (
          SELECT GROUP_CONCAT(type || ' ' || strftime('%H:%M', check_time), ', ')
          FROM attendances
          WHERE person_id = p.id AND event_id = p.event_id
          ORDER BY check_time
        ) as registros_asistencia
      FROM persons p
      WHERE p.event_id = ?
      ORDER BY p.cnomper ASC
    `).all(eventId) as any[];

    return NextResponse.json({
      success: true,
      data: {
        event,
        invitados,
        total: invitados.length,
        asistieron: invitados.filter(i => i.asistio === 'SÍ').length,
        noAsistieron: invitados.filter(i => i.asistio === 'NO').length
      }
    });
  } catch (error) {
    console.error('Error al obtener reporte de invitados:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar reporte' },
      { status: 500 }
    );
  }
}
