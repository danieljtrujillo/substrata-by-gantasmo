import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CadMeshArtifact {
  kind: 'step' | 'stl' | 'glb' | 'obj' | 'openscad' | 'cadquery_py' | 'source';
  url?: string;
}

interface Props {
  artifacts: CadMeshArtifact[];
  color?: string;
  targetSize?: number;
  onLoadError?: (err: Error) => void;
}

interface LoadedMesh {
  scene: THREE.Object3D;
  dispose: () => void;
}

function pickArtifact(artifacts: CadMeshArtifact[]): CadMeshArtifact | null {
  return (
    artifacts.find(a => a.kind === 'glb' && a.url)
    ?? artifacts.find(a => a.kind === 'stl' && a.url)
    ?? null
  );
}

async function loadStl(url: string, color: string): Promise<LoadedMesh> {
  const loader = new STLLoader();
  const geometry = await loader.loadAsync(url);
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.4,
    roughness: 0.35,
    clearcoat: 0.4,
    clearcoatRoughness: 0.15,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return {
    scene: mesh,
    dispose: () => { geometry.dispose(); material.dispose(); },
  };
}

async function loadGlb(url: string): Promise<LoadedMesh> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  return {
    scene: gltf.scene,
    dispose: () => {
      gltf.scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach(m => m.dispose());
        else if (material) material.dispose();
      });
    },
  };
}

function fitToBox(object: THREE.Object3D, targetSize: number): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;
  object.scale.multiplyScalar(scale);
  object.position.sub(center.multiplyScalar(scale));
}

export const CadMeshViewer: React.FC<Props> = ({
  artifacts, color = '#7aa2ff', targetSize = 8, onLoadError,
}) => {
  const artifact = useMemo(() => pickArtifact(artifacts), [artifacts]);
  const [loaded, setLoaded] = useState<LoadedMesh | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!artifact?.url) { setLoaded(null); return; }
    setError(null);
    const loader = artifact.kind === 'glb' ? loadGlb(artifact.url) : loadStl(artifact.url, color);
    loader.then(result => {
      if (cancelled) { result.dispose(); return; }
      fitToBox(result.scene, targetSize);
      setLoaded(prev => {
        prev?.dispose();
        return result;
      });
    }).catch(err => {
      if (cancelled) return;
      setError(err?.message ?? String(err));
      onLoadError?.(err);
    });
    return () => {
      cancelled = true;
    };
  }, [artifact?.url, artifact?.kind, color, targetSize, onLoadError]);

  useEffect(() => () => { loaded?.dispose(); }, [loaded]);

  if (error) {
    return null;
  }
  if (!loaded) return null;
  return <primitive object={loaded.scene} />;
};
