import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArrowLeft,
  FileText,
  Globe,
  Link2,
  Lock,
  LogIn,
  Plus,
  Save,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  SentenceItem,
  STUDY_SET_CATEGORIES,
  STUDY_SET_LIMITS,
  StudySet,
  StudySetCategory,
  StudySetVisibility,
} from '../types';
import { createStudySet, updateStudySet } from '../services/studySetService';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { VoiceSelector } from './VoiceSelector';

interface CreateSetScreenProps {
  user: User | null;
  editingSet: StudySet | null;
  onSignIn: () => Promise<void>;
  onSaved: (savedSet: StudySet, isNew: boolean) => void;
  onCancel: () => void;
}

const QUICK_EMOJIS = ['🗣️', '📚', '💡', '✈️', '🏠', '☕', '🎯', '💼', '🎧', '✍️'];

export const CreateSetScreen: React.FC<CreateSetScreenProps> = ({
  user,
  editingSet,
  onSignIn,
  onSaved,
  onCancel,
}) => {
  const [title, setTitle] = useState(editingSet?.title ?? '');
  const [description, setDescription] = useState(editingSet?.description ?? '');
  const [category, setCategory] = useState<StudySetCategory>(
    editingSet?.category ?? 'Giao tiếp'
  );
  const [visibility, setVisibility] = useState<StudySetVisibility>(
    editingSet?.visibility ?? 'unlisted'
  );
  const [items, setItems] = useState<SentenceItem[]>(
    editingSet?.items.length
      ? editingSet.items
      : [
          { en: '', vi: '', emoji: '🗣️' },
          { en: '', vi: '', emoji: '📚' },
        ]
  );

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    speak,
  } = useSpeechSynthesis();

  const handleAddRow = () => {
    if (items.length >= STUDY_SET_LIMITS.ITEMS_MAX) {
      setErrorMsg(`Mỗi bộ câu hỏi tối đa ${STUDY_SET_LIMITS.ITEMS_MAX} câu.`);
      return;
    }
    setItems((prev) => [...prev, { en: '', vi: '', emoji: '💡' }]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeRow = (
    index: number,
    field: keyof SentenceItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
    if (errorMsg) setErrorMsg('');
  };

  const handleBulkImport = () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.length) {
      setErrorMsg('Vui lòng dán ít nhất 1 dòng theo mẫu: Câu tiếng Anh | Nghĩa tiếng Việt | Emoji');
      return;
    }

    const parsed: SentenceItem[] = [];
    for (const line of lines) {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsed.push({
          en: parts[0].slice(0, STUDY_SET_LIMITS.EN_MAX),
          vi: parts[1].slice(0, STUDY_SET_LIMITS.VI_MAX),
          emoji: (parts[2] || '🗣️').slice(0, STUDY_SET_LIMITS.EMOJI_MAX),
        });
      }
    }

    if (!parsed.length) {
      setErrorMsg('Không đọc được câu hợp lệ. Hãy dùng dấu "|" để tách câu tiếng Anh và nghĩa tiếng Việt.');
      return;
    }

    const existingNonEmpty = items.filter((it) => it.en.trim() || it.vi.trim());
    const combined = [...existingNonEmpty, ...parsed].slice(
      0,
      STUDY_SET_LIMITS.ITEMS_MAX
    );
    setItems(combined);
    setBulkText('');
    setShowBulkImport(false);
    setErrorMsg('');
  };

  const handleSignInClick = async () => {
    setSigningIn(true);
    setErrorMsg('');
    try {
      await onSignIn();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Đăng nhập Google chưa thành công.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      setErrorMsg('Bạn cần đăng nhập Google để lưu bộ câu hỏi lên Firestore.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Vui lòng nhập tiêu đề cho bộ câu hỏi.');
      return;
    }

    const validItems = items
      .map((item) => ({
        en: item.en.trim(),
        vi: item.vi.trim(),
        emoji: item.emoji.trim(),
      }))
      .filter((item) => item.en.length > 0 || item.vi.length > 0);

    if (validItems.length === 0) {
      setErrorMsg('Vui lòng nhập ít nhất 1 câu tiếng Anh và nghĩa tiếng Việt.');
      return;
    }

    const incompleteIndex = validItems.findIndex((item) => !item.en || !item.vi);
    if (incompleteIndex !== -1) {
      setErrorMsg(
        `Câu số ${incompleteIndex + 1} đang thiếu nội dung tiếng Anh hoặc nghĩa tiếng Việt.`
      );
      return;
    }

    setSaving(true);
    try {
      if (editingSet) {
        await updateStudySet(editingSet.id, {
          title: trimmedTitle,
          description: description.trim(),
          category,
          visibility,
          items: validItems,
        });
        onSaved(
          {
            ...editingSet,
            title: trimmedTitle,
            description: description.trim(),
            category,
            visibility,
            items: validItems,
            itemCount: validItems.length,
          },
          false
        );
      } else {
        const created = await createStudySet({
          title: trimmedTitle,
          description: description.trim(),
          category,
          visibility,
          items: validItems,
        });
        onSaved(created, true);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Không thể lưu bộ câu hỏi. Vui lòng thử lại.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-3">
          <VoiceSelector
            compact
            voices={voices}
            selectedVoiceURI={selectedVoiceURI}
            onSelectVoice={setSelectedVoiceURI}
            onPreviewVoice={(uri) =>
              speak("Hello! Let's practice English together.", { voiceURI: uri })
            }
          />
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {items.length}/{STUDY_SET_LIMITS.ITEMS_MAX} câu
          </span>
        </div>
      </div>

      {!user && (
        <div className="bg-white border border-indigo-100 rounded-2xl p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              Đăng nhập Google để lưu và quản lý liên kết chia sẻ
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Bạn có thể soạn trước nội dung bên dưới, sau đó đăng nhập để lưu lên Firestore và nhận link chia sẻ.
            </p>
          </div>
          <button
            type="button"
            disabled={signingIn}
            onClick={handleSignInClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{signingIn ? 'Đang đăng nhập...' : 'Đăng nhập Google'}</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-indigo-100 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              {editingSet ? 'Chỉnh sửa bộ câu hỏi' : 'Tạo bộ câu hỏi luyện nghe mới'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Điền thông tin bộ bài tập và danh sách câu tiếng Anh. Lưu xong sẽ tạo ngay liên kết chia sẻ.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="set-title" className="text-sm font-medium text-slate-700">
                  Tiêu đề bộ câu hỏi <span className="text-red-600">*</span>
                </label>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {title.length}/{STUDY_SET_LIMITS.TITLE_MAX}
                </span>
              </div>
              <input
                id="set-title"
                type="text"
                maxLength={STUDY_SET_LIMITS.TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: 15 câu giao tiếp sân bay thiết yếu"
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="set-category" className="block text-sm font-medium text-slate-700 mb-1.5">
                Phân loại
              </label>
              <select
                id="set-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as StudySetCategory)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                {STUDY_SET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="set-desc" className="text-sm font-medium text-slate-700">
                Mô tả ngắn (không bắt buộc)
              </label>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {description.length}/{STUDY_SET_LIMITS.DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="set-desc"
              rows={2}
              maxLength={STUDY_SET_LIMITS.DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú mục tiêu bài tập hoặc đối tượng người học..."
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white resize-none"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">
              Chế độ chia sẻ
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  value: 'unlisted' as const,
                  label: 'Chỉ người có link',
                  desc: 'Gửi link để bạn bè luyện tập',
                  icon: <Link2 className="w-4 h-4" />,
                },
                {
                  value: 'public' as const,
                  label: 'Công khai',
                  desc: 'Hiện trong mục Cộng đồng',
                  icon: <Globe className="w-4 h-4" />,
                },
                {
                  value: 'private' as const,
                  label: 'Riêng tư',
                  desc: 'Chỉ mình bạn truy cập',
                  icon: <Lock className="w-4 h-4" />,
                },
              ].map((opt) => {
                const active = visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-blue-600 bg-blue-50/70 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className={`mt-0.5 ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                      {opt.icon}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className="text-xs text-slate-500">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Danh sách câu luyện tập
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập câu tiếng Anh chuẩn để hệ thống phát âm và nghĩa tiếng Việt làm gợi ý.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBulkImport((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showBulkImport ? 'Đóng nhập nhanh' : 'Nhập nhanh nhiều câu'}</span>
            </button>
          </div>

          {showBulkImport && (
            <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <label htmlFor="bulk-import-area" className="block text-xs font-medium text-slate-700">
                Mỗi dòng 1 câu theo định dạng: <span className="font-mono">Câu tiếng Anh | Nghĩa tiếng Việt | Emoji (tùy chọn)</span>
              </label>
              <textarea
                id="bulk-import-area"
                rows={4}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Where is the boarding gate? | Cổng lên máy bay ở đâu vậy? | ✈️\nCould you check my passport, please? | Bạn vui lòng kiểm tra hộ chiếu giúp tôi nhé? | 🛂`}
                className="w-full px-3 py-2 text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkImport(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  Thêm vào danh sách
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <div key={index} className="py-4 first:pt-0 last:pb-0 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
                    Câu {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!item.en.trim()}
                      onClick={() => speak(item.en.trim())}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Nghe thử</span>
                    </button>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        aria-label={`Xóa câu ${index + 1}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-6">
                    <label className="block text-xs text-slate-500 mb-1">
                      Câu tiếng Anh <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={STUDY_SET_LIMITS.EN_MAX}
                      value={item.en}
                      onChange={(e) => handleChangeRow(index, 'en', e.target.value)}
                      placeholder="Ví dụ: Could you help me with this?"
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-xs text-slate-500 mb-1">
                      Nghĩa tiếng Việt <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={STUDY_SET_LIMITS.VI_MAX}
                      value={item.vi}
                      onChange={(e) => handleChangeRow(index, 'vi', e.target.value)}
                      placeholder="Ví dụ: Bạn giúp tôi việc này được không?"
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">
                      Biểu tượng
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={STUDY_SET_LIMITS.EMOJI_MAX}
                        value={item.emoji}
                        onChange={(e) => handleChangeRow(index, 'emoji', e.target.value)}
                        className="w-full px-3 py-2 text-sm text-center bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[11px] text-slate-400 mr-1">Chọn nhanh:</span>
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleChangeRow(index, 'emoji', em)}
                      className={`px-1.5 py-0.5 text-sm rounded hover:bg-slate-100 transition-colors cursor-pointer ${
                        item.emoji === em ? 'bg-blue-50 ring-1 ring-blue-300' : ''
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleAddRow}
              disabled={items.length >= STUDY_SET_LIMITS.ITEMS_MAX}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm câu mới</span>
            </button>

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>
                  {saving
                    ? 'Đang lưu...'
                    : editingSet
                    ? 'Lưu thay đổi'
                    : 'Lưu & Tạo link chia sẻ'}
                </span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium"
            >
              {errorMsg}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
