import { ipcMain, BrowserWindow } from 'electron'
import { getDb } from '../db/database'
import { streamChat } from '../services/claude'
import crypto from 'crypto'

export function registerChatHandlers(): void {
  // chat:send - start streaming chat, chunks sent via webContents.send
  ipcMain.handle(
    'chat:send',
    async (event, message: string, history: Array<{ role: string; content: string }>) => {
      const db = getDb()
      const win = BrowserWindow.fromWebContents(event.sender)

      // Save user message to DB
      const userMsgId = crypto.randomUUID()
      db.prepare('INSERT INTO chat_history (id, message, role) VALUES (?, ?, ?)').run(
        userMsgId,
        message,
        'user'
      )

      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        streamChat(message, history, {
          onChunk: (text) => {
            win?.webContents.send('chat:stream-chunk', text)
          },
          onComplete: (fullText) => {
            // Save assistant response to DB
            const assistantMsgId = crypto.randomUUID()
            db.prepare('INSERT INTO chat_history (id, message, role) VALUES (?, ?, ?)').run(
              assistantMsgId,
              fullText,
              'assistant'
            )
            resolve({ success: true })
          },
          onError: (error) => {
            resolve({ success: false, error })
          },
        })
      })
    }
  )

  // chat:history - load all chat messages
  ipcMain.handle('chat:history', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM chat_history ORDER BY created_at ASC').all()
  })

  // chat:clear - delete all chat messages
  ipcMain.handle('chat:clear', () => {
    const db = getDb()
    db.prepare('DELETE FROM chat_history').run()
  })
}
