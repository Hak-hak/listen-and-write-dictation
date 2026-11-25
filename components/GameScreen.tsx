import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Flame,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ErrorRecord, SentenceItem } from '../types';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { playErrorTone, playSuccessChime } from '../utils/soundEffects';
import { VoiceSelector } from './VoiceSelector';

interface GameScreenProps {
  sentences: SentenceItem[];
  topicName: string;
  onGameEnd: (result: {
    score: number;
    correctCount: number;
    errors: ErrorRecord[];
  }) => void;
  onBack: () => void;
}

function normalizeFlexible(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'’`]/g, '')
    .replace(/\s+/g, ' ');
}

export const GameScreen: React.FC<GameScreenProps> = ({
  sentences,
  topicName,
  onGameEnd,
  onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });
  const [isShaking, setIsShaking] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [errors, setErrors] = useState<ErrorRecord[]>([]);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(0.9);
  const [flexibleMode, setFlexibleMode] = useState<boolean>(false);
  const [sfxMuted, setSfxMuted] = useState<boolean>(false);

  const {
    isSpeaking,
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    speak,
    cancel,
  } = useSpeechSynthesis();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const nextSentenceTimeoutRef = useRef<number | null>(null);
  const rateRef = useRef(speechRate);
  rateRef.current = speechRate;

  const currentSentence = sentences[currentIndex];

  const startNewSentence = useCallback(
    (index: number) => {
      cancel();
      if (nextSentenceTimeoutRef.current) {
        window.clearTimeout(nextSentenceTimeoutRef.current);
      }

      if (index >= sentences.length) return;

      setCurrentIndex(index);
      setUserAnswer('');
      setMistakeCount(0);
      setFeedback({ type: null, text: '' });
      setIsShaking(false);
      setIsLocked(false);
      setIsHintVisible(false);
      window.setTimeout(() => inputRef.current?.focus(), 60);

      const sentenceToSpeak = sentences[index].en;
      speak(sentenceToSpeak, {
        rate: rateRef.current,
        onEnd: () => {
          speak(sentenceToSpeak, { rate: rateRef.current });
        },
      });
    },
    [sentences, cancel, speak]
  );

  useEffect(() => {
    setScore(0);
    setCompleted(0);
    setCorrectCount(0);
    setStreak(0);
    setErrors([]);
    startNewSentence(0);
    return () => {
      cancel();
      if (nextSentenceTimeoutRef.current) {
        window.clearTimeout(nextSentenceTimeoutRef.current);
      }
    };
  }, [sentences, startNewSentence, cancel]);

  const handleListenAgain = useCallback(() => {
    if (!currentSentence || isLocked) return;
    speak(currentSentence.en, { rate: speechRate });
  }, [currentSentence, isLocked, speak, speechRate]);

  const handlePreviewVoice = useCallback(
    (voiceURI: string) => {
      if (!currentSentence) return;
      speak(currentSentence.en, { rate: speechRate, voiceURI });
    },
    [currentSentence, speak, speechRate]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        handleListenAgain();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleListenAgain]);

  const handleCheckAnswer = useCallback(() => {
    if (isLocked || !currentSentence) return;

    const cleanedUserAnswer = userAnswer.trim();
    const correctAnswer = currentSentence.en.trim();
    const isLastSentence = currentIndex === sentences.length - 1;

    const isMatch = flexibleMode
      ? normalizeFlexible(cleanedUserAnswer) === normalizeFlexible(correctAnswer)
      : cleanedUserAnswer === correctAnswer;

    if (isMatch) {
      playSuccessChime(sfxMuted);
      setIsLocked(true);
      setFeedback({ type: 'success', text: 'Chính xác! +10 điểm.' });

      const newScore = score + 10;
      const newCorrectCount = correctCount + 1;
      const newCompleted = completed + 1;

      setScore(newScore);
      setCorrectCount(newCorrectCount);
      setCompleted(newCompleted);
      setStreak((s) => s + 1);
      cancel();

      speak(correctAnswer, {
        rate: speechRate,
        onEnd: () => {
          if (isLastSentence) {
            onGameEnd({ score: newScore, correctCount: newCorrectCount, errors });
          } else {
            nextSentenceTimeoutRef.current = window.setTimeout(
              () => startNewSentence(currentIndex + 1),
              1200
            );
          }
        },
      });
    } else {
      playErrorTone(sfxMuted);
      const newMistakeCount = mistakeCount + 1;
      setMistakeCount(newMistakeCount);
      setStreak(0);
      setIsShaking(true);
      window.setTimeout(() => setIsShaking(false), 500);

      if (newMistakeCount >= 3) {
        setIsLocked(true);
        setFeedback({
          type: 'error',
          text: `Đã sai 3 lần. Đáp án đúng: "${correctAnswer}"`,
        });

        const newErrors: ErrorRecord[] = [
          ...errors,
          {
            correctAnswer,
            userAnswer: cleanedUserAnswer,
            viHint: currentSentence.vi,
          },
        ];
        const newCompleted = completed + 1;

        setErrors(newErrors);
        setCompleted(newCompleted);
        cancel();

        if (isLastSentence) {
          nextSentenceTimeoutRef.current = window.setTimeout(
            () => onGameEnd({ score, correctCount, errors: newErrors }),
            2400
          );
        } else {
          nextSentenceTimeoutRef.current = window.setTimeout(
            () => startNewSentence(currentIndex + 1),
            3000
          );
        }
      } else {
        setFeedback({
          type: 'error',
          text: `Chưa chính xác (Lần thử ${newMistakeCount}/3)`,
        });
      }
    }
  }, [
    isLocked,
    currentSentence,
    userAnswer,
    currentIndex,
    sentences.length,
    flexibleMode,
    sfxMuted,
    score,
    correctCount,
    completed,
    errors,
    mistakeCount,
    speechRate,
    cancel,
    speak,
    onGameEnd,
    startNewSentence,
  ]);

  if (!currentSentence) {
    return (
      <div className="py-10 text-center text-slate-600">Đang chuẩn bị câu hỏi...</div>
    );
  }

  const progressPercent = Math.round((completed / sentences.length) * 100);
  const wordCount = currentSentence.en.trim().split(/\s+/).length;

  return (
    <div className="w-full max-w-2xl mx-auto py-4 sm:py-6">
      <div className="bg-white border border-indigo-100 rounded-3xl overflow-hidden shadow-sm text-left">
        {/* Compact Colorful Stage Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 text-white px-5 sm:px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/85 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Đổi chủ đề</span>
            </button>

            <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
              {streak >= 2 && (
                <span className="inline-flex items-center gap-1 text-amber-200 font-semibold">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{streak} liên tiếp</span>
                </span>
              )}
              <span>
                Câu {String(currentIndex + 1).padStart(2, '0')}/
                {String(sentences.length).padStart(2, '0')}
              </span>
              <span className="font-bold text-amber-200">{score} điểm</span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2.5">
            <span className="font-medium text-indigo-700 truncate max-w-[70%]">
              {topicName}
            </span>
            <span className="font-mono tabular-nums">{wordCount} từ</span>
          </div>

          {/* Meaning & Audio Visualizer Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-start gap-2.5">
              {currentSentence.emoji && (
                <span className="text-2xl select-none leading-none mt-0.5" aria-hidden="true">
                  {currentSentence.emoji}
                </span>
              )}
              <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                &ldquo;{currentSentence.vi}&rdquo;
              </h2>
            </div>

            <button
              type="button"
              onClick={handleListenAgain}
              disabled={isLocked}
              className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50 transition-colors self-start sm:self-auto shrink-0 cursor-pointer shadow-xs"
            >
              <div className="flex items-end gap-0.5 h-3.5 w-4 justify-center" aria-hidden="true">
                <span
                  className={`w-0.5 rounded-full bg-white origin-bottom ${
                    isSpeaking ? 'h-3.5 animate-eq-1' : 'h-1.5'
                  }`}
                />
                <span
                  className={`w-0.5 rounded-full bg-white origin-bottom ${
                    isSpeaking ? 'h-3.5 animate-eq-2' : 'h-3'
                  }`}
                />
                <span
                  className={`w-0.5 rounded-full bg-white origin-bottom ${
                    isSpeaking ? 'h-3.5 animate-eq-3' : 'h-2'
                  }`}
                />
                <span
                  className={`w-0.5 rounded-full bg-white origin-bottom ${
                    isSpeaking ? 'h-3.5 animate-eq-4' : 'h-2.5'
                  }`}
                />
              </div>
              <span className="text-xs font-semibold whitespace-nowrap">
                {isSpeaking ? 'Đang đọc...' : 'Nghe lại'}
              </span>
            </button>
          </div>

          <div className="relative mb-3">
            <label htmlFor="dictation-input" className="sr-only">
              Nhập câu tiếng Anh bạn nghe được
            </label>
            <input
              id="dictation-input"
              ref={inputRef}
              type="text"
              placeholder="Gõ chính xác câu tiếng Anh bạn nghe được..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckAnswer()}
              disabled={isLocked}
              className={`w-full px-4 py-3.5 text-base sm:text-lg text-slate-900 bg-slate-50 border-2 rounded-xl focus:outline-none focus:bg-white transition-colors ${
                isShaking ? 'animate-shake' : ''
              } ${
                feedback.type === 'success'
                  ? 'border-emerald-500 bg-emerald-50/40 focus:ring-3 focus:ring-emerald-100'
                  : feedback.type === 'error'
                  ? 'border-rose-500 bg-rose-50/40 focus:ring-3 focus:ring-rose-100'
                  : 'border-indigo-200 focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100'
              }`}
            />

            {isHintVisible && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-900 text-white text-sm font-medium select-none flex items-center justify-between gap-2">
                <span>{currentSentence.en}</span>
                <span className="text-[11px] font-mono text-amber-300 shrink-0">
                  Gợi ý
                </span>
              </div>
            )}
          </div>

          <div className="min-h-[24px] mb-4 flex items-center gap-2">
            {feedback.type === 'success' && (
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{feedback.text}</span>
              </div>
            )}
            {feedback.type === 'error' && (
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{feedback.text}</span>
              </div>
            )}
          </div>

          {/* Primary Colorful Action Row */}
          <div className="flex flex-wrap items-center gap-2.5 mb-5">
            <button
              type="button"
              onClick={handleCheckAnswer}
              disabled={isLocked}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kiểm tra</span>
            </button>

            <button
              type="button"
              disabled={isLocked}
              onMouseDown={() => setIsHintVisible(true)}
              onMouseUp={() => setIsHintVisible(false)}
              onMouseLeave={() => setIsHintVisible(false)}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsHintVisible(true);
              }}
              onTouchEnd={() => setIsHintVisible(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-amber-950 bg-amber-300 hover:bg-amber-400 disabled:opacity-50 rounded-xl transition-colors select-none cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Giữ xem gợi ý</span>
            </button>

            <div className="ml-auto">
              <VoiceSelector
                voices={voices}
                selectedVoiceURI={selectedVoiceURI}
                onSelectVoice={setSelectedVoiceURI}
                onPreviewVoice={handlePreviewVoice}
              />
            </div>
          </div>

          {/* Compact Bottom Settings */}
          <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Tốc độ:</span>
              <div className="inline-flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
                {[0.75, 0.9, 1.0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setSpeechRate(rate)}
                    className={`px-2 py-1 rounded-md font-mono tabular-nums transition-colors cursor-pointer ${
                      speechRate === rate
                        ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={flexibleMode}
                  onChange={(e) => setFlexibleMode(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Bỏ qua hoa/dấu</span>
              </label>

              <button
                type="button"
                onClick={() => setSfxMuted((m) => !m)}
                aria-label={sfxMuted ? 'Bật hiệu ứng âm thanh' : 'Tắt hiệu ứng âm thanh'}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                {sfxMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                <span>Âm báo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
