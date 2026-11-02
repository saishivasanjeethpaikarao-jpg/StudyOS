import { ValidationError } from "@open-sunsama/utils";

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedPdfResult {
  text: string;
  pages: ExtractedPdfPage[];
  totalPages: number;
}

/**
 * Extracts selectable text and page markers from a PDF Buffer using pdf-parse v2.
 * Detects scanned/unparseable documents gracefully.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractedPdfResult> {
  if (!buffer || buffer.length === 0) {
    throw new ValidationError("PDF file buffer is empty");
  }

  // Lazy-load PDFParse to keep cold startup fast
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfModule = require("pdf-parse");
  const PDFParse = pdfModule.PDFParse;

  if (!PDFParse) {
    throw new Error("PDFParse class not found in pdf-parse module");
  }

  let parser: InstanceType<typeof PDFParse>;
  try {
    parser = new PDFParse({ data: buffer });
    await parser.load();
  } catch (err) {
    throw new ValidationError(
      `Failed to parse PDF document: ${err instanceof Error ? err.message : "Invalid or encrypted PDF"}`
    );
  }

  const pages: ExtractedPdfPage[] = [];
  let fullText = "";

  try {
    const info = await parser.getInfo().catch(() => ({ pages: 1 }));
    const totalPages = info.pages || 1;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      let pageText = "";
      try {
        pageText = (await parser.getPageText(pageNum)) || "";
      } catch {
        pageText = "";
      }
      const trimmed = pageText.trim();
      pages.push({ pageNumber: pageNum, text: trimmed });
      if (trimmed) {
        fullText += `--- Page ${pageNum} ---\n${trimmed}\n\n`;
      }
    }

    // Check for empty or scanned PDF
    const totalNonWhitespace = fullText.replace(/\s+/g, "").length;
    if (totalNonWhitespace < 40) {
      throw new ValidationError(
        "This PDF contains no selectable text (scanned image or empty document). OCR is not currently supported."
      );
    }

    return {
      text: fullText.trim(),
      pages,
      totalPages,
    };
  } finally {
    if (parser && typeof parser.destroy === "function") {
      await parser.destroy().catch(() => undefined);
    }
  }
}
