import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, CheckCircle, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../lib/firebase';
import { toast } from 'react-toastify';

interface ProofUploadProps {
  claimId: string;
  onClose: () => void;
  onSuccess: (imageUrl: string, fileName: string) => void;
}

const ProofUpload: React.FC<ProofUploadProps> = ({ claimId, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, uploading]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const mockEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(mockEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Upload and verify
  const handleUploadAndVerify = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    setUploading(true);

    try {
      // For demo purposes, we'll use a base64 data URL
      // In production, you'd upload to Firebase Storage
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;

        // Update Firestore with proof and mark as verified
        await updateDoc(doc(db, 'claims', claimId), {
          proofImage: imageUrl,
          proofFileName: selectedFile.name,
          status: 'verified',
          verifiedAt: Timestamp.now(),
        });

        toast.success('Proof uploaded and donation verified!');
        onSuccess(imageUrl, selectedFile.name);
      };
      reader.readAsDataURL(selectedFile);

      // Alternative: Upload to Firebase Storage (uncomment in production)
      /*
      const storage = getStorage();
      const storageRef = ref(storage, `proofs/${claimId}/${selectedFile.name}`);
      
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'claims', claimId), {
        proofImage: downloadURL,
        proofFileName: selectedFile.name,
        status: 'verified',
        verifiedAt: Timestamp.now(),
      });

      toast.success('Proof uploaded and donation verified!');
      onSuccess(downloadURL, selectedFile.name);
      */
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload proof');
      setUploading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4"
      onClick={(e) => {
        // Close modal when clicking on backdrop (only if not uploading)
        if (e.target === e.currentTarget && !uploading) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Upload Delivery Proof</h2>
              <p className="text-indigo-100 text-sm">Verify this donation with photo evidence</p>
            </div>
            <button
              onClick={onClose}
              disabled={uploading}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all hover:scale-110 disabled:opacity-50"
              title="Close (ESC)"
              aria-label="Close modal"
            >
              <X size={24} className="text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Instructions */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-bold text-blue-900 mb-1">Upload Guidelines</h3>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Photo should clearly show the delivered food</li>
                  <li>Include NGO representative or location in the frame</li>
                  <li>Accepted formats: JPG, PNG (max 5MB)</li>
                  <li>Once uploaded, donation will be marked as "Verified"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`border-3 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!selectedFile ? (
              <>
                <Upload className="mx-auto mb-4 text-slate-400" size={48} />
                <p className="text-lg font-bold text-slate-900 mb-1">
                  Click or Drag to Upload
                </p>
                <p className="text-sm text-slate-600">
                  JPG, PNG up to 5MB
                </p>
              </>
            ) : (
              <>
                <CheckCircle className="mx-auto mb-4 text-green-600" size={48} />
                <p className="text-lg font-bold text-green-900 mb-1">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-green-700">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </>
            )}
          </div>

          {/* Image Preview */}
          {preview && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ImageIcon size={20} className="text-slate-600" />
                Preview
              </h3>
              <img
                src={preview}
                alt="Preview"
                className="w-full max-h-64 object-contain rounded-lg border-2 border-slate-200"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              title="Close modal (ESC)"
            >
              <X size={18} />
              Cancel
            </button>
            <button
              onClick={handleUploadAndVerify}
              disabled={!selectedFile || uploading}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-3 px-6 rounded-xl hover:from-green-700 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading...
                </div>
              ) : (
                <>
                  <CheckCircle className="inline mr-2" size={20} />
                  Upload & Verify
                </>
              )}
            </button>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>Note:</strong> Once verified, this action cannot be undone. The donor will receive a CSR certificate.
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProofUpload;

