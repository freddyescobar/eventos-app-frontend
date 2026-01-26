import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { PersonModel, ApiResponse } from '@/lib/types';

// GET /api/events/[id]/persons/search?q=...&type=dni|name
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'dni'; // 'dni' o 'name'

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parámetro de búsqueda "q" es requerido',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

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

    let persons: PersonModel[];

    if (type === 'dni') {
      // Búsqueda exacta por DNI
      persons = db.prepare(`
        SELECT * FROM persons
        WHERE cnrodni = ? AND event_id = ?
        LIMIT 1
      `).all(query, eventId) as PersonModel[];
    } else {
      // Búsqueda LIKE por nombre
      persons = db.prepare(`
        SELECT * FROM persons
        WHERE cnomper LIKE ? AND event_id = ?
        ORDER BY cnomper ASC
        LIMIT 20
      `).all(`%${query}%`, eventId) as PersonModel[];
    }

    return NextResponse.json({
      success: true,
      data: persons,
      total: persons.length,
    } as ApiResponse<PersonModel[]>);
  } catch (error) {
    console.error('Error al buscar personas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al buscar personas',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
