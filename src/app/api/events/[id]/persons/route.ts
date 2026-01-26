import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { PersonModel, ApiResponse, PaginatedResponse } from '@/lib/types';

// GET /api/events/[id]/persons - Obtener todas las personas de un evento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Obtener personas con paginación
    const persons = db.prepare(`
      SELECT * FROM persons
      WHERE event_id = ?
      ORDER BY cnomper ASC
      LIMIT ? OFFSET ?
    `).all(eventId, limit, offset) as PersonModel[];

    // Obtener total
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM persons WHERE event_id = ?
    `).get(eventId) as { count: number };

    return NextResponse.json({
      success: true,
      data: persons,
      total: total.count,
      limit,
      offset,
    } as PaginatedResponse<PersonModel>);
  } catch (error) {
    console.error('Error al obtener personas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener personas',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/persons - Crear una nueva persona
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const body = await request.json();
    const {
      cnrodni,
      cnomper,
      ccargo,
      ccodper = '',
      cnomofi = 'Manual',
      carea = 'REGISTRO MANUAL',
      cdesest = 'ACTIVO',
      cdeszona = 'MANUAL',
      device_id,
    } = body;

    // Validaciones
    if (!cnrodni || !cnomper || !ccargo) {
      return NextResponse.json(
        {
          success: false,
          error: 'DNI, nombre y cargo son requeridos',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    // Validar DNI de 8 dígitos
    if (!/^\d{8}$/.test(cnrodni)) {
      return NextResponse.json(
        {
          success: false,
          error: 'DNI debe tener 8 dígitos',
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

    // Verificar que no existe ya esa persona en el evento
    const existing = db.prepare(`
      SELECT id FROM persons WHERE cnrodni = ? AND event_id = ?
    `).get(cnrodni, eventId);

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe una persona con ese DNI en este evento',
        } as ApiResponse<never>,
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Insertar persona
    const result = db.prepare(`
      INSERT INTO persons (
        ccodper, cnomper, cnrodni, dfecing, cnomofi, ccargo,
        carea, cdesest, cdeszona, event_id, created_at, updated_at,
        source, created_by_device, is_inside
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ccodper,
      cnomper.toUpperCase(),
      cnrodni,
      now,
      cnomofi,
      ccargo.toUpperCase(),
      carea,
      cdesest,
      cdeszona,
      eventId,
      now,
      now,
      'manual',
      device_id || null,
      0 // is_inside
    );

    const newPerson = db.prepare(`
      SELECT * FROM persons WHERE id = ?
    `).get(result.lastInsertRowid) as PersonModel;

    return NextResponse.json(
      {
        success: true,
        data: newPerson,
        message: 'Persona registrada exitosamente',
      } as ApiResponse<PersonModel>,
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear persona:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear persona',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id]/persons - Eliminar todas las personas de un evento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const db = getDatabase();

    // Eliminar personas relacionadas con el evento
    const result = db.prepare('DELETE FROM persons WHERE event_id = ?').run(eventId);

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${result.changes} personas del evento`,
      count: result.changes,
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error al eliminar personas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar personas del evento',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
