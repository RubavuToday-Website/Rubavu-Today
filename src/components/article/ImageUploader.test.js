import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_POST,
  REQUIRED_IMAGE_WIDTH,
  REQUIRED_IMAGE_HEIGHT,
  RESIZE_IMAGE_URL,
  COMPRESS_IMAGE_URL,
  detectImageFormat,
  validateImageFile,
} from "./ImageUploader";

const bytes = (values) => Uint8Array.from(values);

test("constants match the publishing requirements", () => {
  expect(MAX_IMAGES_PER_POST).toBe(2);
  expect(MAX_IMAGE_SIZE_BYTES).toBe(120 * 1024);
  expect(REQUIRED_IMAGE_WIDTH).toBe(1200);
  expect(REQUIRED_IMAGE_HEIGHT).toBe(630);
  expect(RESIZE_IMAGE_URL).toBe("https://imresizer.com/resize-image-to-1200x630");
  expect(COMPRESS_IMAGE_URL).toBe("https://imresizer.com/resize-image-to-120kb");
});

test("detects supported formats from their content signatures", () => {
  expect(detectImageFormat(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
    "jpeg"
  );
  expect(
    detectImageFormat(
      bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    )
  ).toBe("png");
  expect(
    detectImageFormat(
      bytes([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
    )
  ).toBe("webp");
  expect(detectImageFormat(bytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]))).toBe(
    null
  );
});

test("rejects a missing file", async () => {
  expect(await validateImageFile(null)).toBeTruthy();
});

test("rejects unsupported mime types", async () => {
  const file = new File([bytes([0, 0, 0, 0])], "photo.gif", {
    type: "image/gif",
  });
  expect(await validateImageFile(file)).toMatch(/JPEG/);
});

test("rejects files larger than 120 KB and shows the compression link", async () => {
  const big = new File([new Uint8Array(130 * 1024)], "photo.png", {
    type: "image/png",
  });
  const message = await validateImageFile(big);
  expect(message).toMatch(/120 KB/);
  expect(message).toContain(COMPRESS_IMAGE_URL);
});
