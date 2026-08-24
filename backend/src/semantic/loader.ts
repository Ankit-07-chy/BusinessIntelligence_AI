import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import yaml from "js-yaml";

const SEMANTIC_ROOT = path.resolve(fileURLToPath(new URL("../../../semantic", import.meta.url)));

export function loadSemanticYaml<T>(relativePath: string): T {
  const fullPath = path.join(SEMANTIC_ROOT, relativePath);
  const raw = readFileSync(fullPath, "utf-8");
  return yaml.load(raw) as T;
}
