
export interface DocumentUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadDocument = async (
  file: File, 
  documentType: string, 
  userId: string
): Promise<DocumentUploadResult> => {
  // Validate file
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 
    'application/pdf', 'image/jpg'
  ];

  if (!allowedTypes.includes(file.type)) {
    return { 
      success: false, 
      error: 'Only images (JPEG, PNG, WebP) and PDF files are allowed' 
    };
  }

  if (file.size > maxSize) {
    return { 
      success: false, 
      error: 'File size must be less than 10MB' 
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('userId', userId);

    const response = await fetch('/api/upload-document', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return {
      success: true,
      url: result.url,
    };
  } catch (error) {
    console.error('Document upload error:', error);
    return {
      success: false,
      error: 'Failed to upload document',
    };
  }
};
