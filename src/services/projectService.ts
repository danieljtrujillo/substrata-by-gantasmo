import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { LaserSettings } from '../constants';
import { ImageProcessOptions } from '../lib/imageProcessor';

export interface LaserProject {
  id: string;
  name: string;
  userId: string;
  originalImage: string | null;
  processedImage: string | null;
  laserSettings: LaserSettings;
  procOptions: ImageProcessOptions;
  createdAt: any;
  updatedAt: any;
}

const handleFirestoreError = (error: any, operation: string, path: string | null = null) => {
  const user = auth?.currentUser;
  const errorInfo = {
    error: error.message || 'Unknown error',
    operationType: operation,
    path: path,
    authInfo: {
      userId: user?.uid || 'unauthenticated',
      email: user?.email || 'N/A',
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || false,
      providerInfo: user?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      })) || []
    }
  };
  console.error("Firestore Error:", errorInfo);
  throw new Error(JSON.stringify(errorInfo));
};

export const saveProject = async (project: Omit<LaserProject, 'userId' | 'createdAt' | 'updatedAt'>) => {
  const user = auth?.currentUser;
  if (!user || !db) throw new Error("User must be logged in to save projects");

  const projectPath = `users/${user.uid}/projects/${project.id}`;
  try {
    const projectRef = doc(db, projectPath);
    const existing = await getDoc(projectRef);
    
    if (existing.exists()) {
      await setDoc(projectRef, {
        ...project,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      await setDoc(projectRef, {
        ...project,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, 'write', projectPath);
  }
};

export const getProjects = async (): Promise<LaserProject[]> => {
  const user = auth?.currentUser;
  if (!user || !db) return [];

  const projectsPath = `users/${user.uid}/projects`;
  try {
    const q = query(collection(db, projectsPath), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaserProject));
  } catch (error) {
    handleFirestoreError(error, 'list', projectsPath);
    return [];
  }
};

export const renameProject = async (projectId: string, newName: string) => {
  const user = auth?.currentUser;
  if (!user || !db) return;

  const projectPath = `users/${user.uid}/projects/${projectId}`;
  try {
    const projectRef = doc(db, projectPath);
    await setDoc(projectRef, {
      name: newName,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'update', projectPath);
  }
};

export const deleteProject = async (projectId: string) => {
  const user = auth?.currentUser;
  if (!user || !db) return;

  const projectPath = `users/${user.uid}/projects/${projectId}`;
  try {
    await deleteDoc(doc(db, projectPath));
  } catch (error) {
    handleFirestoreError(error, 'delete', projectPath);
  }
};

/**
 * Validates connection to Firestore as per requirements.
 */
export async function testFirestoreConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration or network.");
      }
    }
}
