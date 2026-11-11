import { copyFile, mkdir } from "node:fs/promises";

await mkdir(new URL("../dist/demo/", import.meta.url), { recursive: true });
await copyFile(new URL("../demo/index.html", import.meta.url), new URL("../dist/demo/index.html", import.meta.url));
