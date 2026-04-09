import { existsSync } from 'fs';
import { basename, resolve } from 'path';

const uniquePaths = (paths: string[]) => Array.from(new Set(paths.filter(Boolean)));

export const resolveBackendEnvFilePaths = () => {
  const cwd = process.cwd();
  const candidates = [
    basename(cwd).toLowerCase() === 'backend' ? resolve(cwd, '.env') : '',
    basename(cwd).toLowerCase() === 'backend' ? '' : resolve(cwd, 'backend', '.env'),
    resolve(__dirname, '..', '..', '.env'),
    resolve(__dirname, '..', '..', '..', 'backend', '.env'),
  ];

  return uniquePaths(candidates).filter((filePath) => existsSync(filePath));
};
