import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PaymentRow {
  flatNumber: string;
  amount: number;
  paymentMode: string;
  submittedAt: string;
  statusDescription: string;
}

const PAYMENT_MODE_DISPLAY: Record<string, string> = {
  gpay: "GPay",
  phonepe: "PhonePe",
  cash: "Cash",
};

export function generateMonthReport(
  monthLabel: string,
  payments: PaymentRow[],
  totalFlats: number
): Buffer {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text("Laurel Residency", 105, 20, { align: "center" });
  doc.setFontSize(14);
  doc.text(`Maintenance Report — ${monthLabel}`, 105, 30, { align: "center" });

  // Summary
  doc.setFontSize(11);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  doc.text(`Total Flats: ${totalFlats}  |  Payments: ${payments.length}  |  Total: ₹${totalPaid.toLocaleString("en-IN")}`, 14, 42);

  // Table
  const tableData = payments.map((p) => [
    p.flatNumber,
    `₹${p.amount.toLocaleString("en-IN")}`,
    PAYMENT_MODE_DISPLAY[p.paymentMode] || p.paymentMode,
    p.submittedAt ? new Date(p.submittedAt).toLocaleDateString("en-IN") : "—",
    p.statusDescription,
  ]);

  autoTable(doc, {
    startY: 50,
    head: [["Flat", "Amount", "Mode", "Date", "Status"]],
    body: tableData,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [67, 56, 202] }, // indigo-700
  });

  // Generated timestamp at bottom
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, pageHeight - 10);

  return Buffer.from(doc.output("arraybuffer"));
}
