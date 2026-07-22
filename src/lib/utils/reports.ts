import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Configurar jsPDF para soportar autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable: { finalY: number };
  }
}

interface SouvenirDelivery {
  delivery_time: string;
  person_name: string;
  person_dni: string;
  person_position: string;
  person_area: string;
  souvenir_name: string;
  souvenir_code: string;
  signature_path: string;
}

interface EventData {
  name: string;
  location: string;
  date: string;
  cutoff_time?: string | null;
}

interface Invitado {
  codigo: string;
  nombre: string;
  dni: string;
  cargo: string;
  area: string;
  oficina: string;
  asistio: string;
  hora_ingreso?: string | null;
  registros_asistencia: string | null;
}

/**
 * Convierte una imagen a base64
 */
async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return '';
  }
}

/**
 * Genera un PDF de reporte de souvenirs entregados con firmas
 */
export async function generateSouvenirsPDF(
  event: EventData,
  deliveries: SouvenirDelivery[]
) {
  const doc = new jsPDF('landscape'); // Modo horizontal para más espacio
  const pageWidth = doc.internal.pageSize.getWidth();

  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE SOUVENIRS ENTREGADOS', pageWidth / 2, 15, { align: 'center' });

  // Información del evento
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Evento: ${event.name}`, 14, 24);
  doc.text(`Lugar: ${event.location}`, 14, 29);
  doc.text(`Fecha: ${format(new Date(event.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, 14, 34);
  doc.text(`Total de entregas: ${deliveries.length}`, 14, 39);

  // Cargar todas las imágenes de firmas
  const signatures: { [key: number]: string } = {};
  for (let i = 0; i < deliveries.length; i++) {
    const delivery = deliveries[i];
    if (delivery.signature_path) {
      try {
        // La ruta de la firma ya incluye el path completo desde public (ej: /uploads/signatures/sig_xxx.png)
        const signatureUrl = delivery.signature_path.startsWith('http')
          ? delivery.signature_path
          : delivery.signature_path;

        signatures[i] = await imageToBase64(signatureUrl);
      } catch (error) {
        console.error(`Error loading signature for ${delivery.person_name}:`, error);
      }
    }
  }

  // Tabla de entregas con columna de firma
  const tableData = deliveries.map((delivery, index) => [
    index + 1,
    delivery.person_name,
    delivery.person_dni,
    delivery.person_position,
    delivery.souvenir_name,
    format(new Date(delivery.delivery_time), 'dd/MM/yyyy HH:mm'),
    '', // Columna para firma (se agregará como imagen)
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['#', 'Nombre', 'DNI', 'Cargo', 'Souvenir', 'Fecha/Hora', 'Firma']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [226, 0, 26], // Color institucional
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      minCellHeight: 15,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 45 },
      4: { cellWidth: 40 },
      5: { cellWidth: 28, halign: 'center' },
      6: { cellWidth: 35, halign: 'center' }, // Columna de firma más ancha
    },
    didDrawCell: (data) => {
      // Agregar imagen de firma en la última columna
      if (data.column.index === 6 && data.section === 'body') {
        const rowIndex = data.row.index;
        const signatureBase64 = signatures[rowIndex];

        if (signatureBase64) {
          try {
            const cellX = data.cell.x + 2;
            const cellY = data.cell.y + 2;
            const imgWidth = data.cell.width - 4;
            const imgHeight = data.cell.height - 4;

            doc.addImage(
              signatureBase64,
              'PNG',
              cellX,
              cellY,
              imgWidth,
              imgHeight,
              undefined,
              'FAST'
            );
          } catch (error) {
            console.error('Error adding signature to PDF:', error);
            // Si falla, agregar texto indicando que hay firma
            doc.setFontSize(6);
            doc.text('Firmado', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
              align: 'center',
            });
          }
        }
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.text(
      `Generado con Claude Code - ${format(new Date(), 'dd/MM/yyyy HH:mm')} - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Guardar PDF
  const fileName = `souvenirs_${event.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}

/**
 * Genera un Excel de reporte de souvenirs entregados
 */
export async function generateSouvenirsExcel(
  event: EventData,
  deliveries: SouvenirDelivery[]
) {
  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Datos del encabezado
  const header = [
    [`REPORTE DE SOUVENIRS ENTREGADOS`],
    [`Evento: ${event.name}`],
    [`Lugar: ${event.location}`],
    [`Fecha: ${format(new Date(event.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}`],
    [`Total de entregas: ${deliveries.length}`],
    [], // Línea en blanco
    ['#', 'Nombre Completo', 'DNI', 'Cargo', 'Área', 'Souvenir', 'Código', 'Fecha/Hora Entrega']
  ];

  // Datos de entregas
  const data = deliveries.map((delivery, index) => [
    index + 1,
    delivery.person_name,
    delivery.person_dni,
    delivery.person_position,
    delivery.person_area,
    delivery.souvenir_name,
    delivery.souvenir_code,
    format(new Date(delivery.delivery_time), 'dd/MM/yyyy HH:mm'),
  ]);

  // Combinar header y data
  const ws_data = [...header, ...data];

  // Crear worksheet
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Ajustar anchos de columnas
  ws['!cols'] = [
    { wch: 5 },  // #
    { wch: 35 }, // Nombre
    { wch: 12 }, // DNI
    { wch: 30 }, // Cargo
    { wch: 25 }, // Área
    { wch: 25 }, // Souvenir
    { wch: 15 }, // Código
    { wch: 18 }, // Fecha/Hora
  ];

  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Souvenirs Entregados');

  // Guardar archivo
  const fileName = `souvenirs_${event.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function getPunctualityStatus(horaIngreso: string | null | undefined, cutoffTime: string | null | undefined): 'A TIEMPO' | 'TARDÍO' | '-' {
  if (!horaIngreso || !cutoffTime) return '-';
  try {
    let timeStr = "";
    if (horaIngreso.includes('T')) {
      timeStr = horaIngreso.split('T')[1].substring(0, 5); // "HH:MM"
    } else {
      const parts = horaIngreso.split(' ');
      timeStr = parts.length > 1 ? parts[1].substring(0, 5) : horaIngreso.substring(0, 5);
    }
    const [checkHour, checkMin] = timeStr.split(':').map(Number);
    const [cutoffHour, cutoffMin] = cutoffTime.split(':').map(Number);
    if (isNaN(checkHour) || isNaN(checkMin) || isNaN(cutoffHour) || isNaN(cutoffMin)) return '-';
    
    const checkMinTotal = checkHour * 60 + checkMin;
    const cutoffMinTotal = cutoffHour * 60 + cutoffMin;
    return checkMinTotal > cutoffMinTotal ? 'TARDÍO' : 'A TIEMPO';
  } catch (e) {
    return '-';
  }
}

/**
 * Genera un Excel de reporte de invitados con asistencia
 */
export async function generateInvitadosExcel(
  event: EventData,
  invitados: Invitado[],
  stats: { total: number; asistieron: number; noAsistieron: number }
) {
  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Datos del encabezado
  const header = [
    [`REPORTE DE INVITADOS Y ASISTENCIA`],
    [`Evento: ${event.name}`],
    [`Lugar: ${event.location}`],
    [`Fecha: ${format(new Date(event.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}`],
    [`Hora Límite de Ingreso: ${event.cutoff_time || 'No especificada'}`],
    [`Total de invitados: ${stats.total}`],
    [`Asistieron: ${stats.asistieron}`],
    [`No asistieron: ${stats.noAsistieron}`],
    [], // Línea en blanco
    ['#', 'Código', 'Nombre Completo', 'DNI', 'Cargo', 'Área', 'Oficina', '¿Asistió?', 'Hora de Ingreso', 'Puntualidad', 'Registros de Asistencia']
  ];

  // Datos de invitados
  const data = invitados.map((inv, index) => {
    let formattedHoraIngreso = '-';
    if (inv.hora_ingreso) {
      try {
        const dateObj = new Date(inv.hora_ingreso);
        formattedHoraIngreso = format(dateObj, 'HH:mm:ss');
      } catch (e) {
        formattedHoraIngreso = inv.hora_ingreso;
      }
    }
    const punctuality = getPunctualityStatus(inv.hora_ingreso, event.cutoff_time);

    return [
      index + 1,
      inv.codigo,
      inv.nombre,
      inv.dni,
      inv.cargo,
      inv.area,
      inv.oficina,
      inv.asistio,
      formattedHoraIngreso,
      punctuality,
      inv.registros_asistencia || '-',
    ];
  });

  // Combinar header y data
  const ws_data = [...header, ...data];

  // Crear worksheet
  const ws = XLSX.utils.aoa_to_sheet(ws_data);

  // Ajustar anchos de columnas
  ws['!cols'] = [
    { wch: 5 },  // #
    { wch: 15 }, // Código
    { wch: 35 }, // Nombre
    { wch: 12 }, // DNI
    { wch: 30 }, // Cargo
    { wch: 25 }, // Área
    { wch: 25 }, // Oficina
    { wch: 10 }, // ¿Asistió?
    { wch: 15 }, // Hora de Ingreso
    { wch: 15 }, // Puntualidad
    { wch: 40 }, // Registros
  ];

  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Invitados');

  // Guardar archivo
  const fileName = `invitados_${event.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
