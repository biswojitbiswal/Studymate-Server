import PDFDocument from 'pdfkit';

type InvoicePayload = {
  invoiceNo: string;
  issuedAt: Date;
  issuer: Record<string, any>;
  customer: Record<string, any>;
  item: Record<string, any>;
  payment: Record<string, any>;
};

const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  primarySoft: '#EFF6FF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  surface: '#F8FAFC',
  success: '#15803D',
  successSoft: '#DCFCE7',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  white: '#FFFFFF',
};

const PAGE = { left: 48, right: 547, width: 499 };

const safeText = (value: unknown, fallback = '-') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const money = (value: unknown) => `INR ${Number(value ?? 0).toFixed(2)}`;

const formatDate = (value: unknown, includeTime = false) => {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? { hour: '2-digit', minute: '2-digit', hour12: true }
      : {}),
  }).format(date);
};

const label = (
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
) => {
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(text.toUpperCase(), x, y, { width, characterSpacing: 0.7 });
};

const pill = (
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  background: string,
  color: string,
) => {
  doc.roundedRect(x, y, width, 22, 11).fill(background);
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(color)
    .text(text, x, y + 7, { width, align: 'center', characterSpacing: 0.5 });
};

export function generateInvoicePdf(payload: InvoicePayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, 595.28, 12).fill(COLORS.primary);

    // StudyNest brand header
    doc.circle(70, 59, 22).fill(COLORS.primary);
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(COLORS.white)
      .text('SN', 48, 54, { width: 44, align: 'center' });
    doc
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor(COLORS.text)
      .text('StudyNest', 104, 41);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text('Learn. Grow. Succeed.', 104, 68);

    doc
      .font('Helvetica-Bold')
      .fontSize(25)
      .fillColor(COLORS.primaryDark)
      .text('INVOICE', 355, 38, { width: 192, align: 'right' });
    pill(doc, 'TEST DOCUMENT', 355, 72, 108, COLORS.warningSoft, COLORS.warning);
    pill(doc, 'PAID', 473, 72, 74, COLORS.successSoft, COLORS.success);

    // Invoice metadata band
    const metaY = 112;
    doc.roundedRect(PAGE.left, metaY, PAGE.width, 68, 10).fill(COLORS.primarySoft);
    doc.rect(PAGE.left, metaY, 5, 68).fill(COLORS.primary);

    const metaColumns = [66, 232, 398];
    const meta = [
      ['Invoice number', payload.invoiceNo],
      ['Issue date', formatDate(payload.issuedAt)],
      ['Order number', safeText(payload.payment.orderNo)],
    ];
    meta.forEach(([heading, value], index) => {
      label(doc, heading, metaColumns[index], metaY + 15, 132);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(COLORS.text)
        .text(value, metaColumns[index], metaY + 34, {
          width: 132,
          ellipsis: true,
        });
    });

    // Seller and student cards
    const partyY = 204;
    const partyWidth = 239;
    const partyHeight = 126;
    doc
      .roundedRect(PAGE.left, partyY, partyWidth, partyHeight, 10)
      .fillAndStroke(COLORS.surface, COLORS.border);
    doc
      .roundedRect(308, partyY, partyWidth, partyHeight, 10)
      .fillAndStroke(COLORS.surface, COLORS.border);

    label(doc, 'From', 64, partyY + 16, 190);
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(COLORS.text)
      .text(safeText(payload.issuer.name, 'StudyNest'), 64, partyY + 36, {
        width: 205,
      });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(safeText(payload.issuer.address), 64, partyY + 57, {
        width: 205,
        height: 32,
      });
    doc.text(`Phone: ${safeText(payload.issuer.phone)}`, 64, partyY + 99, {
      width: 205,
    });

    label(doc, 'Billed to', 324, partyY + 16, 190);
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor(COLORS.text)
      .text(safeText(payload.customer.name, 'Student'), 324, partyY + 36, {
        width: 205,
        ellipsis: true,
      });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(safeText(payload.customer.email), 324, partyY + 60, {
        width: 205,
        ellipsis: true,
      });
    doc.text(`Phone: ${safeText(payload.customer.phone)}`, 324, partyY + 81, {
      width: 205,
    });

    // Purchased item table
    const tableY = 356;
    doc
      .roundedRect(PAGE.left, tableY, PAGE.width, 105, 9)
      .fillAndStroke(COLORS.white, COLORS.border);
    doc.roundedRect(PAGE.left, tableY, PAGE.width, 34, 9).fill(COLORS.primary);
    doc.rect(PAGE.left, tableY + 25, PAGE.width, 9).fill(COLORS.primary);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white);
    doc.text('DESCRIPTION', 64, tableY + 13, { width: 260 });
    doc.text('TYPE', 333, tableY + 13, { width: 70 });
    doc.text('QTY', 407, tableY + 13, { width: 42, align: 'center' });
    doc.text('AMOUNT', 454, tableY + 13, { width: 77, align: 'right' });

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLORS.text)
      .text(safeText(payload.item.title, 'StudyNest class'), 64, tableY + 49, {
        width: 250,
        ellipsis: true,
      });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('Online learning purchase', 64, tableY + 69, { width: 250 });
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(safeText(payload.item.type, 'CLASS'), 333, tableY + 55, {
        width: 70,
      });
    doc.text('1', 407, tableY + 55, { width: 42, align: 'center' });
    doc.text(money(payload.payment.basePrice), 434, tableY + 55, {
      width: 97,
      align: 'right',
    });

    // Payment reference
    const detailsY = 487;
    doc
      .roundedRect(PAGE.left, detailsY, 286, 119, 10)
      .fillAndStroke(COLORS.surface, COLORS.border);
    label(doc, 'Payment details', 64, detailsY + 16, 220);

    const paymentRows = [
      ['Provider', safeText(payload.payment.provider, 'Online payment')],
      ['Payment ID', safeText(payload.payment.paymentId)],
      ['Paid on', formatDate(payload.payment.paidAt, true)],
    ];
    paymentRows.forEach(([heading, value], index) => {
      const y = detailsY + 39 + index * 23;
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(COLORS.muted)
        .text(heading, 64, y, { width: 72 });
      doc
        .font('Helvetica-Bold')
        .fillColor(COLORS.text)
        .text(value, 137, y, { width: 179, align: 'right', ellipsis: true });
    });

    // Totals card
    doc
      .roundedRect(352, detailsY, 195, 150, 10)
      .fillAndStroke(COLORS.white, COLORS.border);

    let totalY = detailsY + 19;
    const totalRow = (
      heading: string,
      value: string,
      options: { color?: string; bold?: boolean } = {},
    ) => {
      doc
        .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(options.bold ? 10 : 9)
        .fillColor(options.color ?? COLORS.muted)
        .text(heading, 368, totalY, { width: 76 });
      doc
        .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(options.color ?? COLORS.text)
        .text(value, 444, totalY, { width: 87, align: 'right' });
      totalY += 23;
    };

    totalRow('Subtotal', money(payload.payment.basePrice));
    if (Number(payload.payment.discountAmount ?? 0) > 0) {
      totalRow('Discount', `- ${money(payload.payment.discountAmount)}`, {
        color: COLORS.success,
      });
    }
    totalRow(
      `Tax (${Number(payload.payment.tax ?? 0).toFixed(2)}%)`,
      money(payload.payment.taxAmount),
    );
    doc.moveTo(368, totalY).lineTo(531, totalY).strokeColor(COLORS.border).stroke();
    totalY += 13;
    totalRow('Total paid', money(payload.payment.totalAmount), {
      color: COLORS.primaryDark,
      bold: true,
    });

    // Non-production notice
    const noticeY = 666;
    doc.roundedRect(PAGE.left, noticeY, PAGE.width, 48, 9).fill(COLORS.warningSoft);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.warning)
      .text('TEST INVOICE', 64, noticeY + 11, { width: 90 });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#92400E')
      .text(
        safeText(payload.issuer.note, 'Test invoice - not for tax use'),
        154,
        noticeY + 11,
        { width: 375 },
      );
    doc.text(
      'No tax-registration number is associated with this document.',
      154,
      noticeY + 26,
      { width: 375 },
    );

    // Footer
    doc.moveTo(PAGE.left, 760).lineTo(PAGE.right, 760).strokeColor(COLORS.border).stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(COLORS.primary)
      .text('Thank you for learning with StudyNest.', PAGE.left, 778, {
        width: 300,
      });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text('Generated automatically for your StudyNest order.', 315, 780, {
        width: 232,
        align: 'right',
      });

    doc.end();
  });
}
