/// <reference types="vite/client" />

export enum GameState {
  START = 'start',
  TOPIC_SELECTION = 'topicSelection',
  MY_SETS = 'mySets',
  COMMUNITY = 'community',
  CREATE_SET = 'createSet',
  SHARED_INTRO = 'sharedIntro',
  GAME = 'game',
  CONGRATS = 'congrats',
  REVIEW_ERRORS = 'review',
}

export interface SentenceItem {
  en: string;
  vi: string;
  emoji: string;
}

export type TopicDictionary = Record<string, SentenceItem[]>;

export type StudySetVisibility = 'public' | 'unlisted' | 'private';

export type StudySetCategory =
  | 'Giao tiếp'
  | 'Ngữ pháp'
  | 'IELTS & Học thuật'
  | 'Từ vựng'
  | 'Khác';

export const STUDY_SET_CATEGORIES: StudySetCategory[] = [
  'Giao tiếp',
  'Ngữ pháp',
  'IELTS & Học thuật',
  'Từ vựng',
  'Khác',
];

export const STUDY_SET_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  ID_MAX: 128,
  TITLE_MIN: 1,
  TITLE_MAX: 100,
  DESCRIPTION_MAX: 300,
  CATEGORY_MAX: 60,
  OWNER_NAME_MIN: 1,
  OWNER_NAME_MAX: 80,
  ITEMS_MIN: 1,
  ITEMS_MAX: 50,
  EN_MIN: 1,
  EN_MAX: 240,
  VI_MIN: 1,
  VI_MAX: 240,
  EMOJI_MAX: 16,
} as const;

export interface StudySet {
  id: string;
  title: string;
  description: string;
  category: StudySetCategory;
  visibility: StudySetVisibility;
  ownerId: string;
  ownerName: string;
  items: SentenceItem[];
  itemCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudySetInput {
  title: string;
  description: string;
  category: StudySetCategory;
  visibility: StudySetVisibility;
  items: SentenceItem[];
}

export interface ErrorRecord {
  correctAnswer: string;
  userAnswer: string;
  viHint?: string;
}

export interface GameResult {
  score: number;
  total: number;
  correctCount: number;
  errors: ErrorRecord[];
}
