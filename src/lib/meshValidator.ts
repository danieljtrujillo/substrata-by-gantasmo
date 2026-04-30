import * as THREE from 'three';

export interface FileSignatureResult {
  valid: boolean;
  detectedType: string;
  claimedExtension: string;
  mismatch: boolean;
  warning?: string;
}

export interface STLValidationResult {
  isValid: boolean;
  isBinary: boolean;
  triangleCount: number;
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } | null;
  warnings: string[];
}

export interface GLBValidationResult {
  isValid: boolean;
  version: number;
  meshCount: number;
  warnings: string[];
}

export interface MeshIntegrityResult {
  nonManifoldEdges: number;
  degenerateTriangles: number;
  duplicateVertexRatio: number;
  warnings: string[];
}

export interface ValidationReport {
  filename: string;
  fileType: string;
  fileSizeBytes: number;
  signatureCheck: FileSignatureResult;
  triangleCount?: number;
  boundingBoxMm?: { x: number; y: number; z: number };
  warnings: string[];
  errors: string[];
  printabilityNotes: string[];
  overallScore: 'pass' | 'warn' | 'fail';
}

// ── File signature / magic-byte detection ───────────────────────────────────

export function verifyFileSignature(buffer: ArrayBuffer, filename: string): FileSignatureResult {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'unknown';
  const bytes = new Uint8Array(buffer.slice(0, 12));

  let detectedType = 'unknown';

  // GLB: 'glTF' (0x67 0x6C 0x54 0x46)
  if (bytes[0] === 0x67 && bytes[1] === 0x6C && bytes[2] === 0x54 && bytes[3] === 0x46) {
    detectedType = 'glb';
  }
  // GLTF: starts with '{' (JSON)
  else if (bytes[0] === 0x7B) {
    detectedType = 'gltf';
  }
  // OBJ: plain text, first byte typically printable ASCII
  else if (ext === 'obj' && bytes[0] >= 0x20 && bytes[0] < 0x80) {
    detectedType = 'obj';
  }
  // STL binary: check triangle count against file size
  else if (buffer.byteLength > 84) {
    const view = new DataView(buffer);
    const triCount = view.getUint32(80, true);
    const expectedSize = 84 + triCount * 50;
    if (triCount > 0 && Math.abs(buffer.byteLength - expectedSize) <= 2) {
      detectedType = 'stl-binary';
    } else {
      const header = new TextDecoder().decode(buffer.slice(0, 80)).trim().toLowerCase();
      detectedType = header.startsWith('solid') ? 'stl-ascii' : 'unknown-binary';
    }
  }

  const claimsMatch =
    (ext === 'glb' && detectedType === 'glb') ||
    (ext === 'gltf' && detectedType === 'gltf') ||
    (ext === 'stl' && detectedType.startsWith('stl')) ||
    (ext === 'obj' && detectedType === 'obj');

  const mismatch = !claimsMatch && detectedType !== 'unknown' && ext !== 'unknown';

  return {
    valid: !mismatch,
    detectedType,
    claimedExtension: ext,
    mismatch,
    warning: mismatch
      ? `"${filename}" has extension .${ext} but file content looks like ${detectedType}`
      : undefined,
  };
}

// ── STL validation ───────────────────────────────────────────────────────────

export function validateSTLBuffer(buffer: ArrayBuffer): STLValidationResult {
  const warnings: string[] = [];

  if (buffer.byteLength < 84) {
    return { isValid: false, isBinary: false, triangleCount: 0, boundingBox: null, warnings: ['File too small to be a valid STL'] };
  }

  const header = new TextDecoder().decode(buffer.slice(0, 80)).trim().toLowerCase();
  const isBinary = !header.startsWith('solid');

  if (isBinary) {
    const view = new DataView(buffer);
    const triCount = view.getUint32(80, true);
    const expectedSize = 84 + triCount * 50;

    if (triCount === 0) {
      return { isValid: false, isBinary: true, triangleCount: 0, boundingBox: null, warnings: ['Binary STL has zero triangles'] };
    }
    if (buffer.byteLength !== expectedSize) {
      warnings.push(`File size (${buffer.byteLength}B) does not match expected ${expectedSize}B for ${triCount} triangles — file may be truncated`);
    }
    if (triCount > 5_000_000) {
      warnings.push(`Very high triangle count (${triCount.toLocaleString()}) — consider mesh decimation before slicing`);
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let degenerateCount = 0;
    let nanCount = 0;

    // Sample up to 20 000 triangles for performance on large files
    const stride = Math.max(1, Math.floor(triCount / 20000));

    for (let i = 0; i < triCount; i += stride) {
      const base = 84 + i * 50;
      if (base + 50 > buffer.byteLength) break;

      // Normal at base+0, vertices at base+12, base+24, base+36
      const x1 = view.getFloat32(base + 12, true), y1 = view.getFloat32(base + 16, true), z1 = view.getFloat32(base + 20, true);
      const x2 = view.getFloat32(base + 24, true), y2 = view.getFloat32(base + 28, true), z2 = view.getFloat32(base + 32, true);
      const x3 = view.getFloat32(base + 36, true), y3 = view.getFloat32(base + 40, true), z3 = view.getFloat32(base + 44, true);

      if (!isFinite(x1) || !isFinite(y1) || !isFinite(z1) ||
          !isFinite(x2) || !isFinite(y2) || !isFinite(z2) ||
          !isFinite(x3) || !isFinite(y3) || !isFinite(z3)) {
        nanCount++;
        continue;
      }

      // Degenerate triangle: zero cross-product area
      const ex1 = x2 - x1, ey1 = y2 - y1, ez1 = z2 - z1;
      const ex2 = x3 - x1, ey2 = y3 - y1, ez2 = z3 - z1;
      const cx = ey1 * ez2 - ez1 * ey2;
      const cy = ez1 * ex2 - ex1 * ez2;
      const cz = ex1 * ey2 - ey1 * ex2;
      if (Math.sqrt(cx * cx + cy * cy + cz * cz) < 1e-10) { degenerateCount++; continue; }

      minX = Math.min(minX, x1, x2, x3); maxX = Math.max(maxX, x1, x2, x3);
      minY = Math.min(minY, y1, y2, y3); maxY = Math.max(maxY, y1, y2, y3);
      minZ = Math.min(minZ, z1, z2, z3); maxZ = Math.max(maxZ, z1, z2, z3);
    }

    if (nanCount > 0) warnings.push(`${nanCount} triangles contain NaN/Inf vertices — mesh is corrupt`);
    if (degenerateCount > 0) warnings.push(`${degenerateCount} degenerate (zero-area) triangles — may cause slicing artifacts`);

    const bb = (minX < Infinity) ? { minX, maxX, minY, maxY, minZ, maxZ } : null;

    if (bb) {
      const sx = bb.maxX - bb.minX, sy = bb.maxY - bb.minY, sz = bb.maxZ - bb.minZ;
      if (sx > 0 && sx < 0.1) warnings.push(`Extremely small X span (${sx.toFixed(4)}mm) — possible inch→mm unit error`);
      if (sy > 0 && sy < 0.1) warnings.push(`Extremely small Y span (${sy.toFixed(4)}mm) — possible unit error`);
      if (sz > 0 && sz < 0.1) warnings.push(`Extremely small Z span (${sz.toFixed(4)}mm) — possible unit error`);
      if (sx > 10000 || sy > 10000 || sz > 10000) warnings.push(`Geometry exceeds 10 000 mm — check units`);
    }

    return { isValid: warnings.filter(w => w.includes('corrupt') || w.includes('truncated')).length === 0, isBinary: true, triangleCount: triCount, boundingBox: bb, warnings };
  }

  // ASCII STL
  const text = new TextDecoder().decode(buffer);
  const facets = text.match(/facet\s+normal/gi);
  const triCount = facets?.length ?? 0;
  if (triCount === 0) {
    return { isValid: false, isBinary: false, triangleCount: 0, boundingBox: null, warnings: ['ASCII STL contains no facets'] };
  }
  if (!text.includes('endsolid')) {
    warnings.push('ASCII STL missing "endsolid" — file may be truncated');
  }
  return { isValid: true, isBinary: false, triangleCount: triCount, boundingBox: null, warnings };
}

// ── GLB / GLTF validation ────────────────────────────────────────────────────

export function validateGLBBuffer(buffer: ArrayBuffer): GLBValidationResult {
  const warnings: string[] = [];
  const view = new DataView(buffer);

  if (view.getUint32(0, true) !== 0x46546C67) {
    return { isValid: false, version: 0, meshCount: 0, warnings: ['Not a valid GLB: missing glTF magic bytes'] };
  }

  const version = view.getUint32(4, true);
  if (version !== 2) warnings.push(`GLB version ${version} — only version 2 is widely supported`);

  const declaredLength = view.getUint32(8, true);
  if (declaredLength !== buffer.byteLength) {
    warnings.push(`GLB length field (${declaredLength}) ≠ actual file size (${buffer.byteLength}) — possibly truncated`);
  }

  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  if (jsonChunkType !== 0x4E4F534A) {
    return { isValid: false, version, meshCount: 0, warnings: ['GLB first chunk is not JSON'] };
  }

  let meshCount = 0;
  try {
    const jsonText = new TextDecoder().decode(buffer.slice(20, 20 + jsonChunkLength));
    const gltf = JSON.parse(jsonText);

    if (!gltf.asset) warnings.push('GLTF missing asset object');
    if (!gltf.asset?.version) warnings.push('GLTF missing asset.version');

    meshCount = gltf.meshes?.length ?? 0;
    if (meshCount === 0) warnings.push('GLB contains no mesh data');
    if (!gltf.accessors?.length) warnings.push('GLB has no geometry accessors');
    if (meshCount > 1000) warnings.push(`Very high mesh count (${meshCount}) — may cause performance issues`);
  } catch {
    return { isValid: false, version, meshCount: 0, warnings: ['GLB JSON chunk is malformed'] };
  }

  return { isValid: true, version, meshCount, warnings };
}

// ── Three.js geometry integrity check ───────────────────────────────────────

export function checkThreeMeshIntegrity(geometry: THREE.BufferGeometry): MeshIntegrityResult {
  const warnings: string[] = [];
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const idx = geometry.getIndex();

  if (!pos) return { nonManifoldEdges: 0, degenerateTriangles: 0, duplicateVertexRatio: 0, warnings: ['No position attribute on geometry'] };

  const getVtx = (i: number) => idx ? idx.getX(i) : i;
  const triCount = idx ? idx.count / 3 : pos.count / 3;

  const edgeCount = new Map<string, number>();
  let degenerateTriangles = 0;

  for (let t = 0; t < triCount; t++) {
    const i0 = getVtx(t * 3), i1 = getVtx(t * 3 + 1), i2 = getVtx(t * 3 + 2);
    const v0 = new THREE.Vector3(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
    const v1 = new THREE.Vector3(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
    const v2 = new THREE.Vector3(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

    if (new THREE.Triangle(v0, v1, v2).getArea() < 1e-10) { degenerateTriangles++; continue; }

    for (const [a, b] of [[i0, i1], [i1, i2], [i2, i0]] as [number, number][]) {
      const key = `${Math.min(a, b)}_${Math.max(a, b)}`;
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
    }
  }

  let nonManifoldEdges = 0;
  for (const count of edgeCount.values()) if (count !== 2) nonManifoldEdges++;

  const sampleSize = Math.min(pos.count, 5000);
  const seen = new Set<string>();
  let dupes = 0;
  for (let i = 0; i < sampleSize; i++) {
    const key = `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
    if (seen.has(key)) dupes++;
    else seen.add(key);
  }
  const duplicateVertexRatio = dupes / sampleSize;

  if (degenerateTriangles > 0) warnings.push(`${degenerateTriangles} zero-area triangles — mesh has geometry errors`);
  if (nonManifoldEdges > 0) warnings.push(`${nonManifoldEdges} non-manifold edges — mesh is not watertight, will likely fail to slice`);
  if (duplicateVertexRatio > 0.15) warnings.push(`High duplicate vertex ratio (${(duplicateVertexRatio * 100).toFixed(0)}%) — recommend merging vertices`);

  return { nonManifoldEdges, degenerateTriangles, duplicateVertexRatio, warnings };
}

// ── Master validation report ─────────────────────────────────────────────────

export function generateValidationReport(buffer: ArrayBuffer, filename: string): ValidationReport {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const signatureCheck = verifyFileSignature(buffer, filename);

  const report: ValidationReport = {
    filename,
    fileType: ext,
    fileSizeBytes: buffer.byteLength,
    signatureCheck,
    warnings: signatureCheck.warning ? [signatureCheck.warning] : [],
    errors: [],
    printabilityNotes: [],
    overallScore: 'pass',
  };

  if (ext === 'stl') {
    const r = validateSTLBuffer(buffer);
    report.triangleCount = r.triangleCount;
    report.warnings.push(...r.warnings);
    if (!r.isValid) report.errors.push('STL structural validation failed');

    if (r.boundingBox) {
      const { minX, maxX, minY, maxY, minZ, maxZ } = r.boundingBox;
      const x = maxX - minX, y = maxY - minY, z = maxZ - minZ;
      report.boundingBoxMm = { x, y, z };

      if (x > 250 || y > 250 || z > 250)
        report.printabilityNotes.push(`Model (${x.toFixed(1)} × ${y.toFixed(1)} × ${z.toFixed(1)} mm) exceeds standard 250 mm FDM build volume — may need splitting`);
      else
        report.printabilityNotes.push(`Bounding box: ${x.toFixed(1)} × ${y.toFixed(1)} × ${z.toFixed(1)} mm — fits standard FDM bed`);

      if (z > Math.max(x, y) * 4)
        report.printabilityNotes.push('Very tall aspect ratio — consider supports or reorientation');
    }

    if ((r.triangleCount ?? 0) > 500_000)
      report.warnings.push(`${r.triangleCount?.toLocaleString()} triangles — decimate to < 500k for fast slicing`);
  }

  if (ext === 'glb') {
    const r = validateGLBBuffer(buffer);
    report.warnings.push(...r.warnings);
    if (!r.isValid) report.errors.push('GLB structural validation failed');
    if (r.meshCount > 0) report.printabilityNotes.push(`Contains ${r.meshCount} mesh object${r.meshCount > 1 ? 's' : ''}`);
  }

  if (report.errors.length > 0) report.overallScore = 'fail';
  else if (report.warnings.length > 0) report.overallScore = 'warn';

  return report;
}

// ── Validate generated OpenSCAD dimensions ───────────────────────────────────

export interface OpenSCADValidationResult {
  warnings: string[];
  dfmIssues: string[];
  score: 'pass' | 'warn' | 'fail';
}

export function validateOpenSCADForPrinting(code: string, printerBedMm = 250): OpenSCADValidationResult {
  const warnings: string[] = [];
  const dfmIssues: string[] = [];

  // Dimension value extraction
  const dimRegex = /(?:cube\(\[|cylinder\(.*?(?:r|h|d)\s*=\s*|sphere\(.*?(?:r|d)\s*=\s*)([\d.]+)/g;
  let m: RegExpExecArray | null;
  const dims: number[] = [];
  while ((m = dimRegex.exec(code)) !== null) {
    const v = parseFloat(m[1]);
    if (isFinite(v) && v > 0) dims.push(v);
  }

  for (const v of dims) {
    if (v > 0 && v < 0.5) warnings.push(`Dimension ${v}mm is below minimum printable feature size (0.5mm) — will be lost in printing`);
    if (v > printerBedMm) warnings.push(`Dimension ${v}mm exceeds printer bed size (${printerBedMm}mm)`);
  }

  // Wall thickness check: look for difference operations with thin remainders
  if (/difference\s*\(\s*\)/.test(code) && !/wall\s*=\s*[2-9]/.test(code) && !/wall_t\s*=\s*[2-9]/.test(code)) {
    dfmIssues.push('No explicit wall thickness variable found in a model using difference() — ensure minimum 1.2 mm walls for FDM');
  }

  // Overhang check
  if (/rotate\s*\(\s*\[\s*[6-9]\d/.test(code)) {
    dfmIssues.push('Large rotation detected — verify overhangs are < 45° or add support structures');
  }

  // No assembly module
  if (!/module\s+assembly\s*\(/.test(code)) {
    warnings.push('No assembly() module — parts may not be positioned relative to each other');
  }

  // Missing primitives in a module
  const moduleNames = [...code.matchAll(/module\s+(\w+)\s*\(/g)].map(x => x[1]);
  for (const name of moduleNames) {
    const bodyMatch = code.match(new RegExp(`module\\s+${name}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)(?=\\nmodule |$)`));
    const body = bodyMatch?.[1] ?? '';
    if (body && !/cube|cylinder|sphere|linear_extrude|rotate_extrude|polyhedron|import/.test(body)) {
      warnings.push(`Module "${name}" contains no geometry — may produce an empty part`);
    }
  }

  const score = dfmIssues.length > 0 || warnings.filter(w => w.includes('lost') || w.includes('exceeds')).length > 0
    ? 'warn' : 'pass';

  return { warnings, dfmIssues, score };
}