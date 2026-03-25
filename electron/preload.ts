import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },
  formData: {
    getPersonalInfo: () => ipcRenderer.invoke('form:getPersonalInfo'),
    savePersonalInfo: (data: Record<string, unknown>) => ipcRenderer.invoke('form:savePersonalInfo', data),
    getMilitaryService: () => ipcRenderer.invoke('form:getMilitaryService'),
    saveMilitaryService: (data: Record<string, unknown>) => ipcRenderer.invoke('form:saveMilitaryService', data),
    getVaDisabilityInfo: () => ipcRenderer.invoke('form:getVaDisabilityInfo'),
    saveVaDisabilityInfo: (data: Record<string, unknown>) => ipcRenderer.invoke('form:saveVaDisabilityInfo', data),
    getDisabilityClaims: () => ipcRenderer.invoke('form:getDisabilityClaims'),
    createDisabilityClaim: (data: Record<string, unknown>) => ipcRenderer.invoke('form:createDisabilityClaim', data),
    updateDisabilityClaim: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('form:updateDisabilityClaim', id, data),
    deleteDisabilityClaim: (id: string) => ipcRenderer.invoke('form:deleteDisabilityClaim', id),
    getSecondaryConditions: (claimId: string) => ipcRenderer.invoke('form:getSecondaryConditions', claimId),
    createSecondaryCondition: (data: Record<string, unknown>) => ipcRenderer.invoke('form:createSecondaryCondition', data),
    deleteSecondaryCondition: (id: string) => ipcRenderer.invoke('form:deleteSecondaryCondition', id),
    getDocuments: () => ipcRenderer.invoke('form:getDocuments'),
    createDocument: (data: Record<string, unknown>) => ipcRenderer.invoke('form:createDocument', data),
    deleteDocument: (id: string) => ipcRenderer.invoke('form:deleteDocument', id),
    getPacketStatus: () => ipcRenderer.invoke('form:getPacketStatus'),
    updatePacketStep: (stepName: string, status: string) => ipcRenderer.invoke('form:updatePacketStep', stepName, status),
    resetPacketStatus: () => ipcRenderer.invoke('form:resetPacketStatus'),
  },
  chat: {
    send: (message: string, history: Array<{ role: string; content: string }>) =>
      ipcRenderer.invoke('chat:send', message, history),
    onStreamChunk: (callback: (text: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, text: string) => callback(text)
      ipcRenderer.on('chat:stream-chunk', handler)
      return () => ipcRenderer.removeListener('chat:stream-chunk', handler)
    },
    history: () => ipcRenderer.invoke('chat:history'),
    clear: () => ipcRenderer.invoke('chat:clear'),
  },
  documents: {
    upload: (fileBase64: string, fileName: string, mimeType: string, documentType: string) =>
      ipcRenderer.invoke('documents:upload', fileBase64, fileName, mimeType, documentType),
    list: () => ipcRenderer.invoke('documents:list'),
    delete: (docId: string) => ipcRenderer.invoke('documents:delete', docId),
    extract: (fileBase64: string, mimeType: string) =>
      ipcRenderer.invoke('documents:extract', fileBase64, mimeType),
  },
  pdf: {
    generate: () => ipcRenderer.invoke('pdf:generate'),
    preview: () => ipcRenderer.invoke('pdf:preview'),
    openFolder: (path: string) => ipcRenderer.invoke('pdf:openFolder', path),
  },
})
