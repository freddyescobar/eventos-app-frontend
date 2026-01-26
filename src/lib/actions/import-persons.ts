'use server';

import { getDatabase } from '@/lib/db/sqlite';
import * as XLSX from 'xlsx';
import { PersonModel } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function importPersonsFromExcel(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        const eventIdStr = formData.get('eventId') as string;

        if (!file || !eventIdStr) {
            return { success: false, error: 'Archivo y ID de evento son requeridos' };
        }

        const eventId = parseInt(eventIdStr);
        const bytes = await file.arrayBuffer();
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convertir a JSON usando formato de matriz (filas como arreglos) para mayor robustez
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (rows.length <= 1) {
            return { success: false, error: 'El archivo Excel está vacío o solo contiene cabeceras' };
        }

        const db = getDatabase();
        const now = new Date().toISOString();

        // Preparar sentencia de inserción
        const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO persons (
                ccodper, cnomper, cnrodni, dfecing, cnomofi, ccargo,
                carea, cdesest, cdeszona, event_id, created_at, updated_at,
                source, is_inside
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let importCount = 0;
        let skipCount = 0;

        // Iniciar transacción
        const transaction = db.transaction((dataRows: any[][]) => {
            // Log de depuración para ver qué hay en las primeras columnas
            console.log('--- DEPURACIÓN DE EXCEL ---');
            console.log('Cabeceras (Fila 0):', dataRows[0]);
            if (dataRows.length > 1) {
                console.log('Primera fila de datos (Fila 1):', dataRows[1]);
            }
            console.log('---------------------------');

            // Empezar desde la segunda fila (índice 1) para saltar cabeceras
            for (let i = 1; i < dataRows.length; i++) {
                const row = dataRows[i];
                if (!row || row.length === 0) continue;

                // Mapeo ESTRICTO por índices solicitado por el usuario:
                // Columna A (0): ccodper
                // Columna B (1): cnomper (OBLIGATORIO)
                // Columna C (2): cnrodni
                // Columna D (3): dfecing (Ignorada)
                // Columna E (4): cnomofi
                // Columna F (5): ccargo
                // Columna G (6): carea
                // Columna H (7): cdesest
                // Columna I (8): cdeszona

                const ccodper = (row[0] || '').toString().trim();
                const cnomper = (row[1] || '').toString().trim().toUpperCase();
                const cnrodni = (row[2] || '').toString().trim();
                const dfecing = now; // Ignoramos la del excel según pedido
                const cnomofi = (row[4] || '').toString().trim();
                const ccargo = (row[5] || '').toString().trim().toUpperCase();
                const carea = (row[6] || '').toString().trim();
                const cdesest = (row[7] || '').toString().trim() || 'ACTIVO';
                const cdeszona = (row[8] || '').toString().trim();

                if (!cnomper) {
                    console.log(`Fila ${i} saltada: Nombre ausente en Columna B`);
                    skipCount++;
                    continue;
                }

                // Generar DNI si no existe para cumplir con NOT NULL y UNIQUE(cnrodni, event_id)
                const finalDni = cnrodni || `TEMP-${Date.now()}-${i}`;
                const finalCode = ccodper || `M-${Date.now()}-${i}`;

                try {
                    insertStmt.run(
                        finalCode,
                        cnomper,
                        finalDni,
                        dfecing,
                        cnomofi,
                        ccargo,
                        carea,
                        cdesest,
                        cdeszona,
                        eventId,
                        now,
                        now,
                        'excel_import',
                        0 // is_inside inicial
                    );
                    importCount++;
                } catch (error) {
                    console.error(`Error al insertar fila ${i}:`, error);
                    skipCount++;
                }
            }
        });

        transaction(rows);

        console.log(`Importación finalizada. Importados: ${importCount}, Saltados: ${skipCount}`);

        revalidatePath(`/eventos/${eventId}`);
        return { success: true, count: importCount, skipped: skipCount };
    } catch (error) {
        console.error('Error importing Excel:', error);
        return { success: false, error: 'Error al procesar el archivo Excel' };
    }
}
