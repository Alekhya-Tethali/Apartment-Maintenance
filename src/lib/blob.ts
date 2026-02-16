import { put as vercelPut } from "@vercel/blob";
import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".uploads");

function useLocalStorage(): boolean {
  return !process.env.BLOB_READ_WRITE_TOKEN;
}

export async function putBlob(
  pathname: string,
  data: Buffer
): Promise<{ url: string }> {
  if (useLocalStorage()) {
    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    const filePath = path.join(LOCAL_UPLOAD_DIR, pathname.replace(/\//g, "-"));
    await writeFile(filePath, data);
    return { url: `local://${filePath}` };
  }

  const blob = await vercelPut(pathname, data, {
    access: "public",
    contentType: "application/octet-stream",
  });
  return { url: blob.url };
}

export async function getBlob(url: string): Promise<Buffer> {
  if (url.startsWith("local://")) {
    const filePath = url.replace("local://", "");
    return readFile(filePath);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
