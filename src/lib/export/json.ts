import type { ExportPackage } from "../schemas/export-package";

/** Serializes an evidence package to pretty-printed, versioned JSON. */
export function exportPackageToJson(pkg: ExportPackage): string {
  return JSON.stringify(pkg, null, 2);
}
