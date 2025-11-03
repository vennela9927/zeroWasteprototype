import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Share2 } from 'lucide-react';

interface QRCodeData {
  food_id: string;
  donor_id: string;
  donor_name: string;
  food_name: string;
  quantity: number;
  created_at: string;
  expiry_time: string;
  verification_hash: string;
}

interface DonationQRCodeProps {
  foodItem: {
    id: string;
    donorId?: string;
    donorName?: string;
    foodName?: string;
    name?: string;
    quantity: number;
    createdAt?: any;
    expiryTime?: any;
    expiry?: string;
  };
  size?: number;
  showActions?: boolean;
}

/**
 * DonationQRCode Component
 * 
 * Generates a QR code for food donations containing all essential metadata.
 * Can be scanned by drivers at pickup/delivery for verification.
 */
export const DonationQRCode: React.FC<DonationQRCodeProps> = ({
  foodItem,
  size = 200,
  showActions = true,
}) => {
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate verification hash (simplified for MVP)
  const generateHash = (data: string): string => {
    // In production, use proper SHA-256 hashing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  };

  // Prepare QR code data
  const qrData: QRCodeData = {
    food_id: foodItem.id,
    donor_id: foodItem.donorId || 'unknown',
    donor_name: foodItem.donorName || 'Anonymous',
    food_name: foodItem.foodName || foodItem.name || 'Food Item',
    quantity: foodItem.quantity,
    created_at: foodItem.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    expiry_time: foodItem.expiryTime?.toDate?.()?.toISOString() || foodItem.expiry || '',
    verification_hash: generateHash(foodItem.id + foodItem.donorId),
  };

  const qrString = JSON.stringify(qrData);

  // Download QR code as PNG
  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `donation-qr-${foodItem.id}.png`;
      link.click();
    }
  };

  // Share QR code (Web Share API)
  const handleShare = async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (canvas) {
      canvas.toBlob(async (blob) => {
        if (blob && navigator.share) {
          try {
            await navigator.share({
              title: 'Food Donation QR Code',
              text: `Donation: ${qrData.food_name} (${qrData.quantity} meals)`,
              files: [new File([blob], `donation-${foodItem.id}.png`, { type: 'image/png' })],
            });
          } catch (err) {
            console.log('Share failed:', err);
            // Fallback to download
            handleDownload();
          }
        } else {
          // Fallback to download if share not supported
          handleDownload();
        }
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code Display */}
      <div
        ref={qrRef}
        className="p-4 bg-white border-4 border-slate-800 rounded-2xl shadow-lg"
      >
        <QRCodeCanvas
          value={qrString}
          size={size}
          level="H" // High error correction
          includeMargin={true}
        />
      </div>

      {/* QR Code Info */}
      <div className="text-center">
        <p className="text-sm font-bold text-slate-800">
          {qrData.food_name}
        </p>
        <p className="text-xs text-slate-600">
          ID: {foodItem.id}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Scan at pickup & delivery for verification
        </p>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
          >
            <Download size={16} />
            Download QR
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      )}

      {/* Verification Hash Display */}
      <div className="mt-2 p-3 bg-slate-100 rounded-lg border border-slate-300 w-full max-w-md">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-1">
          Verification Hash (for blockchain)
        </p>
        <p className="text-xs font-mono text-slate-800 break-all">
          {qrData.verification_hash}
        </p>
      </div>
    </div>
  );
};

export default DonationQRCode;

