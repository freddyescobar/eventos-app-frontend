import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { EventModel, ApiResponse } from '@/lib/types';

// GET /api/events/[id] - Obtener un evento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();

    const event = db.prepare(`
      SELECT * FROM events WHERE id = ?
    `).get(id) as EventModel | undefined;

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: 'Evento no encontrado',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: event,
    } as ApiResponse<EventModel>);
  } catch (error) {
    console.error('Error al obtener evento:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener evento',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

// PUT /api/events/[id] - Actualizar un evento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, location, date, background_image_path, is_active, status, cutoff_time } = body;

    const db = getDatabase();

    // Verificar que el evento existe
    const existingEvent = db.prepare(`
      SELECT * FROM events WHERE id = ?
    `).get(id);

    if (!existingEvent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Evento no encontrado',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const finalIsActive = status === 'closed' ? 0 : (is_active !== undefined ? (is_active ? 1 : 0) : undefined);

    // Si se está activando este evento, desactivar todos los demás
    if (finalIsActive === 1) {
      db.prepare('UPDATE events SET is_active = 0 WHERE id != ?').run(id);
    }

    // Actualizar evento
    db.prepare(`
      UPDATE events
      SET name = COALESCE(?, name),
          location = COALESCE(?, location),
          date = COALESCE(?, date),
          background_image_path = COALESCE(?, background_image_path),
          is_active = COALESCE(?, is_active),
          status = COALESCE(?, status),
          cutoff_time = COALESCE(?, cutoff_time)
      WHERE id = ?
    `).run(
      name || null,
      location || null,
      date || null,
      background_image_path !== undefined ? background_image_path : null,
      finalIsActive !== undefined ? finalIsActive : null,
      status || null,
      cutoff_time || null,
      id
    );

    const updatedEvent = db.prepare(`
      SELECT * FROM events WHERE id = ?
    `).get(id) as EventModel;

    return NextResponse.json({
      success: true,
      data: updatedEvent,
      message: 'Evento actualizado exitosamente',
    } as ApiResponse<EventModel>);
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar evento',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Eliminar un evento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDatabase();

    // Verificar que el evento existe
    const existingEvent = db.prepare(`
      SELECT * FROM events WHERE id = ?
    `).get(id);

    if (!existingEvent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Evento no encontrado',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Eliminar evento (CASCADE eliminará personas, asistencias, souvenirs, etc.)
    db.prepare(`
      DELETE FROM events WHERE id = ?
    `).run(id);

    return NextResponse.json({
      success: true,
      message: 'Evento eliminado exitosamente',
    } as ApiResponse<never>);
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar evento',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
