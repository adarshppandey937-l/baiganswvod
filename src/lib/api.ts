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
  return json.data;
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
  const s = String(link);
  return s.includes('youtube.com') || s.includes('youtu.be') || (!s.includes('.') && s.length === 11);
}

export function getYoutubeEmbedUrl(raw: string): string {
  if (/^https?:\/\//.test(raw)) {
    if (raw.includes('watch?v=')) return raw.replace('watch?v=', 'embed/');
    if (raw.includes('youtu.be/')) return raw.replace('youtu.be/', 'youtube.com/embed/');
    if (raw.includes('/shorts/')) return raw.replace('/shorts/', '/embed/shorts/');
    return raw;
  }
  return `https://www.youtube.com/embed/${raw}`;
}

export function streamProxyUrl(url: string): string {
  return `/api/stream?url=${encodeURIComponent(url)}`;
}

export function fileProxyUrl(url: string): string {
  return `/api/file?url=${encodeURIComponent(url)}`;
}

export function getPlaybackSources(item: {
  classLink?: string | null;
  recordings?: RecordingItem[];
}): PlaybackSource[] {
  const sources: PlaybackSource[] = [];
  const main = (item.classLink || '').trim();

  if (main) {
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
    if (!rec.url) continue;
    if (isYoutubeUrl(rec.url)) continue;
    const isHls = rec.url.toLowerCase().includes('.m3u8');
    sources.push({
      kind: isHls ? 'hls' : 'mp4',
      url: isHls ? streamProxyUrl(rec.url) : rec.url,
      label: rec.quality || 'Recording',
      raw: rec.url,
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
