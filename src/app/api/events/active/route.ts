import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { EventModel, ApiResponse } from '@/lib/types';

// GET /api/events/active - Obtener solo el evento activo
export async function GET() {
  try {
    const db = getDatabase();

    const activeEvent = db.prepare(`
      SELECT * FROM events
      WHERE is_active = 1 AND status != 'closed'
      ORDER BY created_at DESC
      LIMIT 1
    `).get() as EventModel | undefined;

    if (!activeEvent) {
      return NextResponse.json(
        {
          success: false,
          error: 'No hay ningún evento activo',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: activeEvent,
    } as ApiResponse<EventModel>);
  } catch (error) {
    console.error('Error al obtener evento activo:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener evento activo',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
