import { useEffect, useState, useRef } from "react";
import PriceChart from "../components/PriceChart";
import PredictionCard from "../components/PredictionCard";
import PredictionHistory from "../components/PredictionHistory";
import type { PredictionData } from "../components/PredictionControls";
import BetModal from "../components/BetModal";
import EndRoundModal from "../components/EndRoundModal";
import { useRoundStore } from "../store/useRoundStore";
import type { Round } from "../lib/api-client";
import { useWalletStore, selectIsWalletConnected } from "../store/useWalletStore";
import { Link } from "react-router-dom";
import EmptyState from '../components/EmptyState';
import DashboardSkeleton from '../components/DashboardSkeleton';


const Dashboard = () => {
  const isRoundActive = useRoundStore((state) => state.isRoundActive);
  const isLoading = useRoundStore((state) => state.isLoading);
  const isWalletConnected = useWalletStore(selectIsWalletConnected);
  const isWalletConnecting = useWalletStore(
    (s) => s.status === "connecting" || s.status === "checking"
  );
  const resolvedRound = useRoundStore((state) => state.resolvedRound);
  const dismissResolvedRound = useRoundStore((state) => state.dismissResolvedRound);
  const publicKey = useWalletStore((s) => s.publicKey);
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [pendingPrediction, setPendingPrediction] = useState<PredictionData | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const { fetchActiveRound, subscribeToRoundEvents } = useRoundStore.getState();
    void fetchActiveRound();
    const unsubscribe = subscribeToRoundEvents();
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      const currentTimeout = timeoutRef.current;
      if (currentTimeout !== null) {
        clearTimeout(currentTimeout);
      }
    };
  }, []);

  const handlePrediction = (data: PredictionData) => {
    setPendingPrediction(data);
    setIsBetModalOpen(true);
  };

  const openPredictBar = () => {
    // Open BetModal with default prediction data when triggered from sticky bar
    setPendingPrediction({
      direction: 'UP',
      stake: '',
      isLegend: false,
    });
    setIsBetModalOpen(true);
  };

  const getEndRoundResult = (round: Round | null) => {
    const defaultTip = 'Stay tuned for the next round.';

    if (!round) {
      return {
        isWin: false,
        amount: 0,
        tip: defaultTip,
      };
    }

    const isWin = typeof round.isWin === 'boolean'
      ? round.isWin
      : String(round.outcome ?? round.result ?? '').toLowerCase() === 'win';

    const amount = typeof round.netChange === 'number'
      ? round.netChange
      : typeof round.profit === 'number'
      ? round.profit
      : typeof round.score === 'number'
      ? round.score
      : 0;

    const tip = typeof round.tip === 'string'
      ? round.tip
      : typeof round.note === 'string'
      ? round.note
      : defaultTip;

    return { isWin, amount, tip };
  };

  const endRoundResult = getEndRoundResult(resolvedRound);

  return (
    <div className="xelma-grid-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8 pb-24 md:pb-8">
      <div className="mx-auto max-w-7xl">
        {isLoading && <DashboardSkeleton />}

        {!isLoading && !isWalletConnected && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#2C4BFD]/30 bg-[#2C4BFD]/10 p-4 text-sm text-[#BEC7FE] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <p className="leading-relaxed" data-testid="dashboard-wallet-prompt">
              Connect your wallet to submit predictions.
            </p>
            <Link
              to="/connect"
              data-testid="dashboard-connect-now"
              className="btn-primary no-underline inline-flex min-h-[44px] w-full items-center justify-center rounded-lg px-5 py-2 text-sm font-bold sm:w-auto"
            >
              Connect now
            </Link>
          </div>
        )}

        {!isLoading && !isRoundActive && (
          <EmptyState
            title="No Active Rounds"
            description="Learn how the game works or refresh to check for new rounds."
            action={
              <button
                type="button"
                className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
                onClick={() => {
                  void useRoundStore.getState().fetchActiveRound();
                }}
              >
                Refresh
              </button>
            }
          />
        )}

        {!isLoading && isRoundActive && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="dashboard__center lg:col-span-1 flex flex-col gap-6">
              <PredictionCard
                isWalletConnected={isWalletConnected}
                isRoundActive={isRoundActive}
                isConnecting={isWalletConnecting}
                isSubmittingPrediction={isBetModalOpen}
                onPrediction={handlePrediction}
              />
            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="min-h-[350px] bg-white dark:bg-gray-800 p-6 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700">
                <PriceChart height={280} />
              </div>
              <PredictionHistory userId={publicKey} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky predict action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="flex items-center justify-between gap-3 border-t border-gray-800 bg-gray-900/95 backdrop-blur-lg px-4 py-3 shadow-2xl"
             style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-gray-400">
              {isRoundActive && isWalletConnected ? "Active Round" : !isWalletConnected ? "Wallet Required" : "No Active Round"}
            </span>
            <span className="text-sm font-bold text-white">
              {isRoundActive && isWalletConnected ? "Place your prediction now" : !isWalletConnected ? "Connect to predict" : "Check back soon"}
            </span>
          </div>
          <button
            type="button"
            onClick={openPredictBar}
            disabled={!isRoundActive || !isWalletConnected}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2C4BFD] to-[#4B6AFF] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#2C4BFD]/30 transition-all duration-200 hover:from-[#3B5BFD] hover:to-[#5B7AFF] hover:shadow-xl hover:shadow-[#2C4BFD]/40 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:from-[#2C4BFD] disabled:hover:to-[#4B6AFF]"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1L10.5 5.5L15.5 6.5L12 10L13 15L8 12.5L3 15L4 10L0.5 6.5L5.5 5.5L8 1Z" fill="currentColor" />
            </svg>
            Predict Now
          </button>
        </div>
      </div>

      <BetModal
        isOpen={isBetModalOpen}
        onClose={() => {
          setIsBetModalOpen(false);
          setPendingPrediction(null);
        }}
        predictionData={pendingPrediction}
        onSuccess={(txHash: string) => {
          console.log("Prediction confirmed on-chain. TxHash:", txHash);
        }}
      />
      <EndRoundModal
        isOpen={Boolean(resolvedRound)}
        onClose={dismissResolvedRound}
        result={endRoundResult}
      />
    </div>
  );
};

export default Dashboard;
