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

import { auth, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';

export async function uploadImage(file: File, path: string): Promise<string> {
  // Verifica autenticação antes de tentar
  if (!auth.currentUser) {
    toast.error('Você precisa estar logado para enviar imagens.');
    throw new Error('Usuário não autenticado.');
  }

  // Verifica tamanho máximo (5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Imagem muito grande. Máximo 5MB.');
    throw new Error('Arquivo muito grande.');
  }

  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (error: any) {
    console.error('[uploadImage] Erro:', error?.code, error?.message);

    // Mensagens amigáveis por código de erro do Firebase Storage
    if (error?.code === 'storage/unauthorized') {
      toast.error('Sem permissão para upload. Verifique as Storage Rules no Firebase Console.');
    } else if (error?.code === 'storage/canceled') {
      toast.error('Upload cancelado.');
    } else if (error?.code === 'storage/quota-exceeded') {
      toast.error('Cota de armazenamento excedida.');
    } else if (error?.code === 'storage/invalid-url') {
      toast.error('URL de storage inválida. Verifique a configuração do Firebase.');
    } else {
      toast.error(`Erro no upload: ${error?.message || 'desconhecido'}`);
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
