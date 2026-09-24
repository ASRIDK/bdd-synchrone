// Starts Next.js on a free port, so the platform never collides with another local project.
//   npm run dev     -> next dev   on 3120, or the next free port up to 3139
//   npm run start   -> next start on the same rule
//   PORT=4000 npm run dev   forces a port
import net from "node:net";
import { spawn } from "node:child_process";

const mode = process.argv[2] === "start" ? "start" : "dev";
const first = Number(process.env.PORT ?? 3120);
const forced = Boolean(process.env.PORT);

function isFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "0.0.0.0");
  });
}

let port = first;
if (!forced) {
  while (port < first + 20 && !(await isFree(port))) port++;
}
if (!(await isFree(port))) {
  console.error(`Port ${port} is taken. Set another one, for example: PORT=4000 npm run ${mode}`);
  process.exit(1);
}
if (port !== first) console.log(`Port ${first} is taken, using ${port}.`);
console.log(`\n  Knowledge Warranty: http://localhost:${port}\n`);

const child = spawn("next", [mode, "-p", String(port)], { stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
