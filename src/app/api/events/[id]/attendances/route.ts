import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { AttendanceModel, AttendanceDetailModel, ApiResponse, PaginatedResponse } from '@/lib/types';

// GET /api/events/[id]/attendances - Obtener todas las asistencias de un evento
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

    // Obtener asistencias con información de persona
    const attendances = db.prepare(`
      SELECT
        a.id, a.event_id, a.person_id, a.type, a.check_time,
        a.notes, a.created_at, a.device_id, a.synced_at,
        p.cnomper, p.cnrodni, p.ccargo, p.carea, p.cdesest,
        e.name as event_name
      FROM attendances a
      INNER JOIN persons p ON a.person_id = p.id
      INNER JOIN events e ON a.event_id = e.id
      WHERE a.event_id = ?
      ORDER BY a.check_time DESC
      LIMIT ? OFFSET ?
    `).all(eventId, limit, offset) as any[];

    // Transformar a AttendanceDetailModel
    const details: AttendanceDetailModel[] = attendances.map((row) => ({
      attendance: {
        id: row.id,
        event_id: row.event_id,
        person_id: row.person_id,
        type: row.type as 'IN' | 'OUT',
        check_time: row.check_time,
        notes: row.notes,
        created_at: row.created_at,
        device_id: row.device_id,
        synced_at: row.synced_at,
      },
      person: {
        cnomper: row.cnomper,
        cnrodni: row.cnrodni,
        ccargo: row.ccargo,
        carea: row.carea,
        cdesest: row.cdesest,
      },
      event: {
        name: row.event_name,
      },
    }));

    // Obtener total de personas únicas que asistieron (no total de movimientos)
    const total = db.prepare(`
      SELECT COUNT(DISTINCT person_id) as count FROM attendances WHERE event_id = ?
    `).get(eventId) as { count: number };

    return NextResponse.json({
      success: true,
      data: details,
      total: total.count,
      limit,
      offset,
    } as PaginatedResponse<AttendanceDetailModel>);
  } catch (error) {
    console.error('Error al obtener asistencias:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener asistencias',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/attendances - Registrar una asistencia
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const body = await request.json();
    const { person_id, device_id, type = 'IN', check_time, check_in_time, notes } = body;

    // Validaciones
    if (!person_id || !device_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'person_id y device_id son requeridos',
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

    // Verificar que la persona existe y pertenece al evento
    const person = db.prepare(`
      SELECT id, is_inside FROM persons WHERE id = ? AND event_id = ?
    `).get(person_id, eventId) as { id: number; is_inside: number } | undefined;

    if (!person) {
      return NextResponse.json(
        {
          success: false,
          error: 'Persona no encontrada en este evento',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    // Validar tipo vs estado actual (opcional pero recomendado)
    // Si es entrada (IN) y ya está dentro, o salida (OUT) y ya está fuera,
    // podríamos permitirlo o dar una advertencia, pero por ahora permitiremos todo
    // y solo actualizaremos el estado.

    const now = new Date().toISOString();

    // Iniciar transacción
    const transaction = db.transaction(() => {
      // Insertar asistencia
      const result = db.prepare(`
        INSERT INTO attendances (
          event_id, person_id, type, check_time, notes,
          created_at, device_id, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        eventId,
        person_id,
        type,
        check_time || check_in_time || now,
        notes || null,
        now,
        device_id,
        now
      );

      // Actualizar estado de la persona
      db.prepare(`
        UPDATE persons SET is_inside = ? WHERE id = ?
      `).run(type === 'IN' ? 1 : 0, person_id);

      return result.lastInsertRowid;
    });

    const lastId = transaction();

    const newAttendance = db.prepare(`
      SELECT * FROM attendances WHERE id = ?
    `).get(lastId) as AttendanceModel;

    return NextResponse.json(
      {
        success: true,
        data: newAttendance,
        message: 'Registro exitoso',
      } as ApiResponse<AttendanceModel>,
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al registrar asistencia',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
