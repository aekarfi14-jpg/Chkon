import { useState, useEffect, useMemo, useCallback } from 'react';
import { Group, Person, Answer } from './data/models/types';
import { db } from './data/repository/database';
import { DeductionEngine, GameState } from './core/deduction/deductionEngine';
import { Header } from './shared/ui/Header';
import { GameStartScreen } from './game/screens/GameStartScreen';
import { GamePlayScreen } from './game/screens/GamePlayScreen';
import { GuessScreen } from './game/screens/GuessScreen';
import { VictoryScreen } from './game/screens/VictoryScreen';
import { AmbiguousScreen } from './game/screens/AmbiguousScreen';
import { CreatorDashboard } from './creator/screens/CreatorDashboard';

type AppScreen = 'start' | 'playing' | 'guessing' | 'victory' | 'ambiguous';

export default function App() {
  const [currentMode, setCurrentMode] = useState<'game' | 'creator'>('game');
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [people, setPeople] = useState<Person[]>([]);

  // Game specific state
  const [screen, setScreen] = useState<AppScreen>('start');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [engine, setEngine] = useState<DeductionEngine | null>(null);
  const [confirmedPerson, setConfirmedPerson] = useState<Person | null>(null);

  // Load data on start
  const refreshData = useCallback(() => {
    const loadedGroups = db.getGroups();
    setGroups(loadedGroups);

    let currentGroup = loadedGroups.find((g) => g.id === activeGroupId);
    if (!currentGroup && loadedGroups.length > 0) {
      currentGroup = loadedGroups[0];
      setActiveGroupId(currentGroup.id);
    }

    if (currentGroup) {
      const loadedPeople = db.getPeople(currentGroup.id);
      setPeople(loadedPeople);
    } else {
      setPeople([]);
    }
  }, [activeGroupId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Keep people updated when activeGroupId changes
  useEffect(() => {
    if (activeGroupId) {
      const loadedPeople = db.getPeople(activeGroupId);
      setPeople(loadedPeople);
      // reset game if group changed
      setScreen('start');
      setGameState(null);
    }
  }, [activeGroupId]);

  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

  // Start new game
  const handleStartGame = () => {
    if (people.length < 2) return;
    const newEngine = new DeductionEngine(people);
    const initialState = newEngine.initGame();

    setEngine(newEngine);
    setGameState(initialState);
    setConfirmedPerson(null);

    if (initialState.phase === 'guessing' && initialState.guessedPerson) {
      setScreen('guessing');
    } else {
      setScreen('playing');
    }
  };

  // Process question answer
  const handleAnswer = (answer: Answer) => {
    if (!engine || !gameState) return;

    const nextState = engine.processAnswer(gameState, answer);
    setGameState(nextState);

    if (nextState.phase === 'guessing' && nextState.guessedPerson) {
      setScreen('guessing');
    } else if (nextState.phase === 'exhausted' || nextState.candidates.length <= 3) {
      if (nextState.candidates.length === 1) {
        nextState.guessedPerson = nextState.candidates[0];
        setScreen('guessing');
      } else if (!nextState.currentQuestion) {
        setScreen('ambiguous');
      }
    }
  };

  // Undo last answer
  const handleUndo = () => {
    if (!engine || !gameState) return;
    const undoneState = engine.undoLastAnswer(gameState);
    setGameState(undoneState);
    setScreen('playing');
  };

  // Confirm guess
  const handleConfirmGuess = () => {
    if (gameState?.guessedPerson) {
      setConfirmedPerson(gameState.guessedPerson);
      setScreen('victory');
    }
  };

  // Reject guess -> continue deduction!
  const handleRejectGuess = () => {
    if (!engine || !gameState) return;
    const rejectedState = engine.rejectGuess(gameState);
    setGameState(rejectedState);

    if (rejectedState.phase === 'guessing' && rejectedState.guessedPerson) {
      setScreen('guessing');
    } else if (rejectedState.phase === 'exhausted' || rejectedState.candidates.length === 0) {
      setScreen('ambiguous');
    } else {
      setScreen('playing');
    }
  };

  // Restart / Play again
  const handleRestart = () => {
    setScreen('start');
    setGameState(null);
    setConfirmedPerson(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-body selection:bg-amber-500 selection:text-slate-950">
      <Header
        currentMode={currentMode}
        onModeChange={(m) => {
          setCurrentMode(m);
          if (m === 'creator') {
            setScreen('start');
          }
        }}
        activeGroupName={activeGroup?.name}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        {currentMode === 'creator' ? (
          activeGroup && (
            <CreatorDashboard
              groups={groups}
              activeGroup={activeGroup}
              people={people}
              onSelectGroup={(grp) => setActiveGroupId(grp.id)}
              onRefreshData={refreshData}
            />
          )
        ) : (
          <>
            {screen === 'start' && activeGroup && (
              <GameStartScreen
                groups={groups}
                activeGroup={activeGroup}
                people={people}
                onSelectGroup={(grp) => setActiveGroupId(grp.id)}
                onStartGame={handleStartGame}
                onGoToCreator={() => setCurrentMode('creator')}
              />
            )}

            {screen === 'playing' && gameState && (
              <GamePlayScreen
                gameState={gameState}
                onAnswer={handleAnswer}
                onUndo={handleUndo}
                onRestart={handleRestart}
              />
            )}

            {screen === 'guessing' && gameState?.guessedPerson && (
              <GuessScreen
                person={gameState.guessedPerson}
                questionCount={gameState.history.length}
                onConfirmGuess={handleConfirmGuess}
                onRejectGuess={handleRejectGuess}
              />
            )}

            {screen === 'victory' && (confirmedPerson || gameState?.guessedPerson) && (
              <VictoryScreen
                person={(confirmedPerson || gameState?.guessedPerson)!}
                history={gameState?.history || []}
                onPlayAgain={handleRestart}
              />
            )}

            {screen === 'ambiguous' && (
              <AmbiguousScreen
                candidates={gameState?.candidates || []}
                history={gameState?.history || []}
                onSelectCandidate={(chosen) => {
                  setConfirmedPerson(chosen);
                  setScreen('victory');
                }}
                onPlayAgain={handleRestart}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
