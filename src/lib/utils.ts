import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

import { auth } from './firebase';
import { toast } from 'sonner';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dv6p4lse4';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'precision_garage';

export async function uploadImage(file: File, _path?: string): Promise<string> {
  if (!auth.currentUser) {
    toast.error('Você precisa estar logado para enviar imagens.');
    throw new Error('Usuário não autenticado.');
  }

  if (file.size > 10 * 1024 * 1024) {
    toast.error('Imagem muito grande. Máximo 10MB.');
    throw new Error('Arquivo muito grande.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `precision-garage/${auth.currentUser.uid}`);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[uploadImage] Cloudinary error:', errData);
      toast.error(`Erro no upload: ${errData?.error?.message || res.statusText}`);
      throw new Error(errData?.error?.message || 'Upload failed');
    }

    const data = await res.json();
    return data.secure_url as string;
  } catch (error: any) {
    if (!error.message?.includes('Upload failed')) {
      console.error('[uploadImage] Erro inesperado:', error);
      toast.error('Erro inesperado no upload. Verifique sua conexão.');
    }
    throw error;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
