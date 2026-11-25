import React, { useState } from 'react';
import { Award, ListRestart, RotateCcw, Share2 } from 'lucide-react';
import { GameResult } from '../types';
import { Fireworks } from './Fireworks';
import trophyImg from '../src/assets/images/trophy_celebration_1795606531898.jpg';

interface CongratsScreenProps {
  result: GameResult;
  playerName: string;
  topicName: string;
  canShare?: boolean;
  onShare?: () => void;
  onPlayAgain: () => void;
  onSelectTopic: () => void;
  onReviewErrors: () => void;
}

export const CongratsScreen: React.FC<CongratsScreenProps> = ({
  result,
  playerName,
  topicName,
  canShare,
  onShare,
  onPlayAgain,
  onSelectTopic,
  onReviewErrors,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const accuracy =
    result.total > 0 ? Math.round((result.correctCount / result.total) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto py-8 sm:py-12">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 text-center shadow-xs">
        <div className="w-28 h-28 mx-auto mb-4 flex items-center justify-center">
          {!imgFailed ? (
            <img
              src={trophyImg}
              alt="Cúp thành tích hoàn thành bài luyện tập"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-28 h-28 object-contain"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>
          )}
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Xuất sắc, {playerName}!
        </h2>
        <p className="text-sm sm:text-base text-slate-600 mb-8">
          Bạn đã hoàn thành chủ đề{' '}
          <span className="font-semibold text-slate-900">{topicName}</span>
        </p>

        <div className="grid grid-cols-3 gap-4 border-y border-slate-100 py-6 mb-8">
          <div>
            <div className="text-xs text-slate-500 mb-1">Điểm số</div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-blue-700 font-mono tabular-nums">
              {result.score}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Số câu đúng</div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-emerald-700 font-mono tabular-nums">
              {result.correctCount}/{result.total}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Độ chính xác</div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {accuracy}%
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3">
          {result.errors.length > 0 && (
            <button
              type="button"
              onClick={onReviewErrors}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer"
            >
              <span>Xem lại lỗi sai ({result.errors.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Luyện lại bộ này</span>
          </button>

          {canShare && onShare && (
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Chia sẻ bài tập</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSelectTopic}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ListRestart className="w-4 h-4" />
            <span>Chọn chủ đề khác</span>
          </button>
        </div>
      </div>

      <Fireworks />
    </div>
  );
};
