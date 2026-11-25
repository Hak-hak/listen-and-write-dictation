import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Mic, Volume2 } from 'lucide-react';
import { formatVoiceLabel } from '../hooks/useSpeechSynthesis';

interface VoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  onSelectVoice: (uri: string) => void;
  onPreviewVoice?: (uri: string) => void;
  compact?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoiceURI,
  onSelectVoice,
  onPreviewVoice,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const activeVoice =
    voices.find((v) => v.voiceURI === selectedVoiceURI) || voices[0] || null;

  const buttonLabel = activeVoice
    ? formatVoiceLabel(activeVoice)
    : 'Mặc định (en-US)';

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Chọn giọng đọc tiếng Anh"
        className={`inline-flex items-center gap-2 rounded-xl border font-medium transition-colors cursor-pointer whitespace-nowrap ${
          compact
            ? 'px-3 py-1.5 text-xs bg-white border-slate-200 hover:border-violet-400 text-slate-700'
            : 'px-3.5 py-2 text-xs bg-violet-50 border-violet-200 hover:bg-violet-100 text-violet-900'
        }`}
      >
        <Mic className="w-3.5 h-3.5 text-violet-600 shrink-0" />
        <span className="max-w-[170px] truncate">{buttonLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Danh sách giọng đọc tiếng Anh"
          className="absolute right-0 mt-2 w-72 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-lg p-1.5 z-40"
        >
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 border-b border-slate-100 mb-1">
            Chọn giọng đọc tiếng Anh ({voices.length || 1})
          </div>

          {voices.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-slate-600">
              Trình duyệt đang dùng giọng mặc định (en-US).
            </div>
          ) : (
            voices.map((voice) => {
              const isSelected = voice.voiceURI === (activeVoice?.voiceURI ?? '');
              return (
                <div
                  key={voice.voiceURI}
                  className={`flex items-center justify-between gap-1 rounded-xl px-2.5 py-2 text-xs transition-colors ${
                    isSelected
                      ? 'bg-violet-50 text-violet-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectVoice(voice.voiceURI);
                      onPreviewVoice?.(voice.voiceURI);
                      setOpen(false);
                    }}
                    className="flex-1 flex items-center gap-2 text-left min-w-0 cursor-pointer"
                  >
                    <span className="w-4 shrink-0 text-violet-600">
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className="truncate">{formatVoiceLabel(voice)}</span>
                  </button>

                  {onPreviewVoice && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewVoice(voice.voiceURI);
                      }}
                      title="Nghe thử giọng này"
                      aria-label={`Nghe thử ${voice.name}`}
                      className="p-1.5 text-slate-400 hover:text-violet-700 hover:bg-violet-100 rounded-lg transition-colors shrink-0 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
