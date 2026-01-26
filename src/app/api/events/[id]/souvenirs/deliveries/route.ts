import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/sqlite';
import path from 'path';
import fs from 'fs';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: eventIdStr } = await params;
        const eventId = parseInt(eventIdStr);
        const db = getDatabase();

        const deliveries = db.prepare(`
      SELECT 
        sd.*,
        p.cnomper, p.cnrodni, p.ccargo,
        s.nombre as souvenir_nombre, s.codigo as souvenir_codigo
      FROM souvenir_deliveries sd
      JOIN persons p ON sd.person_id = p.id
      JOIN souvenirs s ON sd.souvenir_id = s.id
      WHERE sd.event_id = ?
      ORDER BY sd.delivery_time DESC
    `).all(eventId);

        return NextResponse.json({
            success: true,
            data: deliveries
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
        const {
            person_id,
            souvenir_id,
            delivery_time,
            signature_base64,
            device_id,
            notes
        } = body;

        if (!person_id || !souvenir_id || !signature_base64 || !device_id) {
            return NextResponse.json(
                { success: false, error: 'Datos incompletos' },
                { status: 400 }
            );
        }

        const db = getDatabase();

        // Iniciar transacción
        const registerDelivery = db.transaction(() => {
            // 1. Verificar disponibilidad
            const souvenir = db.prepare('SELECT cantidad_disponible FROM souvenirs WHERE id = ?').get(souvenir_id) as { cantidad_disponible: number } | undefined;

            if (!souvenir) {
                throw new Error('Souvenir no encontrado');
            }

            if (souvenir.cantidad_disponible <= 0) {
                throw new Error('No hay stock disponible para este souvenir');
            }

            // 2. Verificar si la persona ya recibió este souvenir para este evento
            const existing = db.prepare(`
        SELECT id FROM souvenir_deliveries 
        WHERE event_id = ? AND person_id = ? AND souvenir_id = ?
      `).get(eventId, person_id, souvenir_id);

            if (existing) {
                throw new Error('Esta persona ya recibió este souvenir');
            }

            // 3. Guardar la firma en disco
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'signatures');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const fileName = `sig_${eventId}_${person_id}_${souvenir_id}_${Date.now()}.png`;
            const filePath = path.join(uploadDir, fileName);
            const signatureData = signature_base64.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(filePath, Buffer.from(signatureData, 'base64'));

            const dbSignaturePath = `/uploads/signatures/${fileName}`;

            // 4. Registrar la entrega
            const now = new Date().toISOString();
            db.prepare(`
        INSERT INTO souvenir_deliveries (
          event_id, person_id, souvenir_id, 
          delivery_time, signature_path, 
          device_id, created_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
                eventId,
                person_id,
                souvenir_id,
                delivery_time || now,
                dbSignaturePath,
                device_id,
                now,
                notes || null
            );

            // 5. Actualizar stock
            db.prepare(`
        UPDATE souvenirs 
        SET cantidad_disponible = cantidad_disponible - 1,
            updated_at = ?
        WHERE id = ?
      `).run(now, souvenir_id);

            return true;
        });

        try {
            registerDelivery();
        } catch (error: any) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Entrega registrada exitosamente'
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
