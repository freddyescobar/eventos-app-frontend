import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import { ApiResponse } from '@/lib/types';

// GET /api/souvenirs/[id]/stock - Obtener información de stock
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: souvenirId } = await params;
    const db = getDatabase();

    const souvenir = db.prepare(`
      SELECT
        cantidad_inicial,
        cantidad_disponible
      FROM souvenirs
      WHERE id = ?
    `).get(souvenirId) as { cantidad_inicial: number; cantidad_disponible: number } | undefined;

    if (!souvenir) {
      return NextResponse.json(
        {
          success: false,
          error: 'Souvenir no encontrado',
        } as ApiResponse<never>,
        { status: 404 }
      );
    }

    const cantidadEntregada = souvenir.cantidad_inicial - souvenir.cantidad_disponible;

    return NextResponse.json({
      success: true,
      data: {
        cantidad_inicial: souvenir.cantidad_inicial,
        cantidad_disponible: souvenir.cantidad_disponible,
        cantidad_entregada: cantidadEntregada,
      },
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error al obtener stock:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener stock',
      } as ApiResponse<never>,
      { status: 500 }
    );
  }
}
