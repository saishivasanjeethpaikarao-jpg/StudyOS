import {
  getDb,
  eq,
  and,
  calendarAccounts,
  resources,
  resourceLinks,
  integrationAuditLogs,
} from "@open-sunsama/database";
import { GoogleCalendarProvider } from "../calendar-providers/google.js";
import { getAccessTokenForProvider } from "../calendar-sync.js";
import { uploadToS3, generateUniqueKey } from "../../lib/s3.js";
import { notifyLearning, validateLearningLinks } from "../learning.js";
import { MAX_ATTACHMENT_SIZE, isAllowedAttachmentType } from "../../validation/uploads.js";
import type { DriveFileItem, DriveImportPayload } from "@open-sunsama/types";

const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";

export class GoogleDriveIntegrationService {
  private calendarProvider = new GoogleCalendarProvider();

  private async getGoogleAccessToken(userId: string): Promise<string> {
    const db = getDb();
    const [account] = await db
      .select()
      .from(calendarAccounts)
      .where(
        and(
          eq(calendarAccounts.userId, userId),
          eq(calendarAccounts.provider, "google"),
          eq(calendarAccounts.isActive, true)
        )
      )
      .limit(1);

    if (!account) {
      throw new Error("No connected Google account found. Connect Google in Settings.");
    }

    return getAccessTokenForProvider(account, this.calendarProvider);
  }

  /**
   * List files from user's Google Drive with query support.
   */
  async listFiles(
    userId: string,
    searchQuery?: string,
    pageSize = 25
  ): Promise<{ files: DriveFileItem[]; nextPageToken?: string }> {
    const accessToken = await this.getGoogleAccessToken(userId);

    const queryParts = ["trashed = false"];
    if (searchQuery && searchQuery.trim()) {
      const sanitized = searchQuery.replace(/'/g, "\\'");
      queryParts.push(`name contains '${sanitized}'`);
    }

    // Supported academic learning mime types
    const allowedTypes = [
      "mimeType = 'application/pdf'",
      "mimeType = 'text/plain'",
      "mimeType = 'text/markdown'",
      "mimeType = 'application/vnd.google-apps.document'",
    ];
    queryParts.push(`(${allowedTypes.join(" or ")})`);

    const params = new URLSearchParams({
      pageSize: String(Math.min(pageSize, 50)),
      q: queryParts.join(" and "),
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink)",
      orderBy: "modifiedTime desc",
    });

    const res = await fetch(`${GOOGLE_DRIVE_API}/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Google Drive API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      nextPageToken?: string;
      files?: Array<{
        id: string;
        name: string;
        mimeType: string;
        size?: string;
        modifiedTime?: string;
        webViewLink?: string;
        iconLink?: string;
      }>;
    };

    const files: DriveFileItem[] = (data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      sizeBytes: f.size ? Number(f.size) : null,
      modifiedTime: f.modifiedTime || null,
      webViewLink: f.webViewLink || null,
      iconLink: f.iconLink || null,
    }));

    return { files, nextPageToken: data.nextPageToken };
  }

  /**
   * Import a selected file from Google Drive into StudyOS Resources.
   */
  async importFile(
    userId: string,
    payload: DriveImportPayload
  ): Promise<{ resourceId: string; title: string; sizeBytes: number }> {
    const db = getDb();
    const accessToken = await this.getGoogleAccessToken(userId);

    // Validate learning links if provided
    if (payload.link) {
      await validateLearningLinks(db, userId, payload.link);
    }

    // 1. Fetch file metadata
    const metaRes = await fetch(
      `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(payload.fileId)}?fields=id,name,mimeType,size`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metaRes.ok) {
      throw new Error(`Could not access Drive file (${metaRes.status})`);
    }

    const metadata = (await metaRes.json()) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
    };

    let downloadUrl = `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(payload.fileId)}?alt=media`;
    let targetMimeType = metadata.mimeType;
    let fileName = payload.fileName || metadata.name;

    // Handle Google Docs export to PDF
    if (metadata.mimeType === "application/vnd.google-apps.document") {
      downloadUrl = `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(payload.fileId)}/export?mimeType=application/pdf`;
      targetMimeType = "application/pdf";
      if (!fileName.toLowerCase().endsWith(".pdf")) {
        fileName = `${fileName}.pdf`;
      }
    }

    // Check size limit if provided in metadata
    if (metadata.size && Number(metadata.size) > MAX_ATTACHMENT_SIZE) {
      throw new Error(`File exceeds the maximum allowed size of ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB`);
    }

    // 2. Download file content
    const downloadRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!downloadRes.ok) {
      throw new Error(`Failed to download Drive file content (${downloadRes.status})`);
    }

    const buffer = Buffer.from(await downloadRes.arrayBuffer());
    if (buffer.byteLength > MAX_ATTACHMENT_SIZE) {
      throw new Error(`File exceeds maximum size of ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB`);
    }

    // 3. Upload to S3
    const storageKey = generateUniqueKey(
      userId,
      "resources",
      `${crypto.randomUUID()}-${fileName}`
    );
    await uploadToS3(storageKey, buffer, targetMimeType);

    // 4. Record in resources table
    const resource = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(resources)
        .values({
          userId,
          type: "file",
          title: fileName,
          storageKey,
          filename: fileName,
          mimeType: targetMimeType,
          sizeBytes: buffer.byteLength,
        })
        .returning();

      if (!row) throw new Error("Failed to create resource record");

      if (payload.link) {
        await tx.insert(resourceLinks).values({
          userId,
          resourceId: row.id,
          ...payload.link,
        });
      }

      return row;
    });

    // 5. Notify & audit
    notifyLearning(userId, "resources");
    await getDb().insert(integrationAuditLogs).values({
      userId,
      integrationType: "google_drive",
      action: "import_file",
      status: "success",
      details: {
        fileId: payload.fileId,
        fileName,
        resourceId: resource.id,
        sizeBytes: buffer.byteLength,
      },
    });

    return {
      resourceId: resource.id,
      title: resource.title,
      sizeBytes: buffer.byteLength,
    };
  }
}
