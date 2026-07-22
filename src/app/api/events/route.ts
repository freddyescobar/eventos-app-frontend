import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { EventModel, ApiResponse } from '@/lib/types';

// GET /api/events - Obtener todos los eventos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeClosed = searchParams.get('status') === 'open' || searchParams.get('exclude_closed') === 'true';
    const db = getDatabase();

    let query = 'SELECT * FROM events';
    const queryParams: any[] = [];

    if (excludeClosed) {
      query += " WHERE status != 'closed'";
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const events = db.prepare(query).all(...queryParams) as EventModel[];

    return NextResponse.json({
      success: true,
      data: events,
    } as ApiResponse<EventModel[]>);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener eventos',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

// POST /api/events - Crear un nuevo evento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, date, background_image_path, is_active, status, cutoff_time } = body;

    // Validaciones
    if (!name || !location || !date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nombre, ubicación y fecha son requeridos',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    const finalIsActive = status === 'closed' ? 0 : (is_active !== undefined ? (is_active ? 1 : 0) : 1);

    // Si el nuevo evento es activo, desactivar todos los demás
    if (finalIsActive !== 0) {
      db.prepare('UPDATE events SET is_active = 0').run();
    }

    const result = db.prepare(`
      INSERT INTO events (name, location, date, background_image_path, is_active, status, cutoff_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      location,
      date,
      background_image_path || null,
      finalIsActive,
      status || 'open',
      cutoff_time || null,
      now
    );

    const newEvent = db.prepare(`
      SELECT * FROM events WHERE id = ?
    `).get(result.lastInsertRowid) as EventModel;

    return NextResponse.json(
      {
        success: true,
        data: newEvent,
        message: 'Evento creado exitosamente',
      } as ApiResponse<EventModel>,
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear evento:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear evento',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
