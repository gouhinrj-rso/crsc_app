import { ipcMain, shell } from 'electron'
import { generateDD2860, assemblePackage } from '../services/pdfGenerator'

export function registerPdfHandlers(): void {
  ipcMain.handle('pdf:generate', async () => {
    return await assemblePackage()
  })

  ipcMain.handle('pdf:preview', async () => {
    const pdfBytes = await generateDD2860()
    return Buffer.from(pdfBytes).toString('base64')
  })

  ipcMain.handle('pdf:openFolder', async (_event, folderPath: string) => {
    await shell.openPath(folderPath)
  })
}
