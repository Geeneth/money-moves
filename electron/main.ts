import { app, BrowserWindow, ipcMain, shell } from "electron";
import { spawn, type ChildProcess } from "child_process";
import { createServer as createTcpServer, createConnection } from "net";
import fs from "fs";
import path from "path";

const isDev = !app.isPackaged;

let nextProcess: ChildProcess | null = null;
let studioProcess: ChildProcess | null = null;

const STUDIO_PORT = 4983;
const STUDIO_URL = "https://local.drizzle.studio";

function getDbPath(): string {
  return isDev
    ? path.join(app.getAppPath(), "data", "budget.db")
    : path.join(app.getPath("userData"), "budget.db");
}

function getAppDir(): string {
  return isDev
    ? app.getAppPath()
    : path.join(process.resourcesPath, "standalone");
}

/**
 * Locate a system Node.js binary. We intentionally run Next.js in a separate
 * child process rather than via Electron's utilityProcess so that native
 * modules (better-sqlite3) use the system Node ABI — no electron-rebuild needed.
 */
function findNodeBinary(): string {
  const candidates = [
    process.env.NODE_BINARY,           // explicit override
    "/opt/homebrew/bin/node",          // Apple Silicon Homebrew
    "/usr/local/bin/node",             // Intel Homebrew / nvm default
    "/usr/bin/node",                   // system package managers
    "/opt/local/bin/node",             // MacPorts
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  throw new Error(
    "Could not find a Node.js binary. Set the NODE_BINARY environment variable or ensure node is in a standard location."
  );
}

/** Find the next available TCP port starting from `start`. */
async function findFreePort(start = 3000): Promise<number> {
  return new Promise((resolve) => {
    const s = createTcpServer();
    s.on("error", () => void findFreePort(start + 1).then(resolve));
    s.listen(start, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
  });
}

/** Poll TCP until the server is accepting connections. */
async function waitForServer(port: number, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const open = await new Promise<boolean>((resolve) => {
      const conn = createConnection({ port, host: "127.0.0.1" });
      conn.once("connect", () => { conn.destroy(); resolve(true); });
      conn.once("error", () => resolve(false));
    });
    if (open) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Timed out waiting for Next.js server to start.");
}

async function startNextServer(port: number): Promise<void> {
  const appDir = getAppDir();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_PATH: getDbPath(),
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NODE_ENV: isDev ? "development" : "production",
  };

  if (isDev) {
    // Spawn next dev using the system npm — next.js + better-sqlite3 both run
    // under system Node, so no Electron ABI rebuild is required.
    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
    nextProcess = spawn(npmCmd, ["run", "dev", "--", "-p", String(port)], {
      cwd: appDir,
      env,
      stdio: "pipe",
    });
  } else {
    // Production: run the standalone server.js with system Node for the same
    // reason — keeps better-sqlite3 on the system Node ABI.
    const node = findNodeBinary();
    const serverScript = path.join(appDir, "server.js");
    nextProcess = spawn(node, [serverScript], {
      cwd: appDir,
      env,
      stdio: "pipe",
    });
    nextProcess.on("error", (err) =>
      console.error("Next.js server error:", err.message)
    );
  }
}

let port = 3000;

async function createWindow(): Promise<void> {
  port = await findFreePort(3000);
  await startNextServer(port);
  await waitForServer(port);

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // All target=_blank links open in the system browser, not a new Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  await win.loadURL(`http://127.0.0.1:${port}`);
}

/** Check if a port is already in use (i.e. something is already listening). */
async function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const conn = createConnection({ port, host: "127.0.0.1" });
    conn.once("connect", () => { conn.destroy(); resolve(true); });
    conn.once("error", () => resolve(false));
  });
}

async function startDrizzleStudio(): Promise<void> {
  // If already running, just open the URL.
  if (await isPortOpen(STUDIO_PORT)) {
    await shell.openExternal(STUDIO_URL);
    return;
  }

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  studioProcess = spawn(npmCmd, ["run", "db:studio"], {
    cwd: getAppDir(),
    env: { ...process.env, DATABASE_PATH: getDbPath() },
    stdio: "pipe",
  });

  // Wait up to 15 s for drizzle-kit studio to bind to its port.
  await waitForServer(STUDIO_PORT, 15_000);
  await shell.openExternal(STUDIO_URL);
}

// IPC handlers exposed to the renderer via preload.
ipcMain.handle("open-external", (_event, url: string) =>
  shell.openExternal(url)
);
ipcMain.handle("open-path", (_event, filePath: string) =>
  shell.openPath(filePath)
);
ipcMain.handle("get-db-path", () => getDbPath());
ipcMain.handle("open-drizzle-studio", () => startDrizzleStudio());

app.whenReady().then(() => {
  void createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  nextProcess?.kill();
  studioProcess?.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  nextProcess?.kill();
  studioProcess?.kill();
});
