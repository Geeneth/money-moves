/** Injected by the Electron preload script. Undefined when running in a browser. */
interface ElectronAPI {
  openExternal: (url: string) => Promise<void>;
  openPath: (filePath: string) => Promise<string>;
  getDbPath: () => Promise<string>;
  openDrizzleStudio: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
