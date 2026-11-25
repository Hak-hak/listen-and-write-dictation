import React from 'react';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { ErrorRecord } from '../types';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

interface ReviewErrorsScreenProps {
  errors: ErrorRecord[];
  onBack: () => void;
}

export const ReviewErrorsScreen: React.FC<ReviewErrorsScreenProps> = ({
  errors,
  onBack,
}) => {
  const { speak } = useSpeechSynthesis();

  const renderDiff = (correct: string, user: string) => {
    const diff: React.ReactNode[] = [];
    const maxLength = Math.max(correct.length, user.length);
    for (let i = 0; i < maxLength; i++) {
      if (correct[i] !== user[i]) {
        diff.push(
          <span
            key={i}
            className="font-semibold text-red-700 underline decoration-red-500 bg-red-100 px-0.5 rounded-sm"
          >
            {user[i] || '_'}
          </span>
        );
      } else {
        diff.push(<span key={i}>{user[i]}</span>);
      }
    }
    return diff;
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-8 text-left">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Xem lại các câu sai ({errors.length})
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              So sánh từng ký tự để ghi nhớ chính tả chính xác hơn.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
        </div>

        <ul className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto pr-1">
          {errors.map((error, index) => (
            <li key={index} className="py-5 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  {error.viHint && (
                    <p className="text-xs text-slate-500 italic">&ldquo;{error.viHint}&rdquo;</p>
                  )}
                  <div>
                    <span className="text-xs font-medium text-emerald-700 block mb-0.5">
                      Đáp án đúng
                    </span>
                    <p className="text-base sm:text-lg font-medium text-slate-900 break-words">
                      {error.correctAnswer}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-red-700 block mb-0.5">
                      Câu bạn đã nhập
                    </span>
                    <p className="text-base sm:text-lg text-slate-700 break-words font-mono">
                      {error.userAnswer
                        ? renderDiff(error.correctAnswer, error.userAnswer)
                        : '(Để trống)'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => speak(error.correctAnswer)}
                  aria-label="Nghe lại đáp án đúng"
                  className="p-2.5 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
