import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';

// GET /api/events/[id]/reports/souvenirs - Obtener datos para reporte de souvenirs entregados
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

    // Obtener todas las entregas de souvenirs con información completa
    const deliveries = db.prepare(`
      SELECT
        sd.id,
        sd.delivery_time,
        sd.signature_path,
        sd.notes,
        p.cnomper as person_name,
        p.cnrodni as person_dni,
        p.ccargo as person_position,
        p.carea as person_area,
        s.nombre as souvenir_name,
        s.codigo as souvenir_code,
        s.descripcion as souvenir_description
      FROM souvenir_deliveries sd
      INNER JOIN persons p ON sd.person_id = p.id
      INNER JOIN souvenirs s ON sd.souvenir_id = s.id
      WHERE sd.event_id = ?
      ORDER BY sd.delivery_time ASC
    `).all(eventId) as any[];

    return NextResponse.json({
      success: true,
      data: {
        event,
        deliveries,
        total: deliveries.length
      }
    });
  } catch (error) {
    console.error('Error al obtener reporte de souvenirs:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar reporte' },
      { status: 500 }
    );
  }
}
