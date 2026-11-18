export type ViewMode = 'batches' | 'batch' | 'free' | 'ebooks' | 'favorites';

export type PdfKind = 'notes' | 'dpp' | 'test';

export interface RecordingItem {
  url: string;
  quality?: string;
}

export interface PdfItem {
  id: string;
  name: string;
  url: string;
  type?: string;
}

export interface Batch {
  id: string;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  highlights?: string | null;
  banner?: string | null;
  bannerSquare?: string | null;
  price?: number;
  discountPrice?: number;
  isLive?: boolean;
  isRecorded?: boolean;
  isFree?: boolean;
  inFreeList?: boolean;
  validity?: string | null;
  studentCount?: number;
  liveClassesCount?: number;
  recordedClassesCount?: number;
  mainCategory?: string | null;
  categoryName?: string | null;
  facultyName?: string | null;
  facultyImage?: string | null;
  _count?: {
    classes?: number;
  };
}

export interface BatchClass {
  id: string;
  title: string;
  description?: string | null;
  teacherName?: string | null;
  classLink?: string | null;
  image?: string | null;
  sectionName?: string | null;
  topicName?: string | null;
  duration?: number | null;
  date?: string | null;
  isLive?: boolean;
  recordings: RecordingItem[];
  pdfs: PdfItem[];
}

export interface BatchTopic {
  topicId: string;
  topicName: string;
  classes: BatchClass[];
}

export interface BatchClassesResponse {
  course: Batch;
  topics: BatchTopic[];
}

export interface FreeVideo {
  id: string;
  title: string;
  description?: string | null;
  teacherName?: string | null;
  classLink?: string | null;
  image?: string | null;
  isShort?: boolean;
  isFree?: boolean;
  isLive?: boolean;
  isYoutube?: boolean;
  categoryName?: string | null;
  sectionName?: string | null;
  topicName?: string | null;
  duration?: number | null;
  sourceDate?: string | null;
}

export interface FreeVideosResponse {
  state: string;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  data: FreeVideo[];
}

export interface EBook {
  id: string;
  title: string;
  image?: string | null;
  pdf: string;
  tag?: string | null;
  sortOrder?: number;
}

export interface PlaybackSource {
  kind: 'youtube' | 'hls' | 'mp4';
  url: string;
  label: string;
  raw?: string;
}
