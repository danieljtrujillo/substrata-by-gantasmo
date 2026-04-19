import { getCurrentUser } from '../lib/auth';
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

// localStorage fallback (used when not authenticated)
const LOCAL_STORAGE_KEY = 'substrata_projects';

const getLocalProjects = (): LaserProject[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const setLocalProjects = (projects: LaserProject[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
};

const isAuthenticated = () => !!getCurrentUser();

export const saveProject = async (project: Omit<LaserProject, 'userId' | 'createdAt' | 'updatedAt'>) => {
  if (!isAuthenticated()) {
    const projects = getLocalProjects();
    const now = new Date().toISOString();
    const idx = projects.findIndex(p => p.id === project.id);
    const full: LaserProject = { ...project, userId: 'local', createdAt: now, updatedAt: now };
    if (idx >= 0) {
      full.createdAt = projects[idx].createdAt;
      projects[idx] = full;
    } else {
      projects.unshift(full);
    }
    setLocalProjects(projects);
    return;
  }

  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Save failed' }));
    throw new Error(err.error || 'Save failed');
  }
};

export const getProjects = async (): Promise<LaserProject[]> => {
  if (!isAuthenticated()) {
    return getLocalProjects();
  }

  const res = await fetch('/api/projects');
  if (!res.ok) {
    console.error('Failed to fetch projects:', res.status);
    return getLocalProjects();
  }
  return res.json();
};

export const renameProject = async (projectId: string, newName: string) => {
  if (!isAuthenticated()) {
    const projects = getLocalProjects();
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      proj.name = newName;
      proj.updatedAt = new Date().toISOString();
      setLocalProjects(projects);
    }
    return;
  }

  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Rename failed' }));
    throw new Error(err.error || 'Rename failed');
  }
};

export const deleteProject = async (projectId: string) => {
  if (!isAuthenticated()) {
    const projects = getLocalProjects().filter(p => p.id !== projectId);
    setLocalProjects(projects);
    return;
  }

  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(err.error || 'Delete failed');
  }
};
