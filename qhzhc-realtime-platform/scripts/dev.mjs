import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const commands = [
  { name: "server", args: ["run", "dev:server"] },
  { name: "web", args: ["run", "dev:web"] },
];

const children = commands.map(({ name, args }) => {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  child.on("error", (error) => {
    console.error(`[dev:${name}] 启动失败：`, error);
  });
  return { name, child };
});

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const { child } of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 250).unref();
}

for (const { name, child } of children) {
  child.on("exit", (code, signal) => {
    if (stopping) return;
    if (code !== 0) {
      console.error(
        `[dev:${name}] 已异常退出（${signal ? `signal=${signal}` : `code=${code}`}），正在停止另一进程。`,
      );
    }
    stop(code ?? (signal ? 1 : 0));
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
