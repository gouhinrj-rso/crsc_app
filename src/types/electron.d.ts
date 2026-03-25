interface ElectronAPI {
  // Will be populated as IPC methods are added
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
