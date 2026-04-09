import { existsSync } from 'fs';
import { chromium, type Page } from 'playwright-core';

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseEnvNumber = (rawValue: string | undefined, fallback: number) => {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const CERTIFICATE_PDF_RENDER_SCALE = clampNumber(
  parseEnvNumber(process.env.CERTIFICATE_PDF_RENDER_SCALE, 2),
  1,
  4,
);
const CERTIFICATE_VIEWPORT = {
  width: 1123,
  height: 794,
};

const resolveBrowserExecutablePath = () => {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => existsSync(candidate)) || undefined;
};

const waitForCertificateAssets = async (page: Page) => {
  await page.evaluate(async () => {
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    } catch {}

    const images = Array.from(document.images || []);
    await Promise.all(images.map(async (image) => {
      if (!image.complete || image.naturalWidth === 0) {
        await new Promise<void>((resolve) => {
          const finish = () => resolve();
          image.addEventListener('load', finish, { once: true });
          image.addEventListener('error', finish, { once: true });
          window.setTimeout(finish, 5000);
        });
      }

      if (typeof image.decode === 'function') {
        await image.decode().catch(() => undefined);
      }
    }));

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
};

const waitForSingleImage = async (page: Page, selector: string) => {
  await page.waitForFunction((targetSelector) => {
    const image = document.querySelector(targetSelector);
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  }, selector);

  await page.evaluate(async (targetSelector) => {
    const image = document.querySelector(targetSelector);
    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    if (typeof image.decode === 'function') {
      await image.decode().catch(() => undefined);
    }
  }, selector);
};

const pngBufferToDataUrl = (buffer: Buffer) => `data:image/png;base64,${buffer.toString('base64')}`;

const buildImageOnlyPdfMarkup = (imageDataUrl: string) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      @page {
        size: 297mm 210mm;
        margin: 0;
      }

      html,
      body {
        width: 297mm;
        height: 210mm;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #ffffff;
      }

      body {
        display: flex;
      }

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: fill;
        object-position: center;
      }
    </style>
  </head>
  <body>
    <img id="certificate-raster-image" src="${imageDataUrl}" alt="Certificate rasterized preview" />
  </body>
</html>
`;

async function renderCertificatePdfToFile(pageUrl: string, outputPath: string) {
  const browser = await chromium.launch({
    executablePath: resolveBrowserExecutablePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage({
    viewport: CERTIFICATE_VIEWPORT,
    deviceScaleFactor: CERTIFICATE_PDF_RENDER_SCALE,
  });

  try {
    await page.emulateMedia({ media: 'screen' });
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    const renderer = page.locator('[data-testid="official-certificate-renderer"]');
    await renderer.waitFor({ timeout: 15000 });
    await waitForCertificateAssets(page);
    await page.addStyleTag({
      content: `
        @page {
          size: 297mm 210mm;
          margin: 0;
        }

        html,
        body,
        #root {
          width: 297mm;
          height: 210mm;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: white;
        }
      `,
    });
    await page.addStyleTag({
      content: `
        [data-testid="official-certificate-renderer"] {
          margin: 0 !important;
          box-shadow: none !important;
        }
      `,
    });

    const screenshotBuffer = await renderer.screenshot({
      type: 'png',
    });

    await page.setContent(buildImageOnlyPdfMarkup(pngBufferToDataUrl(screenshotBuffer)), {
      waitUntil: 'load',
    });
    await waitForSingleImage(page, '#certificate-raster-image');

    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      pageRanges: '1',
    });
  } finally {
    await page.close();
    await browser.close();
  }
}

if (require.main === module) {
  const [pageUrl, outputPath] = process.argv.slice(2);

  if (!pageUrl || !outputPath) {
    console.error('Usage: node certificate-pdf-renderer.js <pageUrl> <outputPath>');
    process.exit(1);
  }

  renderCertificatePdfToFile(pageUrl, outputPath)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
