import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Headphones, Play, Share2 } from 'lucide-react';
import { StudySet } from '../types';
import { formatStudySetDate } from '../services/studySetService';

interface SharedIntroScreenProps {
  studySet: StudySet | null;
  loading: boolean;
  error: string;
  defaultPlayerName: string;
  onStartPractice: (playerName: string) => void;
  onShare: (set: StudySet) => void;
  onGoHome: () => void;
}

export const SharedIntroScreen: React.FC<SharedIntroScreenProps> = ({
  studySet,
  loading,
  error,
  defaultPlayerName,
  onStartPractice,
  onShare,
  onGoHome,
}) => {
  const [name, setName] = useState(defaultPlayerName);

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse text-left">
          <div className="h-3 w-36 bg-slate-200 rounded mb-4" />
          <div className="h-7 w-2/3 bg-slate-200 rounded mb-3" />
          <div className="h-4 w-full bg-slate-100 rounded mb-6" />
          <div className="h-11 w-48 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !studySet) {
    return (
      <div className="w-full max-w-xl mx-auto py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Không tìm thấy bộ câu hỏi được chia sẻ
          </h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {error ||
              'Liên kết có thể không hợp lệ, đã bị xóa hoặc đang ở chế độ riêng tư.'}
          </p>
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về trang chủ</span>
          </button>
        </div>
      </div>
    );
  }

  const handleBegin = () => {
    onStartPractice(name.trim() || 'Bạn');
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-8 sm:py-12 text-left">
      <button
        type="button"
        onClick={onGoHome}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Xem tất cả chủ đề</span>
      </button>

      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="bg-slate-900 text-white px-6 sm:px-8 py-6">
          <div className="flex items-center gap-2 text-xs text-sky-300 font-medium mb-2">
            <span>Bài tập được chia sẻ</span>
            <span aria-hidden="true">·</span>
            <span>{studySet.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{studySet.itemCount} câu</span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
            {studySet.title}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            {studySet.description ||
              `Bộ câu hỏi nghe và viết chính tả do ${studySet.ownerName} tạo ngày ${formatStudySetDate(
                studySet.createdAt
              )}.`}
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="text-xs text-slate-500 pb-5 mb-6 border-b border-slate-100">
            Tác giả: <span className="font-semibold text-slate-900">{studySet.ownerName}</span>
          </div>

          <div className="mb-6">
            <div className="text-xs font-medium text-slate-500 mb-2.5">
              Xem trước một số gợi ý trong bài:
            </div>
            <ul className="space-y-2">
              {studySet.items.slice(0, 3).map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2.5 text-sm text-slate-700 bg-slate-50 px-3.5 py-2.5 rounded-xl"
                >
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  {item.emoji && <span aria-hidden="true">{item.emoji}</span>}
                  <span className="truncate">{item.vi}</span>
                </li>
              ))}
              {studySet.items.length > 3 && (
                <li className="text-xs text-slate-500 pl-1">
                  Và {studySet.items.length - 3} câu khác...
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="shared-player-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tên của bạn khi luyện tập
              </label>
              <input
                id="shared-player-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBegin()}
                placeholder="Nhập tên của bạn..."
                className="w-full px-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleBegin}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Bắt đầu luyện tập ngay</span>
              </button>

              <button
                type="button"
                onClick={() => onShare(studySet)}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Sao chép link</span>
              </button>

              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
                <Headphones className="w-3.5 h-3.5" />
                <span>Không cần đăng nhập để luyện</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
