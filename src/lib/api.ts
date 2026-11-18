import type {
  Batch,
  BatchClassesResponse,
  EBook,
  FreeVideosResponse,
  PdfItem,
  PdfKind,
  PlaybackSource,
  RecordingItem,
} from '../types';

export const HEADER_PHOTO_SRC = '/header-photo.jpg';
export const HEADER_PHOTO_FALLBACK =
  'https://i.postimg.cc/wv3RgCjh/Screenshot-2026-07-30-13-33-52-41-948cd9899890cbd5c2798760b2b95377.jpg';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBatches(): Promise<Batch[]> {
  const json = await fetchJson<{ data?: Batch[] }>('/api/batches');
  return json.data || [];
}

export async function fetchBatchClasses(courseId: string): Promise<BatchClassesResponse> {
  const json = await fetchJson<{ data: BatchClassesResponse }>(`/api/batches/${courseId}/classes`);
  const raw = json.data;
  const topics = Array.isArray(raw?.topics)
    ? raw.topics.map((t) => ({
        ...t,
        classes: Array.isArray(t.classes)
          ? t.classes.map((c) => ({
              ...c,
              pdfs: Array.isArray(c.pdfs) ? c.pdfs : [],
              recordings: Array.isArray(c.recordings) ? c.recordings : [],
            }))
          : [],
      }))
    : [];
  return {
    course: raw?.course,
    topics,
  };
}

export async function fetchFreeVideos(params: {
  page?: number;
  limit?: number;
  type?: string;
  search?: string;
}): Promise<FreeVideosResponse> {
  const sp = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 12),
    type: params.type ?? 'all',
  });
  if (params.search) {
    sp.set('search', params.search);
  }
  return fetchJson<FreeVideosResponse>(`/api/free/videos?${sp.toString()}`);
}

export async function fetchEBooks(): Promise<EBook[]> {
  const json = await fetchJson<{ data?: EBook[] }>('/api/ebooks');
  return json.data || [];
}

export function isYoutubeUrl(link?: string | null): boolean {
  if (!link) return false;
  const s = String(link).trim();
  if (!s || s === 'null' || s === 'undefined') return false;
  return s.includes('youtube.com') || s.includes('youtu.be') || (!s.includes('.') && s.length === 11);
}

export function extractYoutubeId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.includes('.') && /^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') {
      return u.pathname.split('/').filter(Boolean)[0] || null;
    }
    if (host.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      const markerIdx = parts.findIndex((p) =>
        p === 'embed' || p === 'shorts' || p === 'live' || p === 'v'
      );
      if (markerIdx !== -1 && parts[markerIdx + 1]) {
        return parts[markerIdx + 1];
      }
    }
  } catch {
    // ignore malformed URL
  }
  return null;
}

export function getYoutubeEmbedUrl(raw: string): string {
  const id = extractYoutubeId(raw);
  if (id) {
    return `https://www.youtube.com/embed/${id}?rel=0&playsinline=1`;
  }
  return raw;
}

export function streamProxyUrl(url: string): string {
  return `/api/stream?url=${encodeURIComponent(url)}`;
}

export function fileProxyUrl(url: string): string {
  return `/api/file?url=${encodeURIComponent(url)}`;
}

export function getPlaybackSources(item: {
  classLink?: string | null;
  recordings?: RecordingItem[] | null;
}): PlaybackSource[] {
  const sources: PlaybackSource[] = [];
  const main = (item.classLink || '').trim();

  if (main && main !== 'null' && main !== 'undefined') {
    if (isYoutubeUrl(main)) {
      sources.push({
        kind: 'youtube',
        url: getYoutubeEmbedUrl(main),
        label: 'YouTube',
        raw: main,
      });
    } else if (main.toLowerCase().includes('.m3u8')) {
      sources.push({
        kind: 'hls',
        url: streamProxyUrl(main),
        label: 'Auto',
        raw: main,
      });
    } else {
      sources.push({
        kind: 'mp4',
        url: main,
        label: 'Default',
        raw: main,
      });
    }
  }

  for (const rec of item.recordings || []) {
    if (!rec?.url) continue;
    const recUrl = rec.url.trim();
    if (!recUrl || isYoutubeUrl(recUrl)) continue;
    const isHls = recUrl.toLowerCase().includes('.m3u8');
    sources.push({
      kind: isHls ? 'hls' : 'mp4',
      url: isHls ? streamProxyUrl(recUrl) : recUrl,
      label: rec.quality || 'Recording',
      raw: recUrl,
    });
  }

  const seen = new Set<string>();
  return sources.filter((src) => {
    const key = src.raw || src.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Unknown Date';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Unknown Date';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

export function parseHighlights(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter(Boolean);
    }
  } catch {
    // ignore invalid JSON
  }
  return [];
}

export function getPdfKind(pdf: PdfItem): PdfKind {
  const hay = `${pdf.name || ''} ${pdf.type || ''}`.toLowerCase();
  if (hay.includes('dpp') || hay.includes('practice') || hay.includes('sheet')) {
    return 'dpp';
  }
  if (hay.includes('test') || hay.includes('quiz') || hay.includes('mock')) {
    return 'test';
  }
  return 'notes';
}
