/**
 * Splits large academic texts into overlapping windows while respecting
 * structural boundaries (paragraphs, page markers, timestamps).
 */
export function chunkAcademicText(
  text: string,
  options: {
    maxChunkChars?: number;
    overlapChars?: number;
  } = {}
): string[] {
  const maxChunk = options.maxChunkChars ?? 10_000; // ~2,500 words / ~3,000 tokens
  const overlap = options.overlapChars ?? 1_000;

  if (!text || text.length <= maxChunk) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + maxChunk;

    if (endIndex >= text.length) {
      chunks.push(text.slice(startIndex).trim());
      break;
    }

    // Try finding a natural break point (paragraph break, line break, or period)
    const windowSlice = text.slice(startIndex, endIndex);
    let breakPoint = windowSlice.lastIndexOf("\n\n");
    if (breakPoint < maxChunk * 0.6) {
      breakPoint = windowSlice.lastIndexOf("\n");
    }
    if (breakPoint < maxChunk * 0.6) {
      breakPoint = windowSlice.lastIndexOf(". ");
    }
    if (breakPoint < maxChunk * 0.5) {
      breakPoint = maxChunk; // Hard cut if no clean separator
    } else {
      breakPoint += 1; // Include boundary char
    }

    const chunk = text.slice(startIndex, startIndex + breakPoint).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    // Move startIndex with overlap, ensuring forward progress
    startIndex = Math.max(startIndex + 1, startIndex + breakPoint - overlap);
  }

  return chunks;
}
