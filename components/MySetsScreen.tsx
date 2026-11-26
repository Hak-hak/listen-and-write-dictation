import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Copy,
  Edit3,
  FolderPlus,
  Globe,
  Link2,
  Lock,
  LogIn,
  Play,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { StudySet, StudySetVisibility } from '../types';
import {
  deleteStudySet,
  fetchStudySetById,
  forgetDeviceSet,
  formatStudySetDate,
  getDeviceSets,
  subscribeToUserStudySets,
} from '../services/studySetService';

interface MySetsScreenProps {
  user: User | null;
  onSignIn: () => Promise<void>;
  onCreateNew: () => void;
  onEditSet: (set: StudySet) => void;
  onCopySet: (set: StudySet) => void;
  onPlaySet: (set: StudySet) => void;
  onShareSet: (set: StudySet) => void;
}

const VISIBILITY_LABEL: Record<
  StudySetVisibility,
  { text: string; icon: React.ReactNode }
> = {
  public: { text: 'Công khai', icon: <Globe className="w-3.5 h-3.5" /> },
  unlisted: { text: 'Chỉ có link', icon: <Link2 className="w-3.5 h-3.5" /> },
  private: { text: 'Riêng tư', icon: <Lock className="w-3.5 h-3.5" /> },
};

const TOP_STRIP_COLORS = [
  'bg-gradient-to-r from-indigo-500 to-blue-500',
  'bg-gradient-to-r from-emerald-500 to-teal-500',
  'bg-gradient-to-r from-rose-500 to-pink-500',
  'bg-gradient-to-r from-amber-500 to-orange-500',
  'bg-gradient-to-r from-violet-500 to-purple-500',
  'bg-gradient-to-r from-cyan-500 to-sky-500',
];

export const MySetsScreen: React.FC<MySetsScreenProps> = ({
  user,
  onSignIn,
  onCreateNew,
  onEditSet,
  onCopySet,
  onPlaySet,
  onShareSet,
}) => {
  const [sets, setSets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deviceSets, setDeviceSets] = useState<StudySet[]>(getDeviceSets);
  const [deviceError, setDeviceError] = useState('');
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);

  // Load the latest version first, in case the set was changed on another device.
  const handleEditDeviceSet = async (set: StudySet) => {
    setBusyDeviceId(set.id);
    setDeviceError('');
    try {
      const latest = await fetchStudySetById(set.id);
      if (latest) {
        onEditSet(latest);
        return;
      }
      forgetDeviceSet(set.id);
      setDeviceSets(getDeviceSets());
      setDeviceError('Bộ câu hỏi này đã bị xóa.');
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : 'Không thể mở bộ câu hỏi.');
    }
    setBusyDeviceId(null);
  };

  const handleDeleteDeviceSet = async (set: StudySet) => {
    setBusyDeviceId(set.id);
    setDeviceError('');
    try {
      await deleteStudySet(set.id, set.ownerId);
      setDeviceSets(getDeviceSets());
      setConfirmDeleteId(null);
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : 'Không thể xóa bộ câu hỏi.');
    }
    setBusyDeviceId(null);
  };

  const deviceSection = (deviceSets.length > 0 || deviceError) && (
    <section className="mt-6 text-left">
      <h2 className="font-display text-lg font-bold text-slate-900">
        Bộ đã tạo trên máy này (không đăng nhập)
      </h2>
      <p className="text-xs text-slate-500 mt-0.5 mb-3">
        Danh sách chỉ lưu trong trình duyệt này. Hãy chép lại link để không bị mất.
      </p>
      {deviceError && (
        <div role="alert" className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {deviceError}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {deviceSets.map((set) => (
          <div
            key={set.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs"
          >
            <div>
              <p className="text-[11px] text-slate-500 mb-1">
                {set.category} · {set.items.length} câu · {formatStudySetDate(set.createdAt)}
              </p>
              <h3 className="font-display text-base font-bold text-slate-900 leading-snug">
                {set.title}
              </h3>
            </div>
            {confirmDeleteId === set.id ? (
              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-red-700">
                  Xóa vĩnh viễn? Link đã gửi sẽ không mở được.
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={busyDeviceId === set.id}
                    onClick={() => void handleDeleteDeviceSet(set)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    {busyDeviceId === set.id ? 'Đang xóa...' : 'Xóa'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPlaySet(set)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Luyện tập</span>
                </button>
                <button
                  type="button"
                  onClick={() => onShareSet(set)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Lấy link</span>
                </button>
                <button
                  type="button"
                  disabled={busyDeviceId === set.id}
                  onClick={() => void handleEditDeviceSet(set)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCopySet(set)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(set.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );

  useEffect(() => {
    if (!user) {
      setSets([]);
      return;
    }
    setLoading(true);
    setError('');
    const unsub = subscribeToUserStudySets(
      user.uid,
      (data) => {
        setSets(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const handleConfirmDelete = async (setId: string) => {
    setDeletingId(setId);
    try {
      await deleteStudySet(setId, user?.uid ?? '');
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xóa bộ câu hỏi.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-xl mx-auto py-8">
        <div className="bg-white border border-indigo-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-rose-500" />
          <div className="p-7 sm:p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <FolderPlus className="w-6 h-6" />
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Quản lý bộ câu hỏi của bạn
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
              Bạn tạo và chia sẻ bộ câu hỏi được ngay, không cần đăng nhập. Đăng nhập Google nếu muốn khóa bộ theo tài khoản và quản lý trên nhiều máy.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-6 py-2.5 mr-2 mb-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo bộ mới</span>
            </button>
            <button
              type="button"
              onClick={() => void onSignIn()}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập bằng Google</span>
            </button>
          </div>
        </div>
        {deviceSection}
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold text-indigo-700">
            Đồng bộ trực tiếp trên Firestore
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Bộ câu hỏi của tôi
          </h1>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-xs transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo bộ câu hỏi mới</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-white border border-slate-200 rounded-2xl p-4 animate-pulse"
            >
              <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
              <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="bg-white border border-indigo-100 rounded-2xl p-10 text-center shadow-xs">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-1.5">
            Bạn chưa có bộ câu hỏi nào
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-5">
            Hãy tạo bộ câu hỏi đầu tiên để luyện nghe chép chính tả và gửi đường dẫn cho bạn bè.
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bộ đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {sets.map((set, idx) => {
            const vis = VISIBILITY_LABEL[set.visibility];
            const isConfirming = confirmDeleteId === set.id;
            const topStrip = TOP_STRIP_COLORS[idx % TOP_STRIP_COLORS.length];

            return (
              <div
                key={set.id}
                className="bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs transition-colors"
              >
                <div className={`h-1.5 w-full ${topStrip}`} />
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1.5">
                      <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                        {vis.icon}
                        <span>{vis.text}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{set.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{set.itemCount} câu</span>
                    </div>

                    <h2 className="font-display text-base font-bold text-slate-900 leading-snug mb-1">
                      {set.title}
                    </h2>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {set.description || `Cập nhật ${formatStudySetDate(set.updatedAt)}`}
                    </p>
                  </div>

                  {isConfirming ? (
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-red-700">
                        Xóa vĩnh viễn?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === set.id}
                          onClick={() => void handleConfirmDelete(set.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                        >
                          {deletingId === set.id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onPlaySet(set)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Luyện tập</span>
                      </button>

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onShareSet(set)}
                          title="Chia sẻ link"
                          aria-label={`Chia sẻ ${set.title}`}
                          className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditSet(set)}
                          title="Chỉnh sửa"
                          aria-label={`Chỉnh sửa ${set.title}`}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(set.id)}
                          title="Xóa"
                          aria-label={`Xóa ${set.title}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {deviceSection}
    </div>
  );
};
