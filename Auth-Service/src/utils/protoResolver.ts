import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveProtoPath(protoName: string): string {
  const candidatePaths = [
    path.join(__dirname, '../protos', protoName),
    path.join(__dirname, '../../src/protos', protoName),
    path.join(process.cwd(), 'dist/protos', protoName),
    path.join(process.cwd(), 'src/protos', protoName),
    path.join(process.cwd(), 'protos', protoName),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return path.join(process.cwd(), 'src/protos', protoName);
}
