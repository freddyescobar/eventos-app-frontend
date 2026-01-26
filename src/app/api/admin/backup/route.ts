import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
    try {
        let dbPath = process.env.DATABASE_PATH || process.env.DATABASE_URL;

        if (!dbPath) {
            dbPath = path.join(process.cwd(), 'database', 'central.db');
        }

        if (!fs.existsSync(dbPath)) {
            return NextResponse.json(
                { error: 'Base de datos no encontrada' },
                { status: 404 }
            );
        }

        const fileBuffer = fs.readFileSync(dbPath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/x-sqlite3',
                'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().split('T')[0]}.db"`,
            },
        });
    } catch (error) {
        console.error('Error descargando backup:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
