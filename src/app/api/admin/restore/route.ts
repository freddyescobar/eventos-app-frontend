import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { closeDatabase, getDatabase } from '@/lib/db/sqlite';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No se proporcionó ningún archivo' },
                { status: 400 }
            );
        }

        // Determinar la ruta de la base de datos igual que en sqlite.ts
        let dbPath = process.env.DATABASE_PATH || process.env.DATABASE_URL;

        if (!dbPath) {
            dbPath = path.join(process.cwd(), 'database', 'central.db');
        }

        // 1. Cerrar la conexión existente
        console.log('Cerrando conexión de base de datos...');
        closeDatabase();

        // 2. Convertir el archivo a Buffer y escribirlo
        const buffer = Buffer.from(await file.arrayBuffer());

        // Asegurar que el directorio existe (por si acaso)
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // 3. Sobrescribir el archivo
        console.log(`Sobrescribiendo base de datos en: ${dbPath}`);
        fs.writeFileSync(dbPath, buffer);

        // 4. Reinicializar la conexión para verificar que funciona
        console.log('Reinicializando conexión...');
        getDatabase();

        return NextResponse.json({
            success: true,
            message: 'Base de datos restaurada correctamente'
        });

    } catch (error) {
        console.error('Error restaurando backup:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor procesando el archivo' },
            { status: 500 }
        );
    }
}
