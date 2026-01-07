import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Genera un PDF profesional con formato de ticket de cafetería mexicana.
 */
export const generateTicketPDF = async (sale, items) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 150] // Formato ticketera de 80mm
    });

    const margin = 5;
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 10;

    // --- ENCABEZADO ---
    try {
        // Cargar logo desde la ruta pública
        const logoImg = '/logo.png';
        doc.addImage(logoImg, 'PNG', (pageWidth / 2) - 15, currentY, 30, 30);
        currentY += 32;
    } catch (e) {
        // Fallback si no hay logo
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('OASIS CAFÉ', pageWidth / 2, currentY, { align: 'center' });
        currentY += 6;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Acapulco, Guerrero, México', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.text('¡La mejor pausa de tu día!', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    // --- INFO DE VENTA ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`NOTA: #${sale.id.toString().slice(0, 4).toUpperCase()}`, margin, currentY);
    currentY += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date(sale.created_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    doc.text(`Fecha: ${dateStr}`, margin, currentY);
    currentY += 4;
    doc.text(`Cliente: ${sale.customer_name || 'Venta de Mostrador'}`, margin, currentY);
    currentY += 6;

    // --- TABLA DE PRODUCTOS ---
    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['CANT.', 'DESCRIPCIÓN', 'PRECIO', 'TOTAL']],
        body: items.map(i => [
            i.quantity,
            i.name,
            `$${i.sale_price.toFixed(2)}`,
            `$${(i.quantity * i.sale_price).toFixed(2)}`
        ]),
        theme: 'plain',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fontStyle: 'bold', borderBottom: 0.1, halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // Cantidad centrada también en cuerpo
            1: { cellWidth: 'auto' },
            2: { cellWidth: 15, halign: 'right' },
            3: { cellWidth: 15, halign: 'right' }
        },
        didDrawPage: (data) => {
            currentY = data.cursor.y + 5;
        }
    });

    // --- TOTALES ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: $${sale.total.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Método de Pago: ${sale.payment_method}`, margin, currentY);
    currentY += 10;

    // --- PIE DE PÁGINA ---
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('Este no es un comprobante fiscal.', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Gracias por tu compra, Dios te bendiga abundantemente.', pageWidth / 2, currentY, { align: 'center' });

    return doc.output('blob');
};
