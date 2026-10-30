// Is this module the script node was asked to run? Compares real paths, so it still holds when
// the skill is installed as a symlink (node resolves the module's path, not argv[1]).
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function isMain(importMetaUrl) {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(importMetaUrl));
  } catch {
    return false;
  }
}
