import React, { useEffect, useMemo, useState } from 'react';
import { Play, Plus, RefreshCw, Search, Share2 } from 'lucide-react';
import { STUDY_SET_CATEGORIES, StudySet } from '../types';
import { fetchPublicStudySets, formatStudySetDate } from '../services/studySetService';

interface CommunityScreenProps {
  onPlaySet: (set: StudySet) => void;
  onShareSet: (set: StudySet) => void;
  onCreateNew: () => void;
}

const CATEGORY_STRIP: Record<string, string> = {
  'Giao tiếp': 'bg-gradient-to-r from-sky-500 to-blue-500',
  'Ngữ pháp': 'bg-gradient-to-r from-emerald-500 to-teal-500',
  'IELTS & Học thuật': 'bg-gradient-to-r from-violet-500 to-indigo-500',
  'Từ vựng': 'bg-gradient-to-r from-amber-500 to-orange-500',
  'Khác': 'bg-gradient-to-r from-rose-500 to-pink-500',
};

export const CommunityScreen: React.FC<CommunityScreenProps> = ({
  onPlaySet,
  onShareSet,
  onCreateNew,
}) => {
  const [sets, setSets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');

  const loadSets = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPublicStudySets();
      setSets(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải danh sách cộng đồng.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSets();
  }, []);

  const filteredSets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sets.filter((s) => {
      const matchCat =
        selectedCategory === 'Tất cả' || s.category === selectedCategory;
      const matchText =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q);
      return matchCat && matchText;
    });
  }, [sets, search, selectedCategory]);

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Bài tập chia sẻ công khai từ cộng đồng
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Thư viện cộng đồng
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bài tập hoặc tác giả..."
              className="w-full sm:w-52 pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadSets()}
            aria-label="Làm mới danh sách"
            className="p-2 text-slate-600 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-xs transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Chia sẻ bộ mới</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 p-1 bg-white/80 border border-slate-200/80 rounded-xl mb-5 overflow-x-auto max-w-full">
        {['Tất cả', ...STUDY_SET_CATEGORIES].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
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
              <div className="h-3 w-32 bg-slate-200 rounded mb-3" />
              <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <h2 className="font-display text-lg font-bold text-slate-900 mb-1.5">
            Chưa có bộ câu hỏi công khai nào phù hợp
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-5">
            Hãy tạo một bộ câu hỏi luyện nghe và chọn chế độ &ldquo;Công khai&rdquo; để chia sẻ cho cộng đồng.
          </p>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bộ câu hỏi ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSets.map((set) => {
            const topStrip =
              CATEGORY_STRIP[set.category] ||
              'bg-gradient-to-r from-indigo-500 to-blue-500';
            return (
              <div
                key={set.id}
                className="bg-white border border-slate-200/90 hover:border-emerald-300 hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs"
              >
                <div className={`h-1.5 w-full ${topStrip}`} />
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1.5">
                      <span className="font-semibold text-emerald-700">
                        {set.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{set.itemCount} câu</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">Bởi {set.ownerName}</span>
                    </div>

                    <h2 className="font-display text-base font-bold text-slate-900 leading-snug mb-1">
                      {set.title}
                    </h2>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {set.description || `Cập nhật ${formatStudySetDate(set.updatedAt)}`}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onPlaySet(set)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Luyện tập</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onShareSet(set)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Chia sẻ</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
