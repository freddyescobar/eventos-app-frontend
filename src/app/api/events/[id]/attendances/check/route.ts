import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { ApiResponse } from '@/lib/types';

// GET /api/events/[id]/attendances/check?person_id=123
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get('person_id');

    if (!personId) {
      return NextResponse.json(
        {
          success: false,
          error: 'person_id es requerido',
        } as ApiResponse<never>,
        { status: 400 }
      );
    }

    const db = getDatabase();

    const attendance = db.prepare(`
      SELECT * FROM attendances
      WHERE person_id = ? AND event_id = ?
      LIMIT 1
    `).get(personId, eventId);

    return NextResponse.json({
      success: true,
      data: {
        hasAttendance: !!attendance,
        attendance: attendance || null,
      },
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error al verificar asistencia:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al verificar asistencia',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
