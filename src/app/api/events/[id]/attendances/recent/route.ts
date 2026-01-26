import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { ApiResponse } from '@/lib/types';

// GET /api/events/[id]/attendances/recent?limit=50
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const db = getDatabase();

    // Verificar que el evento existe
    const event = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: 'Evento no encontrado',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Obtener asistencias recientes
    const recent = db.prepare(`
      SELECT
        p.cnomper,
        p.cnrodni,
        p.ccargo,
        a.type,
        a.check_time
      FROM attendances a
      INNER JOIN persons p ON a.person_id = p.id
      WHERE a.event_id = ?
      ORDER BY a.check_time DESC
      LIMIT ?
    `).all(eventId, limit);

    return NextResponse.json({
      success: true,
      data: recent,
    } as ApiResponse<any[]>);
  } catch (error) {
    console.error('Error al obtener asistencias recientes:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener asistencias recientes',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
