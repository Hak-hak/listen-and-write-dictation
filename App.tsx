import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';
import { auth, googleProvider } from './firebase';
import { BUILTIN_TOPICS } from './constants';
import {
  ErrorRecord,
  GameResult,
  GameState,
  SentenceItem,
  StudySet,
  StudySetVisibility,
} from './types';
import { fetchStudySetById } from './services/studySetService';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { StartScreen } from './components/StartScreen';
import { TopicSelectionScreen } from './components/TopicSelectionScreen';
import { MySetsScreen } from './components/MySetsScreen';
import { CommunityScreen } from './components/CommunityScreen';
import { CreateSetScreen } from './components/CreateSetScreen';
import { SharedIntroScreen } from './components/SharedIntroScreen';
import { GameScreen } from './components/GameScreen';
import { CongratsScreen } from './components/CongratsScreen';
import { ReviewErrorsScreen } from './components/ReviewErrorsScreen';
import { ShareModal } from './components/ShareModal';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [playerName, setPlayerName] = useState<string>('Bạn');

  const [activeTopicName, setActiveTopicName] = useState<string>('');
  const [activeSentences, setActiveSentences] = useState<SentenceItem[]>([]);
  const [activeStudySet, setActiveStudySet] = useState<StudySet | null>(null);
  const [returnState, setReturnState] = useState<GameState>(GameState.TOPIC_SELECTION);

  const [editingSet, setEditingSet] = useState<StudySet | null>(null);
  const [shareModalSet, setShareModalSet] = useState<StudySet | null>(null);

  const [sharedSet, setSharedSet] = useState<StudySet | null>(null);
  const [sharedLoading, setSharedLoading] = useState<boolean>(false);
  const [sharedError, setSharedError] = useState<string>('');

  const [gameResult, setGameResult] = useState<GameResult>({
    score: 0,
    total: 0,
    correctCount: 0,
    errors: [],
  });

  const { cancel: cancelSpeech } = useSpeechSynthesis();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser?.displayName) {
        setPlayerName((prev) => (prev === 'Bạn' ? firebaseUser.displayName || 'Bạn' : prev));
      }
    });
    return () => unsub();
  }, []);

  const loadSharedSetFromUrl = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const setId = params.get('set');
    if (!setId) return;

    setGameState(GameState.SHARED_INTRO);
    setSharedLoading(true);
    setSharedError('');
    try {
      const loaded = await fetchStudySetById(setId);
      if (!loaded) {
        setSharedSet(null);
        setSharedError(
          'Bộ câu hỏi này không tồn tại hoặc đã bị xóa.'
        );
      } else {
        setSharedSet(loaded);
      }
    } catch (err) {
      setSharedSet(null);
      const raw = err instanceof Error ? err.message : '';
      if (raw.includes('Missing or insufficient permissions')) {
        setSharedError(
          'Bộ câu hỏi này đang được đặt ở chế độ Riêng tư bởi tác giả.'
        );
      } else {
        setSharedError('Không thể tải bộ câu hỏi từ liên kết chia sẻ.');
      }
    } finally {
      setSharedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSharedSetFromUrl();
  }, [loadSharedSetFromUrl]);

  const clearSetQueryParam = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has('set')) {
      url.searchParams.delete('set');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const navigateTo = useCallback(
    (nextState: GameState) => {
      cancelSpeech();
      clearSetQueryParam();
      setGameState(nextState);
    },
    [cancelSpeech, clearSetQueryParam]
  );

  const handleSignIn = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
  }, []);

  const handleStartFromHome = useCallback(
    (name: string) => {
      setPlayerName(name);
      navigateTo(GameState.TOPIC_SELECTION);
    },
    [navigateTo]
  );

  const handleSelectBuiltinTopic = useCallback(
    (topic: string) => {
      const items = BUILTIN_TOPICS[topic];
      if (!items) return;
      clearSetQueryParam();
      setActiveTopicName(topic);
      setActiveSentences(items);
      setActiveStudySet(null);
      setReturnState(GameState.TOPIC_SELECTION);
      setGameState(GameState.GAME);
    },
    [clearSetQueryParam]
  );

  const handlePlayStudySet = useCallback(
    (set: StudySet, origin: GameState, customName?: string) => {
      if (customName) setPlayerName(customName);
      setActiveTopicName(set.title);
      setActiveSentences(set.items);
      setActiveStudySet(set);
      setReturnState(origin);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('set', set.id);
        window.history.replaceState({}, '', url.toString());
      }
      setGameState(GameState.GAME);
    },
    []
  );

  const handleGameEnd = useCallback(
    (result: { score: number; correctCount: number; errors: ErrorRecord[] }) => {
      setGameResult({
        ...result,
        total: activeSentences.length,
      });
      setGameState(GameState.CONGRATS);
    },
    [activeSentences.length]
  );

  const handleBackFromGame = useCallback(() => {
    cancelSpeech();
    if (returnState !== GameState.SHARED_INTRO) {
      clearSetQueryParam();
    }
    setGameState(returnState);
  }, [cancelSpeech, clearSetQueryParam, returnState]);

  const handleOpenCreate = useCallback(() => {
    cancelSpeech();
    clearSetQueryParam();
    setEditingSet(null);
    setGameState(GameState.CREATE_SET);
  }, [cancelSpeech, clearSetQueryParam]);

  const handleEditSet = useCallback(
    (set: StudySet) => {
      cancelSpeech();
      clearSetQueryParam();
      setEditingSet(set);
      setGameState(GameState.CREATE_SET);
    },
    [cancelSpeech, clearSetQueryParam]
  );

  const handleSetSaved = useCallback((savedSet: StudySet, isNew: boolean) => {
    setEditingSet(null);
    setGameState(GameState.MY_SETS);
    if (isNew) {
      setShareModalSet(savedSet);
    }
  }, []);

  const handleVisibilityUpdated = useCallback(
    (setId: string, visibility: StudySetVisibility) => {
      setShareModalSet((prev) =>
        prev && prev.id === setId ? { ...prev, visibility } : prev
      );
      setActiveStudySet((prev) =>
        prev && prev.id === setId ? { ...prev, visibility } : prev
      );
      setSharedSet((prev) =>
        prev && prev.id === setId ? { ...prev, visibility } : prev
      );
    },
    []
  );

  const shortDisplayName = user?.displayName?.split(' ').slice(-2).join(' ') || 'Tài khoản';

  const renderMainContent = () => {
    switch (gameState) {
      case GameState.START:
        return (
          <StartScreen
            initialName={playerName === 'Bạn' ? '' : playerName}
            onStart={handleStartFromHome}
            onGoToCreate={handleOpenCreate}
            onGoToCommunity={() => navigateTo(GameState.COMMUNITY)}
          />
        );
      case GameState.TOPIC_SELECTION:
        return (
          <TopicSelectionScreen
            playerName={playerName}
            onSelectTopic={handleSelectBuiltinTopic}
            onCreateNew={handleOpenCreate}
          />
        );
      case GameState.MY_SETS:
        return (
          <MySetsScreen
            user={user}
            onSignIn={handleSignIn}
            onCreateNew={handleOpenCreate}
            onEditSet={handleEditSet}
            onPlaySet={(set) => handlePlayStudySet(set, GameState.MY_SETS)}
            onShareSet={(set) => setShareModalSet(set)}
          />
        );
      case GameState.COMMUNITY:
        return (
          <CommunityScreen
            onPlaySet={(set) => handlePlayStudySet(set, GameState.COMMUNITY)}
            onShareSet={(set) => setShareModalSet(set)}
            onCreateNew={handleOpenCreate}
          />
        );
      case GameState.CREATE_SET:
        return (
          <CreateSetScreen
            user={user}
            editingSet={editingSet}
            onSignIn={handleSignIn}
            onSaved={handleSetSaved}
            onCancel={() =>
              navigateTo(user ? GameState.MY_SETS : GameState.TOPIC_SELECTION)
            }
          />
        );
      case GameState.SHARED_INTRO:
        return (
          <SharedIntroScreen
            studySet={sharedSet}
            loading={sharedLoading}
            error={sharedError}
            defaultPlayerName={playerName === 'Bạn' ? '' : playerName}
            onStartPractice={(name) => {
              if (sharedSet) {
                handlePlayStudySet(sharedSet, GameState.SHARED_INTRO, name);
              }
            }}
            onShare={(set) => setShareModalSet(set)}
            onGoHome={() => navigateTo(GameState.TOPIC_SELECTION)}
          />
        );
      case GameState.GAME:
        return (
          <GameScreen
            sentences={activeSentences}
            topicName={activeTopicName}
            onGameEnd={handleGameEnd}
            onBack={handleBackFromGame}
          />
        );
      case GameState.CONGRATS:
        return (
          <CongratsScreen
            result={gameResult}
            playerName={playerName}
            topicName={activeTopicName}
            canShare={Boolean(activeStudySet && activeStudySet.visibility !== 'private')}
            onShare={() => activeStudySet && setShareModalSet(activeStudySet)}
            onPlayAgain={() => setGameState(GameState.GAME)}
            onSelectTopic={handleBackFromGame}
            onReviewErrors={() => setGameState(GameState.REVIEW_ERRORS)}
          />
        );
      case GameState.REVIEW_ERRORS:
        return (
          <ReviewErrorsScreen
            errors={gameResult.errors}
            onBack={() => setGameState(GameState.CONGRATS)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50/45 to-rose-50 text-slate-900 flex flex-col">
      <header className="bg-white/90 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => navigateTo(GameState.START)}
            className="font-display text-lg font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-blue-600 to-rose-500 bg-clip-text text-transparent whitespace-nowrap shrink-0 hover:opacity-85 transition-opacity cursor-pointer"
          >
            Listen &amp; Spell
          </button>

          <nav
            aria-label="Điều hướng chính"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => navigateTo(GameState.TOPIC_SELECTION)}
              className={`whitespace-nowrap shrink-0 hover:text-indigo-700 hover:underline underline-offset-8 decoration-2 transition-colors cursor-pointer ${
                gameState === GameState.TOPIC_SELECTION
                  ? 'text-indigo-700 font-semibold underline decoration-indigo-600'
                  : ''
              }`}
            >
              Chủ đề sẵn
            </button>
            <button
              type="button"
              onClick={() => navigateTo(GameState.MY_SETS)}
              className={`whitespace-nowrap shrink-0 hover:text-indigo-700 hover:underline underline-offset-8 decoration-2 transition-colors cursor-pointer ${
                gameState === GameState.MY_SETS
                  ? 'text-indigo-700 font-semibold underline decoration-indigo-600'
                  : ''
              }`}
            >
              Bộ của tôi
            </button>
            <button
              type="button"
              onClick={() => navigateTo(GameState.COMMUNITY)}
              className={`whitespace-nowrap shrink-0 hover:text-indigo-700 hover:underline underline-offset-8 decoration-2 transition-colors cursor-pointer ${
                gameState === GameState.COMMUNITY
                  ? 'text-indigo-700 font-semibold underline decoration-indigo-600'
                  : ''
              }`}
            >
              Cộng đồng
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className={`whitespace-nowrap shrink-0 hover:text-indigo-700 hover:underline underline-offset-8 decoration-2 transition-colors cursor-pointer ${
                gameState === GameState.CREATE_SET
                  ? 'text-indigo-700 font-semibold underline decoration-indigo-600'
                  : ''
              }`}
            >
              Tạo bài mới
            </button>
          </nav>

          <div className="shrink-0">
            {!authReady ? (
              <div className="h-8 w-24 bg-slate-100 rounded-xl animate-pulse" />
            ) : user ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                title="Đăng xuất tài khoản Google"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="max-w-[110px] truncate">{shortDisplayName}</span>
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-xs transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>

        <nav
          aria-label="Điều hướng di động"
          className="md:hidden border-t border-slate-100 px-4 py-1.5 flex items-center gap-4 overflow-x-auto text-xs font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => navigateTo(GameState.TOPIC_SELECTION)}
            className={`whitespace-nowrap shrink-0 ${
              gameState === GameState.TOPIC_SELECTION ? 'text-indigo-700 font-semibold' : ''
            }`}
          >
            Chủ đề sẵn
          </button>
          <button
            type="button"
            onClick={() => navigateTo(GameState.MY_SETS)}
            className={`whitespace-nowrap shrink-0 ${
              gameState === GameState.MY_SETS ? 'text-indigo-700 font-semibold' : ''
            }`}
          >
            Bộ của tôi
          </button>
          <button
            type="button"
            onClick={() => navigateTo(GameState.COMMUNITY)}
            className={`whitespace-nowrap shrink-0 ${
              gameState === GameState.COMMUNITY ? 'text-indigo-700 font-semibold' : ''
            }`}
          >
            Cộng đồng
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className={`whitespace-nowrap shrink-0 ${
              gameState === GameState.CREATE_SET ? 'text-indigo-700 font-semibold' : ''
            }`}
          >
            Tạo bài mới
          </button>
        </nav>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6">{renderMainContent()}</main>

      <footer className="border-t border-indigo-100/80 bg-white/75 mt-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">
            Listen &amp; Spell — Luyện nghe &amp; viết chính tả tiếng Anh
          </span>
          <span>Tự tạo bộ câu hỏi và chia sẻ liên kết luyện tập</span>
        </div>
      </footer>

      {shareModalSet && (
        <ShareModal
          studySet={shareModalSet}
          isOwner={Boolean(user && user.uid === shareModalSet.ownerId)}
          onClose={() => setShareModalSet(null)}
          onVisibilityUpdated={handleVisibilityUpdated}
        />
      )}
    </div>
  );
}

export default App;
