import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { SouvenirModel } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventIdStr } = await params;
    const eventId = parseInt(eventIdStr);
    const db = getDatabase();

    const souvenirs = db.prepare(`
      SELECT * FROM souvenirs 
      WHERE event_id = ? AND is_active = 1
      ORDER BY nombre ASC
    `).all(eventId);

    return NextResponse.json({
      success: true,
      data: souvenirs
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventIdStr } = await params;
    const eventId = parseInt(eventIdStr);
    const body = await request.json();
    const { codigo, nombre, descripcion, cantidad_inicial } = body;

    if (!codigo || !nombre || cantidad_inicial === undefined) {
      return NextResponse.json(
        { success: false, error: 'Código, nombre y cantidad inicial son requeridos' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO souvenirs (
        event_id, codigo, nombre, descripcion, 
        cantidad_inicial, cantidad_disponible, 
        created_at, updated_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      eventId,
      codigo,
      nombre,
      descripcion || null,
      cantidad_inicial,
      cantidad_inicial, // Inicialmente disponible es igual a inicial
      now,
      now
    );

    const newSouvenir = db.prepare('SELECT * FROM souvenirs WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      data: newSouvenir
    });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un souvenir con este código para este evento' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
