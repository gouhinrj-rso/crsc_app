import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main(): Promise<void> {
  const pdfPath = path.resolve(__dirname, '..', 'resources', 'CRSC_REFERENCE.pdf')
  const outputPath = path.resolve(__dirname, '..', 'resources', 'crsc_reference_text.txt')

  if (!fs.existsSync(pdfPath)) {
    console.error('CRSC_REFERENCE.pdf not found at', pdfPath)
    process.exit(1)
  }

  try {
    // pdf-parse can be finicky with some PDFs, so we wrap in try/catch
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = (pdfParseModule as Record<string, unknown>).PDFParse ??
      pdfParseModule.default ??
      pdfParseModule
    const dataBuffer = fs.readFileSync(pdfPath)
    const data = await (pdfParse as (buf: Buffer) => Promise<{ text: string; numpages: number }>)(dataBuffer)

    fs.writeFileSync(outputPath, data.text, 'utf-8')
    console.log(`Extracted ${data.numpages} pages of text to ${outputPath}`)
    console.log(`Output size: ${data.text.length} characters`)
  } catch (err) {
    console.warn('pdf-parse failed, writing placeholder:', (err as Error).message)
    fs.writeFileSync(
      outputPath,
      'Reference text extraction not available. See CRSC_REFERENCE.pdf.',
      'utf-8'
    )
    console.log(`Placeholder written to ${outputPath}`)
  }
}

main()
