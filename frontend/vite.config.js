import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'vite-plugin-compression2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const enableCompressedAssets = String(env.GENERATE_COMPRESSED_ASSETS || 'true').toLowerCase() !== 'false';

  const plugins = [
    // Treat .js files that contain JSX as jsx
    {
      name: 'treat-js-as-jsx',
      async transform(code, id) {
        if (!id.match(/\.js$/)) return null;
        return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
      },
    },
    react(),
  ];

  if (enableCompressedAssets) {
    plugins.push(
      // Generate .gz and .br files alongside JS/CSS assets for VPS serving
      compression({
        algorithms: ['gzip', 'brotliCompress'],
        exclude: [/\.(png|jpg|webp|svg|ico)$/],
      }),
    );
  }

  return {
    plugins,
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      // Bridge CRA-style process.env to Vite
      'process.env.REACT_APP_BACKEND_URL': JSON.stringify(env.REACT_APP_BACKEND_URL || ''),
      'process.env.REACT_APP_MIDTRANS_CLIENT_KEY': JSON.stringify(env.REACT_APP_MIDTRANS_CLIENT_KEY || ''),
      'process.env.REACT_APP_MIDTRANS_IS_PRODUCTION': JSON.stringify(env.REACT_APP_MIDTRANS_IS_PRODUCTION || ''),
    },
    build: {
      minify: 'esbuild',
      target: 'es2018',
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React runtime — cached across all pages
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Heavy chart lib — only used in admin analytics
            'vendor-charts': ['recharts'],
            // Rich-text editor — only used in admin articles
            'vendor-editor': [
              '@tiptap/react',
              '@tiptap/starter-kit',
              '@tiptap/extension-image',
              '@tiptap/extension-link',
              '@tiptap/extension-placeholder',
              '@tiptap/extension-text-align',
              '@tiptap/extension-underline',
            ],
            // Drag-and-drop — only used in admin media gallery
            'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            // Radix UI primitives used across many pages
            'vendor-radix': [
              '@radix-ui/react-avatar',
              '@radix-ui/react-dialog',
              '@radix-ui/react-label',
              '@radix-ui/react-select',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
              '@radix-ui/react-toast',
            ],
          },
        },
      },
    },
  };
});
