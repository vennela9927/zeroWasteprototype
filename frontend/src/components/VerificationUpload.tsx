import React, { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Upload, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

interface VerificationUploadProps {
  userId: string;
  userRole: 'donor' | 'recipient';
  currentVerificationStatus?: 'pending' | 'approved' | 'rejected' | null;
  onUploadComplete?: () => void;
}

/**
 * VerificationUpload Component
 * 
 * Handles document upload for user verification (Aadhaar for donors, NGO certificates for recipients).
 * Features:
 * - Drag & drop file upload
 * - Progress tracking
 * - Firebase Storage integration
 * - Firestore verification record creation
 */
export const VerificationUpload: React.FC<VerificationUploadProps> = ({
  userId,
  userRole,
  currentVerificationStatus,
  onUploadComplete,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [documentNumber, setDocumentNumber] = useState('');

  const storage = getStorage();

  const documentType = userRole === 'donor' ? 'aadhaar' : 'ngo_certificate';
  const documentLabel = userRole === 'donor' ? 'Aadhaar Card' : 'NGO Registration Certificate';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!documentNumber.trim() && userRole === 'donor') {
      toast.error('Please enter your Aadhaar number');
      return;
    }

    try {
      setUploading(true);

      // Create storage reference
      const fileExtension = selectedFile.name.split('.').pop();
      const storagePath = `verification/${userId}/${documentType}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, storagePath);

      // Upload file with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          toast.error('Upload failed: ' + error.message);
          setUploading(false);
        },
        async () => {
          // Upload complete - get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Create verification record in Firestore
          const verificationData = {
            userId,
            verificationType: documentType,
            documentUrl: downloadURL,
            documentNumber: userRole === 'donor' ? maskAadhaar(documentNumber) : undefined,
            verificationStatus: 'pending',
            submittedAt: serverTimestamp(),
            userRole,
          };

          await setDoc(doc(db, 'verification_requests', userId), verificationData);

          toast.success('Document uploaded successfully! Verification pending.');
          setUploading(false);
          setUploadProgress(0);
          setSelectedFile(null);
          setDocumentNumber('');
          onUploadComplete?.();
        }
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document: ' + error.message);
      setUploading(false);
    }
  };

  // Mask Aadhaar number for privacy (show only last 4 digits)
  const maskAadhaar = (aadhaar: string): string => {
    const cleaned = aadhaar.replace(/\s/g, '');
    if (cleaned.length !== 12) return '****';
    return `XXXX-XXXX-${cleaned.slice(-4)}`;
  };

  const getStatusDisplay = () => {
    if (!currentVerificationStatus) {
      return (
        <div className="flex items-center gap-2 text-slate-600">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">Not Verified</span>
        </div>
      );
    }

    const statusConfig = {
      pending: {
        icon: Clock,
        color: 'text-amber-700 bg-amber-100 border-amber-300',
        label: 'Verification Pending',
      },
      approved: {
        icon: CheckCircle,
        color: 'text-green-700 bg-green-100 border-green-300',
        label: 'Verified ✓',
      },
      rejected: {
        icon: XCircle,
        color: 'text-red-700 bg-red-100 border-red-300',
        label: 'Verification Rejected',
      },
    };

    const config = statusConfig[currentVerificationStatus];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${config.color}`}>
        <Icon size={16} />
        <span className="text-sm font-bold">{config.label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
            Verification Status
          </p>
          {getStatusDisplay()}
        </div>
      </div>

      {/* Upload Section (only if not approved) */}
      {currentVerificationStatus !== 'approved' && (
        <>
          {/* Document Number Input (Aadhaar for donors) */}
          {userRole === 'donor' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                Aadhaar Number
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="1234 5678 9012"
                maxLength={14}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm"
                disabled={uploading}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Your Aadhaar will be masked for privacy (only last 4 digits stored)
              </p>
            </div>
          )}

          {/* File Upload Area */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
              Upload {documentLabel}
            </label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
              <Upload size={32} className="mx-auto mb-3 text-slate-400" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Drag & drop your document here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">or click to browse</p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Accepted: JPG, PNG, PDF (Max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 text-center font-medium">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="w-full px-5 py-3 rounded-lg bg-gradient-to-r from-blue-700 to-cyan-500 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-800 hover:to-cyan-600 transition-all"
          >
            {uploading ? 'Uploading...' : 'Submit for Verification'}
          </button>
        </>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs font-semibold text-blue-900 mb-2">🔒 Why Verification?</p>
        <ul className="text-[10px] text-blue-700 space-y-1 ml-4 list-disc">
          <li>Builds trust between donors and NGOs</li>
          <li>Prevents fraud and fake accounts</li>
          <li>Verified users get priority in matching</li>
          <li>All documents are encrypted and stored securely</li>
          <li>Typically approved within 24-48 hours</li>
        </ul>
      </div>
    </div>
  );
};

export default VerificationUpload;

