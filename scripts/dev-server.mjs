import { execFileSync, spawn } from "node:child_process";

const DEV_PORT = "3000";
const PORT_FLAG_NAMES = new Set(["-p", "--port"]);

const forwardedArgs = removePortArgs(process.argv.slice(2));
await closePort(DEV_PORT);

const child = spawn(
  "pnpm",
  ["exec", "next", "dev", "--port", DEV_PORT, ...forwardedArgs],
  {
    env: {
      ...process.env,
      PORT: DEV_PORT,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${DEV_PORT}`
    },
    stdio: "inherit"
  }
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

async function closePort(port) {
  const pids = getListeningPids(port);
  if (pids.length === 0) {
    return;
  }

  console.log(`Closing existing dev server on port ${port}: ${pids.join(", ")}`);
  pids.forEach((pid) => {
    try {
      process.kill(Number(pid), "SIGTERM");
    } catch {
      // The process may have already exited between lsof and kill.
    }
  });

  await waitForPortToClose(port, 3_000);

  getListeningPids(port).forEach((pid) => {
    try {
      process.kill(Number(pid), "SIGKILL");
    } catch {
      // The process may have already exited after the last port check.
    }
  });
}

function getListeningPids(port) {
  try {
    return execFileSync("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    })
      .split(/\r?\n/)
      .map((pid) => pid.trim())
      .filter(Boolean)
      .filter((pid, index, pids) => pids.indexOf(pid) === index);
  } catch {
    return [];
  }
}

async function waitForPortToClose(port, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (getListeningPids(port).length === 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

function removePortArgs(args) {
  const sanitized = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (PORT_FLAG_NAMES.has(arg)) {
      index += 1;
      continue;
    }

    if (arg.startsWith("--port=") || arg.startsWith("-p=")) {
      continue;
    }

    sanitized.push(arg);
  }

  return sanitized;
}
