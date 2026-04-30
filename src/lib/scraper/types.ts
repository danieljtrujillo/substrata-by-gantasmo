// Common types for the 3D-asset / blueprint scraper subsystem.
// All adapters speak this contract so the ingestion pipeline is source-agnostic.

export type SpdxLicense =
  | 'CC0-1.0'
  | 'CC-BY-4.0'
  | 'CC-BY-SA-4.0'
  | 'CC-BY-NC-4.0'
  | 'CC-BY-ND-4.0'
  | 'PD'                // public domain (US gov works, LOC, etc.)
  | 'GPL-3.0'
  | 'MIT'
  | 'Apache-2.0'
  | 'unknown';

export type AssetKind = '3d_model' | 'blueprint' | 'floor_plan' | 'photograph' | 'other';

export type FileFormat = 'stl' | 'glb' | 'gltf' | 'obj' | 'step' | 'svg' | 'dxf' | 'jpg' | 'png' | 'tiff' | 'pdf' | 'ifc';

/** A search-result hit — lightweight metadata, no buffer yet. */
export interface AssetHit {
  source: string;            // adapter id, e.g. 'smithsonian', 'loc-habs'
  sourceId: string;          // adapter-internal id
  title: string;
  description?: string;
  author?: string;
  kind: AssetKind;
  format: FileFormat;
  thumbnailUrl?: string;
  sourceUrl: string;         // landing page on the source site
  downloadUrl: string;       // direct file URL
  licenseSPDX: SpdxLicense;
  attributionString: string; // pre-formatted credit line
  tags: string[];
  approxSizeBytes?: number;
  // Source-specific extras pass through here.
  extras?: Record<string, unknown>;
}

export interface SearchFilters {
  query: string;
  kind?: AssetKind;
  formats?: FileFormat[];
  /** SPDX whitelist. Default: only permissive (CC0, CC-BY, PD, MIT, Apache-2.0). */
  allowedLicenses?: SpdxLicense[];
  limit?: number;
  /** Adapter-specific opaque cursor. */
  cursor?: string;
}

export interface FetchedAsset {
  hit: AssetHit;
  buffer: ArrayBuffer;
  /** SHA-256 hex digest of buffer — used for caching/deduplication. */
  sha256: string;
  fetchedAt: string;         // ISO timestamp
  /** True if the SPDX license was confirmed from a machine-readable source field
   *  (vs. inferred from the collection's overall policy). */
  licenseProof: 'verified' | 'collection-default' | 'inferred';
}

export interface ScraperAdapter {
  id: string;
  displayName: string;
  /** SPDX license that the entire collection is published under, if any. */
  defaultLicense?: SpdxLicense;
  search(filters: SearchFilters): Promise<AssetHit[]>;
  fetchAsset(hit: AssetHit): Promise<FetchedAsset>;
}

export const PERMISSIVE_LICENSES: SpdxLicense[] = [
  'CC0-1.0', 'CC-BY-4.0', 'PD', 'MIT', 'Apache-2.0',
];

export function isPermissive(lic: SpdxLicense): boolean {
  return PERMISSIVE_LICENSES.includes(lic);
}