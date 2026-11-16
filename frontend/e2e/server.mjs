import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const files = new Map([
  ["/fixture.html", [new URL("./fixture.html", import.meta.url), "text/html; charset=utf-8"]],
  ["/widget.js", [new URL("../dist/widget.js", import.meta.url), "text/javascript; charset=utf-8"]],
]);

const server = createServer(async (request, response) => {
  const file = files.get(new URL(request.url, "http://127.0.0.1").pathname);
  if (file === undefined) {
    response.writeHead(404).end("Not found");
    return;
  }
  try {
    const content = await readFile(file[0]);
    response.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-store" }).end(content);
  } catch {
    response.writeHead(500).end("Run pnpm build before browser tests");
  }
});
server.listen(4175, "127.0.0.1");
