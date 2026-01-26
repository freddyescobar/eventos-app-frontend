import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { PersonModel, ApiResponse } from '@/lib/types';

// POST /api/events/[id]/persons/batch - Importar múltiples personas
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const body = await request.json();
    const { persons } = body;

    if (!Array.isArray(persons) || persons.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere un array de personas',
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

    const now = new Date().toISOString();
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    // Preparar statement para inserción
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO persons (
        ccodper, cnomper, cnrodni, dfecing, cnomofi, ccargo,
        carea, cdesest, cdeszona, event_id, created_at, updated_at,
        source, created_by_device
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Transacción para mejor performance
    const insertMany = db.transaction((personsList: any[]) => {
      for (const person of personsList) {
        try {
          // Validaciones básicas
          if (!person.cnrodni || !person.cnomper) {
            errors.push(`Persona sin DNI o nombre: ${JSON.stringify(person)}`);
            failed++;
            continue;
          }

          insertStmt.run(
            person.ccodper || '',
            person.cnomper || '',
            person.cnrodni || '',
            person.dfecing || now,
            person.cnomofi || '',
            person.ccargo || '',
            person.carea || '',
            person.cdesest || '',
            person.cdeszona || '',
            eventId,
            now,
            now,
            'imported',
            null
          );

          imported++;
        } catch (error: any) {
          if (error.message.includes('UNIQUE constraint failed')) {
            // Ya existe, lo consideramos importado
            imported++;
          } else {
            errors.push(`Error en persona ${person.cnrodni}: ${error.message}`);
            failed++;
          }
        }
      }
    });

    // Ejecutar la transacción
    insertMany(persons);

    return NextResponse.json(
      {
        success: true,
        data: {
          imported,
          failed,
          total: persons.length,
        },
        message: `Importación completada: ${imported} exitosas, ${failed} fallidas`,
        ...(errors.length > 0 && { errors: errors.slice(0, 10) }), // Máximo 10 errores
      } as ApiResponse<any>,
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al importar personas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al importar personas',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
