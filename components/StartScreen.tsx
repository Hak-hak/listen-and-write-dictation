import React, { useMemo, useState } from 'react';
import { ArrowRight, FolderPlus, Globe, Headphones } from 'lucide-react';
import { BUILTIN_TOPICS } from '../constants';
import heroStudioImg from '../src/assets/images/hero_language_studio_1795606531579.jpg';

interface StartScreenProps {
  initialName?: string;
  onStart: (playerName: string) => void;
  onGoToCreate: () => void;
  onGoToCommunity: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  initialName = '',
  onStart,
  onGoToCreate,
  onGoToCommunity,
}) => {
  const [playerName, setPlayerName] = useState(initialName);
  const [error, setError] = useState('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const totalBuiltinSentences = useMemo(
    () => Object.values(BUILTIN_TOPICS).reduce((sum, list) => sum + list.length, 0),
    []
  );
  const totalBuiltinTopics = useMemo(() => Object.keys(BUILTIN_TOPICS).length, []);

  const handleStart = () => {
    const trimmed = playerName.trim();
    if (trimmed) {
      onStart(trimmed);
    } else {
      setError('Vui lòng nhập tên của bạn để bắt đầu.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-5 sm:py-8 space-y-4">
      <section className="bg-white border border-indigo-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between text-left gap-6">
            <div>
              <p className="text-xs font-semibold text-indigo-700 mb-2">
                {totalBuiltinTopics} chuyên đề · {totalBuiltinSentences}+ câu mẫu · Lưu trữ Firestore
              </p>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-[1.15] [text-wrap:balance] mb-3">
                Nghe chuẩn từng câu, luyện viết chính tả và chia sẻ bài tập
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Luyện phản xạ nghe – gõ tiếng Anh với nhiều giọng đọc bản ngữ, hoặc tự soạn bộ câu hỏi riêng và gửi liên kết cho mọi người cùng học.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="player-name-input"
                  type="text"
                  aria-label="Tên người luyện tập"
                  placeholder="Nhập tên của bạn để bắt đầu..."
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (error) setError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  className="flex-1 min-w-0 px-4 py-3 text-sm sm:text-base text-slate-900 bg-slate-50 border-2 border-indigo-100 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={handleStart}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 rounded-xl shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Bắt đầu ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {error && (
                <p className="text-xs sm:text-sm text-red-600 font-medium" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[220px] bg-indigo-50">
            {!heroImgFailed ? (
              <img
                src={heroStudioImg}
                alt="Không gian bàn học luyện nghe và viết tiếng Anh"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="w-full h-full object-cover lg:absolute lg:inset-0"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-100 via-sky-100 to-rose-100 text-indigo-800">
                <Headphones className="w-10 h-10 mb-2" />
                <p className="text-xs font-semibold">Luyện nghe &amp; chính tả</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onGoToCreate}
          className="group bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-2xl p-5 text-left flex items-center justify-between gap-4 shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold leading-snug">
                Tạo bộ câu hỏi &amp; gửi link
              </h2>
              <p className="text-xs text-violet-100 truncate">
                Lưu lên Firestore và chia sẻ cho bạn bè luyện tập
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={onGoToCommunity}
          className="group bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl p-5 text-left flex items-center justify-between gap-4 shadow-sm transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold leading-snug">
                Khám phá thư viện cộng đồng
              </h2>
              <p className="text-xs text-emerald-50 truncate">
                Luyện thêm các chủ đề do người dùng khác chia sẻ
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>
      </section>
    </div>
  );
};
