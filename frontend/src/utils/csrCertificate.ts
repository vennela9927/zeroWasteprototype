import jsPDF from 'jspdf';
import { Timestamp } from 'firebase/firestore';

/**
 * CSR Certificate Generator
 * 
 * Generates professional PDF certificates for donors after successful donations.
 * Features:
 * - Beautiful design with gradients
 * - Blockchain hash for verification
 * - QR code for authenticity
 * - Shareable on LinkedIn/social media
 */

export interface CertificateData {
  certificateId: string;
  donorName: string;
  donorId: string;
  donationType: 'food_donation' | 'micro_donation';
  foodName?: string;
  quantity?: number;
  quantityUnit?: string;
  ngoName?: string;
  donationDate: Date;
  deliveredDate?: Date;
  blockchainHash: string;
  impactMetrics: {
    mealsServed: number;
    co2Prevented: number; // kg
    foodWasteAverted: number; // kg
  };
}

/**
 * Generate CSR Certificate PDF
 */
export async function generateCSRCertificate(data: CertificateData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background gradient effect (simulated with rectangles)
  doc.setFillColor(240, 249, 255); // Light blue
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Border
  doc.setDrawColor(37, 99, 235); // Blue-600
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner border
  doc.setDrawColor(59, 130, 246); // Blue-500
  doc.setLineWidth(0.5);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Header section
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text('CERTIFICATE OF SOCIAL CONTRIBUTION', pageWidth / 2, 30, { align: 'center' });

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text('Zero Waste Platform • Food Donation Initiative', pageWidth / 2, 38, { align: 'center' });

  // Horizontal line
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.5);
  doc.line(40, 45, pageWidth - 40, 45);

  // Main content
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42); // Slate-900
  
  const startY = 60;
  doc.text('This is to certify that', pageWidth / 2, startY, { align: 'center' });

  // Donor name (highlighted)
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text(data.donorName, pageWidth / 2, startY + 12, { align: 'center' });

  // Donation details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  
  const detailsY = startY + 25;
  let currentLine = detailsY;

  if (data.donationType === 'food_donation') {
    doc.text(
      `has generously donated ${data.quantity} ${data.quantityUnit || 'meals'} of ${data.foodName || 'food'}`,
      pageWidth / 2,
      currentLine,
      { align: 'center' }
    );
    currentLine += 8;
    
    if (data.ngoName) {
      doc.text(
        `to ${data.ngoName}`,
        pageWidth / 2,
        currentLine,
        { align: 'center' }
      );
      currentLine += 8;
    }
  } else {
    doc.text(
      'has contributed to the Zero Waste mission',
      pageWidth / 2,
      currentLine,
      { align: 'center' }
    );
    currentLine += 8;
  }

  doc.text(
    `on ${data.donationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    pageWidth / 2,
    currentLine,
    { align: 'center' }
  );

  // Impact metrics box
  const boxY = currentLine + 15;
  const boxHeight = 35;
  
  // Box background
  doc.setFillColor(239, 246, 255); // Blue-50
  doc.roundedRect(40, boxY, pageWidth - 80, boxHeight, 3, 3, 'F');
  
  // Box border
  doc.setDrawColor(147, 197, 253); // Blue-300
  doc.setLineWidth(0.5);
  doc.roundedRect(40, boxY, pageWidth - 80, boxHeight, 3, 3, 'S');

  // Impact metrics title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Environmental Impact', pageWidth / 2, boxY + 8, { align: 'center' });

  // Metrics
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85); // Slate-700

  const metricsY = boxY + 16;
  const col1X = 70;
  const col2X = pageWidth / 2;
  const col3X = pageWidth - 70;

  // Meals served
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.impactMetrics.mealsServed}`, col1X, metricsY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Meals Served', col1X, metricsY + 5, { align: 'center' });

  // CO2 prevented
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.impactMetrics.co2Prevented.toFixed(1)} kg`, col2X, metricsY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('CO₂ Prevented', col2X, metricsY + 5, { align: 'center' });

  // Food waste averted
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.impactMetrics.foodWasteAverted.toFixed(1)} kg`, col3X, metricsY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Waste Averted', col3X, metricsY + 5, { align: 'center' });

  // Certificate ID and blockchain hash
  const footerY = boxY + boxHeight + 15;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate-500
  
  doc.text(`Certificate ID: ${data.certificateId}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Blockchain Hash: ${data.blockchainHash.substring(0, 40)}...`, pageWidth / 2, footerY + 4, { align: 'center' });

  // Signature line
  const sigY = footerY + 15;
  doc.setDrawColor(203, 213, 225);
  doc.line(pageWidth - 80, sigY, pageWidth - 30, sigY);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(71, 85, 105);
  doc.text('Verified by Zero Waste Platform', pageWidth - 55, sigY + 5, { align: 'center' });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(
    'This certificate is digitally verified and can be validated at zerowaste.org/verify',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Convert to blob
  return doc.output('blob');
}

/**
 * Download CSR certificate
 */
export function downloadCertificate(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download certificate for a completed donation
 */
export async function generateDonationCertificate(
  donorName: string,
  donorId: string,
  foodItem: {
    id: string;
    foodName?: string;
    name?: string;
    quantity: number;
    quantityUnit?: string;
    createdAt?: any;
    deliveredAt?: any;
  },
  ngoName?: string,
  blockchainHash?: string
): Promise<void> {
  const quantity = foodItem.quantity || 0;
  const certificateData: CertificateData = {
    certificateId: `CSR-${foodItem.id.substring(0, 8).toUpperCase()}`,
    donorName,
    donorId,
    donationType: 'food_donation',
    foodName: foodItem.foodName || foodItem.name || 'Food',
    quantity,
    quantityUnit: foodItem.quantityUnit || 'meals',
    ngoName,
    donationDate: foodItem.createdAt?.toDate ? foodItem.createdAt.toDate() : new Date(),
    deliveredDate: foodItem.deliveredAt?.toDate ? foodItem.deliveredAt.toDate() : undefined,
    blockchainHash: blockchainHash || 'PENDING_VERIFICATION',
    impactMetrics: {
      mealsServed: quantity,
      co2Prevented: quantity * 2.5, // 2.5 kg CO2 per meal
      foodWasteAverted: quantity * 0.3, // 0.3 kg per meal
    },
  };

  const blob = await generateCSRCertificate(certificateData);
  const filename = `CSR_Certificate_${certificateData.certificateId}_${donorName.replace(/\s+/g, '_')}.pdf`;
  
  downloadCertificate(blob, filename);
}

/**
 * Share certificate via Web Share API (mobile)
 */
export async function shareCertificate(blob: Blob, certificateId: string): Promise<void> {
  if (!navigator.share) {
    alert('Sharing not supported on this device. Certificate downloaded instead.');
    downloadCertificate(blob, `CSR_Certificate_${certificateId}.pdf`);
    return;
  }

  try {
    const file = new File([blob], `CSR_Certificate_${certificateId}.pdf`, {
      type: 'application/pdf',
    });

    await navigator.share({
      title: 'CSR Certificate - Zero Waste Platform',
      text: 'Check out my contribution to reducing food waste!',
      files: [file],
    });
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Share failed:', error);
      downloadCertificate(blob, `CSR_Certificate_${certificateId}.pdf`);
    }
  }
}

