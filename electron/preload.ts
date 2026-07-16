import { contextBridge, ipcRenderer } from "electron";

const electronAPI = {
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("open-external", url) as Promise<void>,
  openPath: (filePath: string): Promise<string> =>
    ipcRenderer.invoke("open-path", filePath) as Promise<string>,
  getDbPath: (): Promise<string> =>
    ipcRenderer.invoke("get-db-path") as Promise<string>,
  openDrizzleStudio: (): Promise<void> =>
    ipcRenderer.invoke("open-drizzle-studio") as Promise<void>,
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
