import { config as loadDotenv } from 'dotenv';
import { resolveBackendEnvFilePaths } from './backend-env';

const backendEnvFile = resolveBackendEnvFilePaths()[0];

if (backendEnvFile) {
  loadDotenv({ path: backendEnvFile });
}
