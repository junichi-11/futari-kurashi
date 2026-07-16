import { findManagedSection, managedDigest } from "./managed-section.mjs";

export function diffManagedSection(existingBlocks, nextBlocks, id) {
  const current = findManagedSection(existingBlocks, id);
  if (!current.found) return { action: "add", current };
  return { action: managedDigest(current.blocks) === managedDigest(nextBlocks) ? "unchanged" : "update", current };
}
