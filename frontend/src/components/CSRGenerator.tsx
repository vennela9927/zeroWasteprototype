import React from 'react';
import { Download, Award } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'react-toastify';
import QRCode from 'qrcode';

interface DonationData {
  id: string;
  foodName: string;
  donorName: string;
  recipientName: string;
  quantity: number;
  status: string;
  verifiedAt?: Date;
  proofImage?: string;
  location?: string;
}

interface CSRGeneratorProps {
  donation: DonationData;
}

const CSRGenerator: React.FC<CSRGeneratorProps> = ({ donation }) => {
  const generateCertificate = async () => {
    try {
      toast.info('Generating CSR Certificate...');

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Background gradient (simulated with rectangles)
      doc.setFillColor(245, 247, 250);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Border
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(2);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

      // Inner border
      doc.setDrawColor(147, 197, 253);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24, 'S');

      // Header - Certificate Title
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 20, pageWidth, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('CSR DONATION CERTIFICATE', pageWidth / 2, 37, { align: 'center' });

      // Certificate Number
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Certificate No: CSR-${donation.id.substring(0, 8).toUpperCase()}`, pageWidth / 2, 42, { align: 'center' });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('This is to certify that', pageWidth / 2, 60, { align: 'center' });

      // Donor Name
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(donation.donorName, pageWidth / 2, 72, { align: 'center' });

      // Underline donor name
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - 50, 74, pageWidth / 2 + 50, 74);

      // Description
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text('has successfully donated to', pageWidth / 2, 82, { align: 'center' });

      // NGO Name
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(donation.recipientName, pageWidth / 2, 92, { align: 'center' });

      // Donation Details Box
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(40, 100, pageWidth - 80, 35, 3, 3, 'FD');

      // Details
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      
      const leftCol = 50;
      const rightCol = pageWidth / 2 + 10;
      let yPos = 110;

      doc.text('Food Item:', leftCol, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(donation.foodName, leftCol + 40, yPos);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('Quantity:', rightCol, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`${donation.quantity} servings`, rightCol + 40, yPos);

      yPos += 10;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('Donation Date:', leftCol, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(donation.verifiedAt?.toLocaleDateString() || new Date().toLocaleDateString(), leftCol + 40, yPos);

      if (donation.location) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175);
        doc.text('Location:', rightCol, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const locationText = donation.location.length > 30 
          ? donation.location.substring(0, 30) + '...' 
          : donation.location;
        doc.text(locationText, rightCol + 40, yPos);
      }

      yPos += 10;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('Status:', leftCol, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(16, 185, 129);
      doc.text('✓ VERIFIED', leftCol + 40, yPos);

      // Generate QR Code for verification
      try {
        const qrData = `https://zerowaste.app/verify/${donation.id}`;
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#1e40af',
            light: '#ffffff',
          },
        });
        
        doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - 45, 145, 30, 30);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Scan to verify', pageWidth - 30, 178, { align: 'center' });
      } catch (error) {
        console.error('QR code generation failed:', error);
      }

      // Proof Image (thumbnail if available)
      if (donation.proofImage) {
        try {
          doc.addImage(donation.proofImage, 'JPEG', 25, 145, 40, 30);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text('Delivery Proof', 45, 178, { align: 'center' });
        } catch (error) {
          console.error('Could not add proof image:', error);
        }
      }

      // Verification Stamp
      doc.setFillColor(16, 185, 129);
      doc.circle(pageWidth / 2, 155, 20, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('VERIFIED', pageWidth / 2, 152, { align: 'center' });
      doc.setFontSize(10);
      doc.text('✓', pageWidth / 2, 160, { align: 'center' });

      // Footer
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(
        'This certificate is issued by ZeroWaste Initiative in recognition of valuable contribution to social welfare.',
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );

      doc.setFontSize(8);
      doc.text(
        `Generated on: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: 'center' }
      );

      // Signature line
      doc.setLineWidth(0.3);
      doc.setDrawColor(100, 116, 139);
      doc.line(pageWidth - 80, pageHeight - 30, pageWidth - 30, pageHeight - 30);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Authorized Signature', pageWidth - 55, pageHeight - 25, { align: 'center' });

      // Save the PDF
      const fileName = `CSR_Certificate_${donation.donorName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
      doc.save(fileName);

      toast.success('CSR Certificate downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate certificate');
    }
  };

  return (
    <button
      onClick={generateCertificate}
      className="w-full bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold py-3 px-6 rounded-xl hover:from-amber-700 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
    >
      <Award size={20} />
      <Download size={20} />
      Download CSR Certificate
    </button>
  );
};

export default CSRGenerator;

