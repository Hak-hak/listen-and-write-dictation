import { useCallback, useEffect, useMemo, useState } from 'react';

interface SpeakOptions {
  rate?: number;
  voiceURI?: string;
  onEnd?: () => void;
}

const STORAGE_KEY = 'listen_spell_voice_uri';

function sortEnglishVoices(list: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const enVoices = list.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const score = (v: SpeechSynthesisVoice): number => {
    let s = 0;
    const lang = v.lang.toLowerCase();
    if (lang === 'en-us' || lang === 'en_us') s += 30;
    else if (lang === 'en-gb' || lang === 'en_gb') s += 25;
    else if (lang === 'en-au' || lang === 'en_au') s += 20;
    if (/natural|google|samantha|daniel|karen|serena|aria|jenny|guy/i.test(v.name)) {
      s += 15;
    }
    if (v.default) s += 5;
    return s;
  };
  return [...enVoices].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

export function formatVoiceLabel(voice: SpeechSynthesisVoice): string {
  const lang = voice.lang.toUpperCase();
  const cleanName = voice.name
    .replace(/^Microsoft\s+/i, '')
    .replace(/^Google\s+/i, 'Google ')
    .replace(/\s*Online\s*\(Natural\)\s*/i, ' ')
    .replace(/\s*-\s*English.*$/i, '')
    .trim();
  return `${cleanName} (${lang})`;
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  useEffect(() => {
    if (!synth) return;

    const loadVoices = () => {
      const raw = synth.getVoices();
      const sorted = sortEnglishVoices(raw);
      setVoices(sorted);
      setSelectedVoiceURIState((current) => {
        if (current && sorted.some((v) => v.voiceURI === current)) {
          return current;
        }
        return sorted[0]?.voiceURI || '';
      });
    };

    loadVoices();
    synth.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      synth.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, [synth]);

  const setSelectedVoiceURI = useCallback((uri: string) => {
    setSelectedVoiceURIState(uri);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, uri);
      } catch {
        // Ignore storage restrictions
      }
    }
  }, []);

  const selectedVoice = useMemo(() => {
    if (!voices.length) return null;
    return voices.find((v) => v.voiceURI === selectedVoiceURI) || voices[0] || null;
  }, [voices, selectedVoiceURI]);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (!synth) {
        if (options.onEnd) options.onEnd();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const targetVoice = options.voiceURI
        ? voices.find((v) => v.voiceURI === options.voiceURI) || selectedVoice
        : selectedVoice;

      if (targetVoice) {
        utterance.voice = targetVoice;
        utterance.lang = targetVoice.lang;
      } else {
        utterance.lang = 'en-US';
      }

      utterance.rate = options.rate ?? 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (options.onEnd) options.onEnd();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        if (options.onEnd) options.onEnd();
      };

      if (synth.speaking) {
        synth.cancel();
      }

      window.setTimeout(() => {
        try {
          synth.speak(utterance);
        } catch {
          setIsSpeaking(false);
          if (options.onEnd) options.onEnd();
        }
      }, 90);
    },
    [synth, voices, selectedVoice]
  );

  const cancel = useCallback(() => {
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, [synth]);

  useEffect(() => {
    return () => cancel();
  }, [cancel]);

  return {
    isSpeaking,
    voices,
    selectedVoice,
    selectedVoiceURI,
    setSelectedVoiceURI,
    speak,
    cancel,
  };
}
