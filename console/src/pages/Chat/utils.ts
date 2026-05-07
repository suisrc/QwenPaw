// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
import { chatApi } from "../../api/modules/chat";
export type CopyableContent = {
  type?: string;
  text?: string;
  refusal?: string;
};

export type MarkdownContentBlock = {
  type: string;
  text?: string;
  image_url?: string;
  [key: string]: unknown;
};

export type CopyableMessage = {
  role?: string;
  content?: string | CopyableContent[];
};

export type CopyableResponse = {
  output?: CopyableMessage[];
};

export type RuntimeLoadingBridgeApi = {
  getLoading?: () => boolean | string;
  setLoading?: (loading: boolean | string) => void;
};

// ---------------------------------------------------------------------------
// Text extraction utilities
// ---------------------------------------------------------------------------

/** Extract copyable text from assistant response. */
export function extractCopyableText(response: CopyableResponse): string {
  const collectText = (assistantOnly: boolean) => {
    const chunks = (response.output || []).flatMap((item: CopyableMessage) => {
      if (assistantOnly && item.role !== "assistant") return [];

      if (typeof item.content === "string") {
        return [item.content];
      }

      if (!Array.isArray(item.content)) {
        return [];
      }

      return item.content.flatMap((content: CopyableContent) => {
        if (content.type === "text" && typeof content.text === "string") {
          return [content.text];
        }

        if (content.type === "refusal" && typeof content.refusal === "string") {
          return [content.refusal];
        }

        return [];
      });
    });

    return chunks.filter(Boolean).join("\n\n").trim();
  };

  return collectText(true) || JSON.stringify(response);
}

/** Extract plain text from user message content. */
export function extractUserMessageText(m: any): string {
  if (typeof m.content === "string") return m.content;
  if (!Array.isArray(m.content)) return "";
  return m.content
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text || "")
    .join("\n");
}

export function extractTextFromMessage(msg: any): string {
  const innerMessage = msg?.cards?.[0]?.data?.input?.[0];
  if (!innerMessage) return "";
  return extractUserMessageText(innerMessage);
}

// ---------------------------------------------------------------------------
// Clipboard utilities
// ---------------------------------------------------------------------------

/** Copy text to clipboard with fallback for non-secure contexts. */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);

  let copied = false;
  try {
    textarea.focus();
    textarea.select();
    copied = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }

  if (!copied) {
    throw new Error("Failed to copy text");
  }
}

// ---------------------------------------------------------------------------
// Error response utilities
// ---------------------------------------------------------------------------

/** Build a 400 error response when model is not configured. */
export function buildModelError(): Response {
  return new Response(
    JSON.stringify({
      error: "Model not configured",
      message: "Please configure a model first",
    }),
    { status: 400, headers: { "Content-Type": "application/json" } },
  );
}

// ---------------------------------------------------------------------------
// URL normalization utilities
// ---------------------------------------------------------------------------

/** Decode each path segment; keeps `/` delimiters (including repeated `/`). */
function decodeUriPathSegments(path: string): string {
  return path
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

/** Convert file URL to stored path for backend: keep full path after `/files/preview/`. */
export function toStoredName(v: string): string {
  const marker = "/files/preview/";
  const idx = v.indexOf(marker);
  if (idx !== -1) {
    let rest = v.slice(idx + marker.length);
    const q = rest.indexOf("?");
    if (q !== -1) rest = rest.slice(0, q);
    const h = rest.indexOf("#");
    if (h !== -1) rest = rest.slice(0, h);
    if (rest) {
      const decoded = decodeUriPathSegments(rest);
      // Windows absolute path: C:\... or C:/...
      const isWindowsAbsolute = /^[a-zA-Z]:[\\/]/.test(decoded);
      if (isWindowsAbsolute) return decoded;
      return decoded.startsWith("/") ? decoded : `/${decoded}`;
    }
  }
  return v;
}

/** Convert content part URLs to stored name format. */
export function normalizeContentUrls(part: any): any {
  const p = { ...part };
  if (p.type === "image" && typeof p.image_url === "string")
    p.image_url = toStoredName(p.image_url);
  if (p.type === "file" && typeof p.file_url === "string")
    p.file_url = toStoredName(p.file_url);
  if (p.type === "audio" && typeof p.data === "string")
    p.data = toStoredName(p.data);
  if (p.type === "video" && typeof p.video_url === "string")
    p.video_url = toStoredName(p.video_url);
  return p;
}

/** Turn a backend content URL (path or full URL) into a full URL for display. */
export function toDisplayUrl(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("file://")) url = url.replace("file://", "");
  return chatApi.filePreviewUrl(url.startsWith("/") ? url : `/${url}`);
}

/** Show markdown images as separate content blocks */
const MARKDOWN_IMAGE_RE = /!?\[([^\]]*)\]\((\/api\/files\/preview\/[^)\s]+)\)/g;

function splitMarkdownImageText(text: string): MarkdownContentBlock[] {
  if (!text) {
    return [{ type: "text", text: "" }];
  }

  const parts: MarkdownContentBlock[] = [];
  let lastIndex = 0;
  let matched = false;

  MARKDOWN_IMAGE_RE.lastIndex = 0;
  for (const match of text.matchAll(MARKDOWN_IMAGE_RE)) {
    matched = true;
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: "text", text: text.slice(lastIndex, start) });
    }

    const url = match[2] || "";
    const alt = match[1] || "";
    parts.push({
      type: "image",
      image_url: toDisplayUrl(url),
      alt,
    });
    lastIndex = start + match[0].length;
  }

  if (!matched) {
    return [{ type: "text", text }];
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", text: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: "text", text }];
}

export function normalizeMarkdownImageContent(content: unknown): unknown {
  if (typeof content === "string") {
    return splitMarkdownImageText(content);
  }

  if (!Array.isArray(content)) {
    return content;
  }

  return content.flatMap((part) => {
    if (typeof part === "string") {
      return splitMarkdownImageText(part);
    }

    if (!part || typeof part !== "object") {
      return [part];
    }

    const block = part as Record<string, unknown>;
    if (block.type === "text" && typeof block.text === "string") {
      return splitMarkdownImageText(block.text);
    }

    return [block];
  });
}

// ---------------------------------------------------------------------------
// DOM utilities
// ---------------------------------------------------------------------------

/** Set textarea value and trigger input event for React state sync.
 * Uses native value setter to bypass React's internal value tracker.
 */
export function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const nativeValueSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (nativeValueSetter) {
    nativeValueSetter.call(textarea, value);
  } else {
    textarea.value = value;
  }
  textarea.selectionStart = textarea.selectionEnd = value.length;
  const event = new Event("input", { bubbles: true });
  textarea.dispatchEvent(event);
}
