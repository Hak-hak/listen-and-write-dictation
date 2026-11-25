import React, { useMemo, useState } from 'react';
import { Play, Plus, Search } from 'lucide-react';
import { BUILTIN_TOPICS } from '../constants';

interface TopicSelectionScreenProps {
  playerName: string;
  onSelectTopic: (topic: string) => void;
  onCreateNew: () => void;
}

const CARD_GRADIENTS = [
  'from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700',
  'from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
  'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
  'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700',
  'from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700',
  'from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700',
  'from-fuchsia-500 to-rose-600 hover:from-fuchsia-600 hover:to-rose-700',
  'from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700',
];

export const TopicSelectionScreen: React.FC<TopicSelectionScreenProps> = ({
  playerName,
  onSelectTopic,
  onCreateNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const topicEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return Object.entries(BUILTIN_TOPICS).filter(([name]) =>
      name.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold text-indigo-700">
            Xin chào {playerName} · {topicEntries.length} chủ đề ngữ pháp
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Chọn chủ đề luyện tập
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm chủ đề..."
              className="w-full sm:w-52 pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-xs transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo bộ mới</span>
          </button>
        </div>
      </div>

      {topicEntries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-sm font-medium text-slate-700 mb-2">
            Không tìm thấy chủ đề phù hợp với &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
          >
            Xem tất cả chủ đề
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topicEntries.map(([topic, sentences], index) => {
            const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
            const emoji = sentences[0]?.emoji || '📘';
            return (
              <button
                key={topic}
                type="button"
                onClick={() => onSelectTopic(topic)}
                className={`group bg-gradient-to-br ${gradient} text-white rounded-2xl p-4 text-left shadow-sm hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 cursor-pointer`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl leading-none select-none" aria-hidden="true">
                    {emoji}
                  </span>
                  <span className="text-xs font-mono text-white/90 tabular-nums">
                    {sentences.length} câu
                  </span>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <h2 className="font-display text-base font-bold leading-snug">
                    {topic}
                  </h2>
                  <Play className="w-4 h-4 fill-current shrink-0 opacity-85 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
