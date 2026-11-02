import { ValidationError } from "@open-sunsama/utils";

export interface YouTubeTranscriptSegment {
  timestamp: string; // e.g. "01:23"
  startSeconds: number;
  text: string;
}

export interface ExtractedYouTubeResult {
  videoId: string;
  title?: string;
  text: string;
  segments: YouTubeTranscriptSegment[];
}

function formatSeconds(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = Math.floor(totalSecs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Extracts official transcripts / subtitles from YouTube.
 * Never fabricates or hallucinates text when captions are absent.
 */
export async function extractTranscriptFromYouTube(
  videoId: string
): Promise<ExtractedYouTubeResult> {
  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new ValidationError("Invalid YouTube video identifier");
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let html: string;
  try {
    const res = await fetch(watchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      throw new ValidationError(`Could not load YouTube video (HTTP ${res.status})`);
    }
    html = await res.text();
  } catch (err) {
    throw new ValidationError(
      `Failed to reach YouTube for video ${videoId}: ${err instanceof Error ? err.message : "Network error"}`
    );
  }

  // Extract title if available
  let videoTitle = "";
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch && titleMatch[1]) {
    videoTitle = titleMatch[1].replace(/ - YouTube$/, "").trim();
  }

  // Look for ytInitialPlayerResponse
  const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\s*<\/script>)/s);
  let captionUrl: string | null = null;

  if (match && match[1]) {
    try {
      const player = JSON.parse(match[1]);
      const captionTracks =
        player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        // Prefer English track if available, else first
        const enTrack = captionTracks.find(
          (t: { languageCode?: string }) =>
            t.languageCode === "en" || t.languageCode?.startsWith("en-")
        );
        captionUrl = (enTrack || captionTracks[0])?.baseUrl ?? null;
      }
    } catch {
      captionUrl = null;
    }
  }

  // Alternative fallback pattern in raw html
  if (!captionUrl) {
    const rawTrackMatch = html.match(/"captionTracks":\s*\[\s*\{"baseUrl":\s*"([^"]+)"/);
    if (rawTrackMatch && rawTrackMatch[1]) {
      captionUrl = rawTrackMatch[1].replace(/\\u0026/g, "&");
    }
  }

  if (!captionUrl) {
    throw new ValidationError(
      "No transcript or closed captions available for this YouTube video. Videos without transcripts cannot be analyzed."
    );
  }

  // Fetch caption content in json3 format or fallback to xml
  let segments: YouTubeTranscriptSegment[] = [];
  try {
    const jsonUrl = captionUrl.includes("fmt=") ? captionUrl : `${captionUrl}&fmt=json3`;
    const captionRes = await fetch(jsonUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (captionRes.ok) {
      const contentType = captionRes.headers.get("content-type") || "";
      if (contentType.includes("json") || jsonUrl.includes("fmt=json3")) {
        const json = (await captionRes.json()) as {
          events?: { tStartMs?: number; sefs?: unknown; segs?: { utf8?: string }[] }[];
        };
        if (Array.isArray(json.events)) {
          for (const ev of json.events) {
            if (Array.isArray(ev.segs)) {
              const segText = ev.segs
                .map((s) => s.utf8 || "")
                .join("")
                .trim();
              if (segText && segText !== "\n") {
                const startSecs = Math.floor((ev.tStartMs || 0) / 1000);
                segments.push({
                  timestamp: formatSeconds(startSecs),
                  startSeconds: startSecs,
                  text: segText,
                });
              }
            }
          }
        }
      } else {
        // XML format fallback
        const xml = await captionRes.text();
        const textRegex = /<text start="([\d.]+)" dur="[\d.]+">([^<]+)<\/text>/g;
        let m: RegExpExecArray | null;
        while ((m = textRegex.exec(xml)) !== null) {
          const startSecs = Math.floor(parseFloat(m[1] || "0"));
          const decoded = (m[2] || "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
          if (decoded) {
            segments.push({
              timestamp: formatSeconds(startSecs),
              startSeconds: startSecs,
              text: decoded,
            });
          }
        }
      }
    }
  } catch (err) {
    throw new ValidationError(
      `Could not retrieve transcript cues: ${err instanceof Error ? err.message : "Network error"}`
    );
  }

  if (segments.length === 0) {
    throw new ValidationError(
      "The transcript track for this video is empty or unreadable."
    );
  }

  // Combine segments into readable timestamped text blocks
  let fullText = "";
  let currentTimestamp = "";
  let currentBlock = "";

  for (const seg of segments) {
    if (!currentTimestamp) currentTimestamp = seg.timestamp;
    currentBlock += ` ${seg.text}`;

    // Group into ~30-45 second intervals
    if (currentBlock.length > 250) {
      fullText += `[${currentTimestamp}] ${currentBlock.trim()}\n`;
      currentTimestamp = "";
      currentBlock = "";
    }
  }
  if (currentBlock) {
    fullText += `[${currentTimestamp}] ${currentBlock.trim()}\n`;
  }

  return {
    videoId,
    title: videoTitle,
    text: fullText.trim(),
    segments,
  };
}
