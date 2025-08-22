import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface UploadValidation {
  valid: boolean;
  error?: string;
}

interface UploadResponse {
  url: string;
  filename: string;
}

export class UploadService {
  static validateFile(file: File): UploadValidation {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only image files (JPEG, PNG, WebP, GIF) are allowed' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 5MB' };
    }

    return { valid: true };
  }

  static async uploadToFirebase(file: File, path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading to Firebase:', error);
      throw new Error('Failed to upload file to Firebase Storage');
    }
  }

  static async uploadToLocal(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('paymentId', `temp_${Date.now()}`);

    try {
      const response = await fetch('/api/upload-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      return {
        url: result.url,
        filename: result.filename,
      };
    } catch (error) {
      console.error('Error uploading via proxy:', error);
      throw new Error('Failed to upload file via proxy API');
    }
  }

  static async uploadPaymentReceipt(file: File, userId: string, paymentId?: string): Promise<string> {
    const response = await this.uploadToLocal(file);
    return response.url;
  }

  static async uploadProfileImage(file: File, userId: string): Promise<string> {
    const response = await this.uploadToLocal(file);
    return response.url;
  }
}