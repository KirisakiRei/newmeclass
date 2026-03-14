import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { API_BASE, getRepoRoot, saveReport } from './shared.mjs';

const repoRoot = getRepoRoot();
const frontendRoot = path.join(repoRoot, 'frontend');
const frontendApiWrapperPath = path.join(frontendRoot, 'services', 'api.ts');
const FRONTEND_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs']);

function walkFiles(dir, entries = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.name === 'node_modules' || item.name === 'dist' || item.name === '.git') continue;
    const absolutePath = path.join(dir, item.name);
    if (item.isDirectory()) {
      walkFiles(absolutePath, entries);
      continue;
    }
    if (FRONTEND_EXTENSIONS.has(path.extname(item.name))) {
      entries.push(absolutePath);
    }
  }
  return entries;
}

function normalizeRoute(rawRoute) {
  if (!rawRoute) return null;
  let route = String(rawRoute).trim();
  if (!route) return null;

  if (route.includes('/api/')) {
    route = route.slice(route.indexOf('/api/'));
  } else if (route.startsWith('/')) {
    route = `/api${route}`;
  } else {
    return null;
  }

  route = route.split('?')[0];
  route = route.replace(/\$\{[^}]+\}/g, ':param');
  route = route.replace(/\{[^}]+\}/g, ':param');
  route = route.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ':param');
  route = route.replace(/\/+/g, '/');
  if (route.length > 1) route = route.replace(/\/$/, '');
  return route;
}

function routePattern(normalizedRoute) {
  const escaped = normalizedRoute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/:param/g, '[^/]+')}$`);
}

function extractWrapperRoutes(sourceText) {
  const matches = [];
  const patterns = [
    /apiClient\.(?:get|post|put|delete)\(\s*([`'"])(.*?)\1/g,
    /url:\s*([`'"])(.*?)\1/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(sourceText)) !== null) {
      matches.push(match[2]);
    }
  }

  return matches;
}

function extractDirectApiRoutes(filePath, sourceText) {
  const matches = [];
  const apiLiteralPattern = /\/api\/[^`"'\s)>,]+/g;
  let match;
  while ((match = apiLiteralPattern.exec(sourceText)) !== null) {
    matches.push({
      file: path.relative(repoRoot, filePath),
      rawRoute: match[0],
    });
  }
  return matches;
}

function uniqueByRoute(entries) {
  const map = new Map();
  for (const entry of entries) {
    const normalizedRoute = normalizeRoute(entry.rawRoute || entry.route);
    if (!normalizedRoute) continue;
    const existing = map.get(normalizedRoute) || { route: normalizedRoute, sources: [] };
    if (entry.file && !existing.sources.includes(entry.file)) {
      existing.sources.push(entry.file);
    }
    map.set(normalizedRoute, existing);
  }
  return [...map.values()].sort((a, b) => a.route.localeCompare(b.route));
}

async function main() {
  const docsResponse = await fetch(`${API_BASE}/docs-json`);
  if (!docsResponse.ok) {
    throw new Error(`Gagal mengambil Swagger JSON dari ${API_BASE}/docs-json`);
  }
  const docs = await docsResponse.json();

  const backendRoutes = Object.keys(docs.paths || {})
    .map((route) => normalizeRoute(route))
    .filter(Boolean);
  const backendUniqueRoutes = [...new Set(backendRoutes)].sort((a, b) => a.localeCompare(b));
  const backendPatterns = backendUniqueRoutes.map((route) => ({ route, regex: routePattern(route) }));

  const wrapperSource = fs.readFileSync(frontendApiWrapperPath, 'utf8');
  const wrapperRoutes = uniqueByRoute(
    extractWrapperRoutes(wrapperSource).map((route) => ({
      route,
      file: path.relative(repoRoot, frontendApiWrapperPath),
    })),
  );

  const frontendFiles = walkFiles(frontendRoot);
  const directRoutes = uniqueByRoute(
    frontendFiles.flatMap((filePath) => {
      const text = fs.readFileSync(filePath, 'utf8');
      return extractDirectApiRoutes(filePath, text);
    }),
  ).filter((entry) => !entry.sources.includes(path.relative(repoRoot, frontendApiWrapperPath)));

  const usedRoutes = uniqueByRoute([
    ...wrapperRoutes.map((entry) => ({ route: entry.route, file: entry.sources[0] })),
    ...directRoutes.flatMap((entry) => entry.sources.map((file) => ({ route: entry.route, file }))),
  ]);

  const matchedRoutes = [];
  const mismatchedRoutes = [];

  for (const routeEntry of usedRoutes) {
    const matchedBackend = backendPatterns.find((item) => item.regex.test(routeEntry.route));
    if (matchedBackend) {
      matchedRoutes.push({ ...routeEntry, backendRoute: matchedBackend.route });
    } else {
      mismatchedRoutes.push(routeEntry);
    }
  }

  const unusedBackendRoutes = backendUniqueRoutes.filter((backendRoute) => {
    const regex = routePattern(backendRoute);
    return !usedRoutes.some((routeEntry) => regex.test(routeEntry.route));
  });

  const report = {
    generatedAt: new Date().toISOString(),
    swaggerSource: `${API_BASE}/docs-json`,
    summary: {
      backendRouteCount: backendUniqueRoutes.length,
      wrapperRouteCount: wrapperRoutes.length,
      directFrontendRouteCount: directRoutes.length,
      usedFrontendRouteCount: usedRoutes.length,
      matchedRouteCount: matchedRoutes.length,
      mismatchedRouteCount: mismatchedRoutes.length,
      unusedBackendRouteCount: unusedBackendRoutes.length,
    },
    wrapperRoutes,
    directFrontendRoutes: directRoutes,
    matchedRoutes,
    mismatchedRoutes,
    unusedBackendRoutes,
  };

  const outputPath = saveReport('endpoint-audit-report.json', report);
  console.log(JSON.stringify({ outputPath, report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
