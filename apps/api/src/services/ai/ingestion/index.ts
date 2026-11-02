import {
  and,
  eq,
  getDb,
  isNull,
  resources,
  studyNotes,
} from "@open-sunsama/database";
import { NotFoundError, ValidationError } from "@open-sunsama/utils";
import { getS3Object } from "../../../lib/s3.js";
import { requireOwnedResource } from "../../learning.js";
import { chunkAcademicText } from "./chunking.js";
import { extractTextFromPdf } from "./pdf.js";
import { extractTranscriptFromYouTube } from "./youtube.js";

export interface ExtractedAcademicSource {
  title: string;
  sourceType: "resource" | "note" | "text";
  fullText: string;
  chunks: string[];
  referenceSummary: string;
  sourceResourceId?: string;
  sourceNoteId?: string;
}

/**
 * Resolves, authorizes, and extracts text content from a student's academic resource.
 */
export async function ingestAcademicSource(
  userId: string,
  params: {
    sourceType: "resource" | "note" | "text";
    resourceId?: string;
    noteId?: string;
    pastedText?: string;
  }
): Promise<ExtractedAcademicSource> {
  const db = getDb();

  if (params.sourceType === "resource") {
    if (!params.resourceId) {
      throw new ValidationError("Resource ID is required");
    }
    const resource = await requireOwnedResource(db, userId, params.resourceId);

    if (resource.type === "file") {
      if (!resource.storageKey) {
        throw new NotFoundError("File storage key");
      }
      const s3Obj = await getS3Object(resource.storageKey);
      if (!s3Obj) {
        throw new NotFoundError("Stored file on S3");
      }

      // Read stream into buffer
      const reader = s3Obj.body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const fileBuffer = Buffer.concat(chunks);

      const mime = resource.mimeType?.toLowerCase() || s3Obj.contentType.toLowerCase();
      let extractedText = "";

      if (mime.includes("pdf") || resource.filename?.endsWith(".pdf")) {
        const pdfResult = await extractTextFromPdf(fileBuffer);
        extractedText = pdfResult.text;
      } else if (
        mime.startsWith("text/") ||
        mime.includes("json") ||
        resource.filename?.match(/\.(txt|md|markdown|csv)$/i)
      ) {
        extractedText = fileBuffer.toString("utf8");
      } else {
        throw new ValidationError(
          `Unsupported file format (${mime}). StudyOS AI currently extracts PDF and text files.`
        );
      }

      if (!extractedText.trim()) {
        throw new ValidationError("No readable text could be extracted from this file.");
      }

      return {
        title: resource.title || resource.filename || "Uploaded File",
        sourceType: "resource",
        fullText: extractedText,
        chunks: chunkAcademicText(extractedText),
        referenceSummary: `File: ${resource.title}`,
        sourceResourceId: resource.id,
      };
    }

    if (resource.type === "youtube") {
      const videoId =
        resource.providerItemId ||
        resource.url?.match(/(?:v=|\/shorts\/|\/live\/|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
      if (!videoId) {
        throw new ValidationError("Could not identify YouTube video ID");
      }

      const ytResult = await extractTranscriptFromYouTube(videoId);
      return {
        title: resource.title || ytResult.title || "YouTube Lesson",
        sourceType: "resource",
        fullText: ytResult.text,
        chunks: chunkAcademicText(ytResult.text),
        referenceSummary: `YouTube: ${resource.title || videoId}`,
        sourceResourceId: resource.id,
      };
    }

    throw new ValidationError(
      "Only PDF documents and YouTube lessons are currently supported for resource analysis."
    );
  }

  if (params.sourceType === "note") {
    if (!params.noteId) {
      throw new ValidationError("Note ID is required");
    }
    const [note] = await db
      .select()
      .from(studyNotes)
      .where(
        and(
          eq(studyNotes.id, params.noteId),
          eq(studyNotes.userId, userId),
          isNull(studyNotes.deletedAt)
        )
      )
      .limit(1);

    if (!note) {
      throw new NotFoundError("Study note", params.noteId);
    }

    const noteText = `${note.title}\n\n${note.body}`.trim();
    if (!noteText) {
      throw new ValidationError("This note contains no text content.");
    }

    return {
      title: note.title,
      sourceType: "note",
      fullText: noteText,
      chunks: chunkAcademicText(noteText),
      referenceSummary: `Note: ${note.title}`,
      sourceNoteId: note.id,
    };
  }

  if (params.sourceType === "text") {
    const raw = (params.pastedText || "").trim();
    if (!raw) {
      throw new ValidationError("Study text is empty");
    }
    if (raw.length < 50) {
      throw new ValidationError("Please provide at least 50 characters of study material.");
    }

    return {
      title: "Pasted Study Material",
      sourceType: "text",
      fullText: raw,
      chunks: chunkAcademicText(raw),
      referenceSummary: "Pasted text",
    };
  }

  throw new ValidationError("Invalid source type");
}
