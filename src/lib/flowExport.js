import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const toText = (value) => (value == null ? '' : String(value));

const buildFileName = (prefix, extension) => {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  return `${prefix}-${stamp}.${extension}`;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const applyExportPreset = ({
  rows = [],
  preset = 'all',
  startDate,
  endDate,
  opNumber,
  machine,
  material,
  dateField = 'created_at',
}) => {
  const now = new Date();
  const normalizedOp = String(opNumber || '').trim().toLowerCase();
  const normalizedMachine = String(machine || '').trim().toLowerCase();
  const normalizedMaterial = String(material || '').trim().toLowerCase();

  const presetMinDate = (() => {
    if (preset === 'last7') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (preset === 'last30') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return null;
  })();

  const start = toDate(startDate ? `${startDate}T00:00:00` : null);
  const end = toDate(endDate ? `${endDate}T23:59:59` : null);

  return (rows || []).filter((row) => {
    const rowDate = toDate(row?.[dateField]);
    if (presetMinDate && rowDate && rowDate < presetMinDate) return false;
    if (start && rowDate && rowDate < start) return false;
    if (end && rowDate && rowDate > end) return false;

    if (normalizedOp) {
      const opText = `${toText(row.op_number)} ${toText(row.opNumber)}`.toLowerCase();
      if (!opText.includes(normalizedOp)) return false;
    }

    if (normalizedMachine) {
      const machineText = `${toText(row.machine)} ${toText(row.mixer)}`.toLowerCase();
      if (!machineText.includes(normalizedMachine)) return false;
    }

    if (normalizedMaterial) {
      const materialText = `${toText(row.materials)} ${toText(row.raw_material_used)} ${toText(row.material)}`.toLowerCase();
      if (!materialText.includes(normalizedMaterial)) return false;
    }

    return true;
  });
};

export const exportRowsToExcel = ({ filePrefix, sheetName, rows }) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(safeRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Sheet1');
  XLSX.writeFile(workbook, buildFileName(filePrefix || 'export', 'xlsx'));
};

export const exportRowsToPdf = ({ filePrefix, title, columns, rows }) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const lineHeight = 14;
  const usableWidth = pageWidth - margin * 2;
  const maxLinesPerPage = 48;

  let y = margin;
  let lineCounter = 0;

  const ensurePage = () => {
    if (lineCounter >= maxLinesPerPage) {
      doc.addPage();
      y = margin;
      lineCounter = 0;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(toText(title || 'Operational Export'), margin, y);
  y += lineHeight + 4;
  lineCounter += 2;

  const header = (columns || []).map((column) => column.label).join(' | ');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(doc.splitTextToSize(header, usableWidth), margin, y);
  y += lineHeight;
  lineCounter += 1;

  doc.setFont('helvetica', 'normal');
  (rows || []).forEach((row, index) => {
    ensurePage();
    const text = (columns || [])
      .map((column) => `${column.label}: ${toText(row[column.key])}`)
      .join('  •  ');
    const wrapped = doc.splitTextToSize(`${index + 1}. ${text}`, usableWidth);
    wrapped.forEach((line) => {
      ensurePage();
      doc.text(line, margin, y);
      y += lineHeight;
      lineCounter += 1;
    });
  });

  doc.save(buildFileName(filePrefix || 'export', 'pdf'));
};
