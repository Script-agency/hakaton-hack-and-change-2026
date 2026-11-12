import { cp } from "node:fs/promises";

await cp(new URL("../demo/", import.meta.url), new URL("../dist/demo/", import.meta.url), { recursive: true });
