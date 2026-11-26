import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  SentenceItem,
  STUDY_SET_CATEGORIES,
  STUDY_SET_LIMITS,
  StudySet,
  StudySetCategory,
  StudySetInput,
  StudySetVisibility,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Turns a Firestore error into a short Vietnamese message that is safe to show.
export function getFirestoreErrorMessage(code: string, operationType: OperationType): string {
  switch (code) {
    case 'permission-denied':
      if (operationType === OperationType.GET) {
        return 'Không xem được bộ câu hỏi này. Bộ có thể đang ở chế độ Riêng tư, đã bị xóa hoặc không tồn tại.';
      }
      return 'Bạn chưa có quyền thực hiện thao tác này. Hãy đăng xuất, đăng nhập lại đúng tài khoản rồi thử lại.';
    case 'unauthenticated':
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Không kết nối được máy chủ. Hãy kiểm tra mạng Internet rồi thử lại.';
    case 'resource-exhausted':
      return 'Hệ thống đã hết lượt truy cập miễn phí trong ngày. Vui lòng thử lại vào ngày mai.';
    case 'not-found':
      return 'Bộ câu hỏi này không còn tồn tại.';
  }

  const actions: Record<OperationType, string> = {
    [OperationType.CREATE]: 'lưu bộ câu hỏi',
    [OperationType.UPDATE]: 'cập nhật bộ câu hỏi',
    [OperationType.DELETE]: 'xóa bộ câu hỏi',
    [OperationType.LIST]: 'tải danh sách bộ câu hỏi',
    [OperationType.GET]: 'tải bộ câu hỏi',
    [OperationType.WRITE]: 'lưu dữ liệu',
  };
  return `Không thể ${actions[operationType]}. Vui lòng thử lại.`;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : 'unknown';
  // Technical details go to the console only, without any account information.
  console.error('Firestore error:', operationType, path, code, error);
  throw new Error(getFirestoreErrorMessage(code, operationType));
}

const COLLECTION_NAME = 'studySets';

// Sets created without signing in. They must match the guest rules in firestore.rules.
export const GUEST_OWNER_ID = 'guest';
const GUEST_OWNER_NAME = 'Khách';
const DEVICE_SETS_KEY = 'listen_spell_guest_sets';

// Guest sets are remembered in this browser so their links are not lost.
export function getDeviceSets(): StudySet[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(DEVICE_SETS_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return (parsed as StudySet[]).filter(
      (s) => s && typeof s.id === 'string' && typeof s.title === 'string' && Array.isArray(s.items)
    );
  } catch {
    return [];
  }
}

function writeDeviceSets(sets: StudySet[]): void {
  try {
    window.localStorage.setItem(DEVICE_SETS_KEY, JSON.stringify(sets.slice(0, 100)));
  } catch {
    // The browser blocks storage; the share link still works.
  }
}

function rememberDeviceSet(set: StudySet): void {
  writeDeviceSets([set, ...getDeviceSets().filter((s) => s.id !== set.id)]);
}

export function forgetDeviceSet(setId: string): void {
  writeDeviceSets(getDeviceSets().filter((s) => s.id !== setId));
}

function isPermissionDenied(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'permission-denied';
}

function guestRulesError(error: unknown): Error {
  console.error('Firestore error: guest write denied', error);
  return new Error(
    'Máy chủ chưa cho phép thao tác này khi chưa đăng nhập. Bộ có thể đã bị xóa, hoặc quy tắc Firestore mới chưa được đăng (Publish).',
    { cause: error }
  );
}

export function generateStudySetId(): string {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  return `set_${randomPart}`;
}

export function getShareUrl(setId: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('set', setId);
  return url.toString();
}

function sanitizeSentenceItems(rawItems: SentenceItem[]): SentenceItem[] {
  const cleaned = rawItems
    .map((item) => ({
      en: (item.en || '').trim().slice(0, STUDY_SET_LIMITS.EN_MAX),
      vi: (item.vi || '').trim().slice(0, STUDY_SET_LIMITS.VI_MAX),
      emoji: (item.emoji || '').trim().slice(0, STUDY_SET_LIMITS.EMOJI_MAX),
    }))
    .filter((item) => item.en.length >= STUDY_SET_LIMITS.EN_MIN && item.vi.length >= STUDY_SET_LIMITS.VI_MIN);

  if (cleaned.length < STUDY_SET_LIMITS.ITEMS_MIN || cleaned.length > STUDY_SET_LIMITS.ITEMS_MAX) {
    throw new Error(
      `Bộ câu hỏi phải có từ ${STUDY_SET_LIMITS.ITEMS_MIN} đến ${STUDY_SET_LIMITS.ITEMS_MAX} câu hợp lệ.`
    );
  }
  return cleaned;
}

export function sanitizeStudySetInput(input: StudySetInput): StudySetInput {
  const title = input.title.trim().slice(0, STUDY_SET_LIMITS.TITLE_MAX);
  if (title.length < STUDY_SET_LIMITS.TITLE_MIN) {
    throw new Error('Vui lòng nhập tiêu đề cho bộ câu hỏi.');
  }

  const description = input.description.trim().slice(0, STUDY_SET_LIMITS.DESCRIPTION_MAX);
  const category: StudySetCategory = STUDY_SET_CATEGORIES.includes(input.category)
    ? input.category
    : 'Khác';

  const visibility: StudySetVisibility = ['public', 'unlisted', 'private'].includes(input.visibility)
    ? input.visibility
    : 'unlisted';

  const items = sanitizeSentenceItems(input.items);

  return {
    title,
    description,
    category,
    visibility,
    items,
  };
}

function getSafeOwnerName(): string {
  const rawName = auth.currentUser?.displayName?.trim() || 'Người tạo nội dung';
  return rawName.slice(0, STUDY_SET_LIMITS.OWNER_NAME_MAX) || 'Người tạo nội dung';
}

function getTimestampMillis(ts: unknown): number {
  if (ts instanceof Timestamp) return ts.toMillis();
  if (ts && typeof ts === 'object' && 'seconds' in ts && typeof (ts as { seconds: number }).seconds === 'number') {
    return (ts as { seconds: number }).seconds * 1000;
  }
  return 0;
}

export function formatStudySetDate(ts: unknown): string {
  const ms = getTimestampMillis(ts);
  if (!ms) return 'Vừa cập nhật';
  return new Date(ms).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export async function createStudySet(input: StudySetInput): Promise<StudySet> {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    throw new Error('Tài khoản Google của bạn cần xác minh email để lưu dữ liệu.');
  }

  const clean = sanitizeStudySetInput(input);
  const setId = generateStudySetId();
  if (!STUDY_SET_LIMITS.ID_PATTERN.test(setId) || setId.length > STUDY_SET_LIMITS.ID_MAX) {
    throw new Error('Mã bộ câu hỏi không hợp lệ.');
  }

  const ownerName = user ? getSafeOwnerName() : GUEST_OWNER_NAME;
  const docPath = `${COLLECTION_NAME}/${setId}`;

  const payload = {
    id: setId,
    title: clean.title,
    description: clean.description,
    category: clean.category,
    visibility: user ? clean.visibility : ('unlisted' as const),
    ownerId: user ? user.uid : GUEST_OWNER_ID,
    ownerName,
    items: clean.items,
    itemCount: clean.items.length,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, COLLECTION_NAME, setId), payload);
    const saved: StudySet = {
      ...payload,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    if (!user) rememberDeviceSet(saved);
    return saved;
  } catch (error) {
    if (!user && isPermissionDenied(error)) throw guestRulesError(error);
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateStudySet(
  existing: StudySet,
  input: StudySetInput
): Promise<StudySet> {
  const setId = existing.id;
  const isGuestSet = existing.ownerId === GUEST_OWNER_ID;
  if (!isGuestSet && !auth.currentUser) {
    throw new Error('Vui lòng đăng nhập Google để chỉnh sửa.');
  }
  if (!STUDY_SET_LIMITS.ID_PATTERN.test(setId)) {
    throw new Error('Mã bộ câu hỏi không hợp lệ.');
  }

  const clean = sanitizeStudySetInput(input);
  const changes = {
    title: clean.title,
    description: clean.description,
    category: clean.category,
    visibility: isGuestSet ? ('unlisted' as const) : clean.visibility,
    ownerName: isGuestSet ? GUEST_OWNER_NAME : getSafeOwnerName(),
    items: clean.items,
    itemCount: clean.items.length,
  };
  const docPath = `${COLLECTION_NAME}/${setId}`;

  try {
    await updateDoc(doc(db, COLLECTION_NAME, setId), {
      ...changes,
      updatedAt: serverTimestamp(),
    });
    const updated: StudySet = { ...existing, ...changes, updatedAt: Timestamp.now() };
    if (isGuestSet) rememberDeviceSet(updated);
    return updated;
  } catch (error) {
    if (isGuestSet && isPermissionDenied(error)) throw guestRulesError(error);
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function updateStudySetVisibility(
  setId: string,
  visibility: StudySetVisibility
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Vui lòng đăng nhập Google để thay đổi quyền chia sẻ.');
  }
  const docPath = `${COLLECTION_NAME}/${setId}`;
  try {
    await updateDoc(doc(db, COLLECTION_NAME, setId), {
      visibility,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

// A guest set that no longer exists cannot be read, so it only needs to leave the list.
async function isGone(setId: string): Promise<boolean> {
  try {
    return !(await getDoc(doc(db, COLLECTION_NAME, setId))).exists();
  } catch (error) {
    return isPermissionDenied(error);
  }
}

export async function deleteStudySet(setId: string, ownerId: string): Promise<void> {
  const isGuestSet = ownerId === GUEST_OWNER_ID;
  if (!isGuestSet && !auth.currentUser) {
    throw new Error('Vui lòng đăng nhập Google để xóa bộ câu hỏi.');
  }
  const docPath = `${COLLECTION_NAME}/${setId}`;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, setId));
    if (isGuestSet) forgetDeviceSet(setId);
  } catch (error) {
    if (isGuestSet && isPermissionDenied(error)) {
      if (await isGone(setId)) {
        forgetDeviceSet(setId);
        return;
      }
      throw guestRulesError(error);
    }
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function fetchStudySetById(setId: string): Promise<StudySet | null> {
  const trimmed = setId.trim();
  if (!trimmed || !STUDY_SET_LIMITS.ID_PATTERN.test(trimmed) || trimmed.length > STUDY_SET_LIMITS.ID_MAX) {
    return null;
  }
  const docPath = `${COLLECTION_NAME}/${trimmed}`;
  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, trimmed));
    if (!snap.exists()) return null;
    return snap.data() as StudySet;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

export function subscribeToUserStudySets(
  userId: string,
  onData: (sets: StudySet[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, COLLECTION_NAME), where('ownerId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const sets = snapshot.docs
        .map((d) => d.data() as StudySet)
        .sort((a, b) => getTimestampMillis(b.updatedAt) - getTimestampMillis(a.updatedAt));
      onData(sets);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function fetchPublicStudySets(): Promise<StudySet[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('visibility', '==', 'public'),
      limit(36)
    );
    const snapshot = await getDocs(q);
    // Offline, Firestore returns an empty cached list instead of an error.
    if (snapshot.empty && snapshot.metadata.fromCache) {
      throw { code: 'unavailable' };
    }
    return snapshot.docs
      .map((d) => d.data() as StudySet)
      .sort((a, b) => getTimestampMillis(b.updatedAt) - getTimestampMillis(a.updatedAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
  }
}
