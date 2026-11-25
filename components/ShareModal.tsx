import React, { useState } from 'react';
import { Check, Copy, Globe, Link2, Lock, Share2, X } from 'lucide-react';
import { StudySet, StudySetVisibility } from '../types';
import { getShareUrl, updateStudySetVisibility } from '../services/studySetService';

interface ShareModalProps {
  studySet: StudySet;
  isOwner: boolean;
  onClose: () => void;
  onVisibilityUpdated?: (setId: string, visibility: StudySetVisibility) => void;
}

const VISIBILITY_OPTIONS: {
  value: StudySetVisibility;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'unlisted',
    label: 'Chỉ người có link',
    desc: 'Ai có đường dẫn đều có thể luyện tập ngay.',
    icon: <Link2 className="w-4 h-4" />,
  },
  {
    value: 'public',
    label: 'Công khai',
    desc: 'Hiển thị trên mục Cộng đồng để mọi người tìm thấy.',
    icon: <Globe className="w-4 h-4" />,
  },
  {
    value: 'private',
    label: 'Riêng tư',
    desc: 'Chỉ mình bạn xem và luyện tập được.',
    icon: <Lock className="w-4 h-4" />,
  },
];

export const ShareModal: React.FC<ShareModalProps> = ({
  studySet,
  isOwner,
  onClose,
  onVisibilityUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState<StudySetVisibility>(studySet.visibility);
  const [updatingVis, setUpdatingVis] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const shareUrl = getShareUrl(studySet.id);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setErrorMsg('Không thể tự động sao chép. Hãy chọn và sao chép đường dẫn bên dưới.');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Luyện nghe & chép chính tả: ${studySet.title}`,
          text: `Cùng luyện tập ${studySet.itemCount} câu tiếng Anh trong bộ "${studySet.title}"!`,
          url: shareUrl,
        });
      } catch {
        // User canceled share sheet
      }
    }
  };

  const handleChangeVisibility = async (nextVis: StudySetVisibility) => {
    if (!isOwner || nextVis === visibility || updatingVis) return;
    setUpdatingVis(true);
    setErrorMsg('');
    try {
      await updateStudySetVisibility(studySet.id, nextVis);
      setVisibility(nextVis);
      onVisibilityUpdated?.(studySet.id, nextVis);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể cập nhật quyền chia sẻ.');
    } finally {
      setUpdatingVis(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-lg p-6 sm:p-8 text-left">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="share-modal-title" className="font-display text-xl font-bold text-slate-900">
              Chia sẻ bộ câu hỏi
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {studySet.title} · <span className="font-mono tabular-nums">{studySet.itemCount} câu</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại chia sẻ"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isOwner && (
          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Quyền truy cập liên kết
            </label>
            <div className="grid grid-cols-1 gap-2">
              {VISIBILITY_OPTIONS.map((opt) => {
                const active = visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={updatingVis}
                    onClick={() => handleChangeVisibility(opt.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-blue-600 bg-blue-50/70 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className={`mt-0.5 ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                      {opt.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {visibility === 'private' ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm mb-5">
            Bộ câu hỏi đang ở chế độ <strong>Riêng tư</strong>. Người khác mở liên kết sẽ không xem được nội dung cho đến khi bạn đổi sang &ldquo;Chỉ người có link&rdquo; hoặc &ldquo;Công khai&rdquo;.
          </div>
        ) : (
          <div className="mb-5">
            <label htmlFor="share-link-input" className="block text-xs font-medium text-slate-600 mb-2">
              Đường dẫn luyện tập trực tiếp
            </label>
            <div className="flex items-stretch gap-2">
              <input
                id="share-link-input"
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 px-3 py-2.5 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <p className="text-xs text-red-600 mb-4" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
          {typeof navigator !== 'undefined' && 'share' in navigator && visibility !== 'private' ? (
            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Gửi qua ứng dụng</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500">
              Người nhận không cần đăng nhập để luyện tập.
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-colors"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};
