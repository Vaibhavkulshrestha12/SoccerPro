import { expect, test, type Page } from "@playwright/test";

type CanvasStats = {
  width: number;
  height: number;
  nonBlankSamples: number;
  colorRange: number;
};

async function openGame(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto("/?verify=1");
  await page.waitForFunction(
    () =>
      (window as Window & { __SOCCER_11V11_READY__?: boolean })
        .__SOCCER_11V11_READY__ === true
  );
  await page.waitForTimeout(500);
}

async function expectLiveCanvas(page: Page): Promise<void> {
  const canvas = pageCanvas(page);
  await expect(canvas).toBeVisible();
  await canvas.evaluate((element) => {
    const canvasElement = element as HTMLCanvasElement;
    const rect = canvasElement.getBoundingClientRect();
    if (rect.width < 280 || rect.height < 280) {
      throw new Error(`Canvas too small: ${rect.width}x${rect.height}`);
    }
  });
}

function pageCanvas(page: Page) {
  return page.locator("canvas");
}

async function readCanvasStats(page: Page): Promise<CanvasStats> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Canvas element missing");
    }

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const snapshot = document.createElement("canvas");
    snapshot.width = width;
    snapshot.height = height;
    const context = snapshot.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("2D snapshot context missing");
    }

    context.drawImage(canvas, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;

    let nonBlankSamples = 0;
    let min = 255;
    let max = 0;
    const stride = Math.max(4, Math.floor(pixels.length / 14_000 / 4) * 4);

    for (let i = 0; i < pixels.length; i += stride) {
      const red = pixels[i] ?? 0;
      const green = pixels[i + 1] ?? 0;
      const blue = pixels[i + 2] ?? 0;
      const alpha = pixels[i + 3] ?? 0;
      const value = Math.max(red, green, blue);

      if (alpha > 0 && value > 8) {
        nonBlankSamples += 1;
      }

      min = Math.min(min, red, green, blue);
      max = Math.max(max, red, green, blue);
    }

    return {
      width,
      height,
      nonBlankSamples,
      colorRange: max - min
    };
  });
}

test("desktop canvas renders a nonblank 3D match", async ({ page }) => {
  await openGame(page, 1366, 768);
  await expectLiveCanvas(page);
  await expect(page.locator(".scoreboard")).toBeVisible();

  const stats = await readCanvasStats(page);
  expect(stats.width).toBeGreaterThan(1000);
  expect(stats.height).toBeGreaterThan(600);
  expect(stats.nonBlankSamples).toBeGreaterThan(5000);
  expect(stats.colorRange).toBeGreaterThan(45);
});

test("mobile canvas stays framed and nonblank", async ({ page }) => {
  await openGame(page, 390, 844);
  await expectLiveCanvas(page);
  await expect(page.locator(".status-panel")).toBeVisible();

  const stats = await readCanvasStats(page);
  expect(stats.width).toBeGreaterThan(340);
  expect(stats.height).toBeGreaterThan(700);
  expect(stats.nonBlankSamples).toBeGreaterThan(5000);
  expect(stats.colorRange).toBeGreaterThan(45);
});
