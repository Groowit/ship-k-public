export const allowedUploadImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const maxUploadImageBytes = 5 * 1024 * 1024;

export async function validateUploadImageFile(file: File) {
  if (!allowedUploadImageTypes.has(file.type)) {
    return "Unsupported image type";
  }

  if (file.size > maxUploadImageBytes) {
    return "Image must be 5MB or smaller";
  }

  if (!(await fileBytesMatchDeclaredImageType(file))) {
    return "Image bytes do not match the declared file type";
  }

  return null;
}

export function getUploadImageExtension(file: File) {
  if (file.type === "image/jpeg") {
    return "jpg";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "png";
}

async function fileBytesMatchDeclaredImageType(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer()).slice(0, 16);

  if (file.type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (file.type === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (file.type === "image/webp") {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  return false;
}
