import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Database,
  Cpu,
  FileText,
  ChevronRight,
  Maximize2,
  Minimize2,
  ArrowRight,
  Zap,
  Package,
  ShoppingCart,
  Megaphone,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { api } from "../lib/api";

// 12 Scenes definition
const SCENES = [
  { id: 1, title: "1. Business Data", subtitle: "Collecting raw multi-source signals", duration: 8 },
  { id: 2, title: "2. KPI Calculation", subtitle: "Deriving Net Revenue metric", duration: 8 },
  { id: 3, title: "3. Historical Baseline", subtitle: "Calculating OLS trend & seasonality", duration: 10 },
  { id: 4, title: "4. Actual vs Expected", subtitle: "Measuring variance & percentage drop", duration: 8 },
  { id: 5, title: "5. Anomaly Detection", subtitle: "Evaluating Z-score statistical threshold", duration: 11 },
  { id: 6, title: "6. Root Cause Analysis", subtitle: "Counterfactual control-store comparison", duration: 12 },
  { id: 7, title: "7. Driver Contribution", subtitle: "Distributing revenue impact shares", duration: 8 },
  { id: 8, title: "8. Confidence & Materiality", subtitle: "Scoring multi-factor evidence reliability", duration: 9 },
  { id: 9, title: "9. Safety / Abstention Gate", subtitle: "Verifying quality & confidence safety rules", duration: 6 },
  { id: 10, title: "10. Evidence Pack", subtitle: "Assembling deterministic ground-truth JSON", duration: 8 },
  { id: 11, title: "11. LLM Explanation", subtitle: "Evidence-bounded narrative synthesis", duration: 9 },
  { id: 12, title: "12. Executive Insight", subtitle: "Final actionable intelligence & recommendations", duration: 9 },
];

const PRESENTER_SCRIPTS: Record<number, string> = {
  1: "We start with business data flowing from three core sources: sales transactions, warehouse inventory, and marketing campaigns.",
  2: "The engine aggregates raw sales into governed KPIs. Net Revenue is computed deterministically: Gross Revenue minus Discounts and Returns, yielding 420 thousand dollars.",
  3: "Next, we calculate the expected baseline using OLS linear regression over same-weekday history with 7-day and 28-day seasonality adjustments, giving an expected 840 thousand dollars.",
  4: "We compare actual revenue of 420K against expected revenue of 840K. This reveals a material revenue drop of 420 thousand dollars, or 50% below baseline.",
  5: "We test if this drop is statistically unusual. The residual divided by trailing standard deviation produces a Z-score of -3.4, exceeding our 2.0 threshold, so we flag it as an anomaly.",
  6: "To find why it happened, the engine conducts control-store counterfactual analysis, isolating inventory stockouts and paid-search marketing spend cuts.",
  7: "The system attributes the 420K drop: 300K, or 71.4%, is driven by top SKU stockouts, while 120K, or 28.6%, is driven by the paid search spend cut.",
  8: "Before outputting insights, we evaluate evidence reliability. Combining statistical strength, data quality, model fit, and freshness yields an 82% High Confidence score.",
  9: "The safety gate checks quality and confidence rules. Since all safety criteria pass, the system proceeds to generate recommendations without abstaining.",
  10: "All deterministic findings, drivers, and confidence metrics are aggregated into a single structured Evidence Pack JSON object.",
  11: "Only now is the LLM invoked. Guided by strict evidence-only prompts, it formats the Evidence Pack into a persona-specific human narrative without inventing numbers.",
  12: "Finally, the executive dashboard presents the complete intelligence card: root causes, high confidence, and immediate recommended actions for supply chain and marketing managers."
};

interface PrototypeData {
  scenario: { kpiId: string; kpiName: string; targetDate: string; currency: string };
  scene1_businessData: {
    sales: { grossRevenue: number; discountAmount: number; returnsAmount: number; netRevenue: number; orderCount: number };
    inventory: { productsTracked: number; totalStores: number; activeStockouts: number; topStockoutSku: string };
    marketing: { activeCampaigns: number; channel: string; spendCutPercent: number; spendCutUsd: number };
  };
  scene2_kpiCalculation: { grossRevenue: number; discountAmount: number; returnsAmount: number; netRevenue: number; formula: string };
  scene3_historicalBaseline: { points: Array<{ date: string; value: number }>; expectedValue: number; method: string; sameWeekdayAverage: number; trendAdjustment: number; seasonalityAdjustment: number; reliabilityScore: number };
  scene4_actualVsExpected: { expectedValue: number; actualValue: number; difference: number; percentDrop: number };
  scene5_anomalyDetection: { actualValue: number; expectedValue: number; residual: number; historicalStdDev: number; zScore: number; statisticalThreshold: number; isAnomaly: boolean; isAdverse: boolean };
  scene6_rootCauseAnalysis: { totalKpiChange: number; controlStoreComparison: { controlStoreExpected: number; affectedStoreActual: number; gap: number }; drivers: Array<{ driverId: string; name: string; estimatedImpact: number; contributionPercent: number; method: string }> };
  scene7_driverContribution: { totalChange: number; explainedImpact: number; residualImpact: number; breakdown: Array<{ name: string; impact: number; percent: number; color: string }> };
  scene8_confidenceAndMateriality: { factors: { evidenceStrength: number; dataQualityScore: number; modelFitScore: number; causalConfirmation: number; freshnessScore: number }; confidenceScore: number; confidenceLabel: string; materialityScore: number; materialityLevel: string };
  scene9_safetyAbstention: { shouldAbstain: boolean; checkedRules: Array<{ rule: string; status: string; val: string }> };
  scene10_evidencePack: { anomaly: any; drivers: any[]; recommendedActions: any[] };
  scene11_llmExplanation: { narrativeText: string; status: string; source: string };
  scene12_finalInsight: { title: string; kpi: string; period: string; actual: string; expected: string; delta: string; primaryDriver: string; secondaryDriver: string; confidence: string; materiality: string; recommendedAction: string; ownerPersona: string };
}

export function PrototypePage() {
  const [currentScene, setCurrentScene] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showPresenterScript, setShowPresenterScript] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [data, setData] = useState<PrototypeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch demo data
  useEffect(() => {
    async function loadDemoData() {
      try {
        const res = await api.get("/prototype/demo-data");
        setData(res.data);
      } catch {
        // Fallback default dataset if server unreachable
        setData({
          scenario: { kpiId: "net_revenue", kpiName: "Net Revenue", targetDate: "2026-08-15", currency: "USD" },
          scene1_businessData: {
            sales: { grossRevenue: 520000, discountAmount: 60000, returnsAmount: 40000, netRevenue: 420000, orderCount: 4200 },
            inventory: { productsTracked: 140, totalStores: 12, activeStockouts: 3, topStockoutSku: "SKU-ELEC-101 (Top 4K Monitor)" },
            marketing: { activeCampaigns: 8, channel: "paid_search", spendCutPercent: 20, spendCutUsd: 18000 }
          },
          scene2_kpiCalculation: { grossRevenue: 520000, discountAmount: 60000, returnsAmount: 40000, netRevenue: 420000, formula: "net_revenue = gross_revenue - discount_amount - returns_amount" },
          scene3_historicalBaseline: {
            points: [
              { date: "Jul 18", value: 780000 },
              { date: "Jul 25", value: 810000 },
              { date: "Aug 1", value: 825000 },
              { date: "Aug 8", value: 840000 },
              { date: "Aug 15", value: 420000 }
            ],
            expectedValue: 840000,
            method: "same_weekday_trend",
            sameWeekdayAverage: 813750,
            trendAdjustment: 26250,
            seasonalityAdjustment: 0,
            reliabilityScore: 0.95
          },
          scene4_actualVsExpected: { expectedValue: 840000, actualValue: 420000, difference: -420000, percentDrop: 50.0 },
          scene5_anomalyDetection: { actualValue: 420000, expectedValue: 840000, residual: -420000, historicalStdDev: 123529.41, zScore: -3.4, statisticalThreshold: 2.0, isAnomaly: true, isAdverse: true },
          scene6_rootCauseAnalysis: {
            totalKpiChange: -420000,
            controlStoreComparison: { controlStoreExpected: 500000, affectedStoreActual: 200000, gap: -300000 },
            drivers: [
              { driverId: "stockout_top_skus", name: "Top SKU Stockouts", estimatedImpact: -300000, contributionPercent: 71.4, method: "control_store_comparison" },
              { driverId: "paid_search_reduction", name: "Paid Search Spend Cut (-20%)", estimatedImpact: -120000, contributionPercent: 28.6, method: "region_channel_control_comparison" }
            ]
          },
          scene7_driverContribution: {
            totalChange: -420000,
            explainedImpact: -420000,
            residualImpact: 0,
            breakdown: [
              { name: "Top SKU Stockouts", impact: -300000, percent: 71.4, color: "#ef4444" },
              { name: "Paid Search Budget Cut", impact: -120000, percent: 28.6, color: "#f59e0b" }
            ]
          },
          scene8_confidenceAndMateriality: {
            factors: { evidenceStrength: 1.0, dataQualityScore: 0.9, modelFitScore: 0.9, causalConfirmation: 1.0, freshnessScore: 1.0 },
            confidenceScore: 0.82,
            confidenceLabel: "HIGH",
            materialityScore: 0.85,
            materialityLevel: "HIGH"
          },
          scene9_safetyAbstention: {
            shouldAbstain: false,
            checkedRules: [
              { rule: "Confidence Score ≥ 0.5", status: "PASS", val: "0.82" },
              { rule: "Data Quality Score ≥ 0.5", status: "PASS", val: "0.90" },
              { rule: "Key Source Present", status: "PASS", val: "All Present" },
              { rule: "Contradiction Score ≤ 0.6", status: "PASS", val: "0.00" },
              { rule: "Security Filter Clear", status: "PASS", val: "Clear" }
            ]
          },
          scene10_evidencePack: {
            anomaly: { kpiId: "net_revenue", period: "2026-08-15", actualValue: 420000, forecastValue: 840000, delta: -420000, confidenceScore: 0.82, dataQualityScore: 0.9 },
            drivers: [
              { driverId: "stockout_top_skus", estimatedImpact: -300000, confidenceScore: 0.85 },
              { driverId: "paid_search_reduction", estimatedImpact: -120000, confidenceScore: 0.78 }
            ],
            recommendedActions: [
              { action: "Expedite inventory replenishment & restore safety stock levels", owner: "Supply Chain Manager", lever: "inventory_reorder", expected_impact: 300000, confidence: 0.85, monitoring_plan: "Track daily SKU stockout rate and fulfillment SLA" }
            ]
          },
          scene11_llmExplanation: {
            narrativeText: "Net Revenue fell significantly below expected levels on August 15 ($420,000 actual vs $840,000 forecast, a 50% drop, Z-score -3.4). The primary driver was inventory stockouts in top-selling electronics SKUs, accounting for -$300,000 of the revenue loss, followed by a 20% reduction in paid-search marketing spend which contributed -$120,000. Data quality and baseline reliability are high (confidence: 82%).",
            status: "ok",
            source: "deterministic_evidence_only"
          },
          scene12_finalInsight: {
            title: "Net Revenue Anomaly & Executive Action Plan",
            kpi: "Net Revenue",
            period: "August 15, 2026",
            actual: "$420K",
            expected: "$840K",
            delta: "-$420K (-50%)",
            primaryDriver: "Inventory Stockouts in Top SKUs (-$300K / 71%)",
            secondaryDriver: "Paid Search Spend Reduction (-$120K / 29%)",
            confidence: "82% — HIGH",
            materiality: "HIGH",
            recommendedAction: "Expedite inventory replenishment for top SKUs & restore paid search budget",
            ownerPersona: "Supply Chain Manager & Marketing Manager"
          }
        });
      } finally {
        setLoading(false);
      }
    }
    loadDemoData();
  }, []);

  const handleNext = useCallback(() => {
    setCurrentScene((prev) => (prev < 12 ? prev + 1 : 1));
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentScene((prev) => (prev > 1 ? prev - 1 : 12));
  }, []);

  // Auto playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const sceneDuration = SCENES.find((s) => s.id === currentScene)?.duration || 8;
    const timeoutMs = (sceneDuration * 1000) / playbackSpeed;

    timerRef.current = setTimeout(() => {
      handleNext();
    }, timeoutMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentScene, isPlaying, playbackSpeed, handleNext]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Sparkles className="animate-spin text-indigo-400 mb-4" size={40} />
        <p className="text-slate-400 font-medium animate-pulse">Initializing Video Prototype Engine...</p>
      </div>
    );
  }

  const activeSceneInfo = SCENES.find((s) => s.id === currentScene)!;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden relative"
    >
      {/* Background ambient lighting glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation Header */}
      {!isFullscreen && (
        <header className="border-b border-slate-800/80 bg-[#0c101c]/90 backdrop-blur-md px-6 py-3 flex items-center justify-between z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
                BI
              </div>
              <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Intelligence Engine
              </span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 font-mono">
              VIDEO PROTOTYPE PIPELINE
            </span>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-inner">
              <button
                onClick={handlePrev}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
                title="Previous Scene (←)"
              >
                <SkipBack size={16} />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                  isPlaying
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause size={14} /> Pause
                  </>
                ) : (
                  <>
                    <Play size={14} /> Play Demo
                  </>
                )}
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors"
                title="Next Scene (→)"
              >
                <SkipForward size={16} />
              </button>
              <button
                onClick={() => {
                  setCurrentScene(1);
                  setIsPlaying(true);
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors border-l border-slate-800 ml-1 pl-2"
                title="Restart Demo"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg text-xs p-0.5">
              {[0.75, 1.0, 1.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 rounded font-mono ${
                    playbackSpeed === speed
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Script Toggle & Fullscreen */}
            <button
              onClick={() => setShowPresenterScript(!showPresenterScript)}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                showPresenterScript
                  ? "bg-purple-950/60 text-purple-300 border-purple-800"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <FileText size={14} /> Script
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition-colors"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </header>
      )}

      {/* Stepper Pipeline Stage Bar */}
      <div className="w-full bg-[#090d18] border-b border-slate-800/60 px-6 py-2 z-20 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between min-w-[900px]">
          {SCENES.map((scene) => {
            const isActive = scene.id === currentScene;
            const isDone = scene.id < currentScene;
            return (
              <button
                key={scene.id}
                onClick={() => {
                  setCurrentScene(scene.id);
                  setIsPlaying(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? "bg-indigo-600/30 border border-indigo-500/60 text-indigo-200 shadow-lg shadow-indigo-950/50 scale-105"
                    : isDone
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? "bg-indigo-500 text-white animate-pulse"
                      : isDone
                      ? "bg-slate-800 text-indigo-400 border border-indigo-900"
                      : "bg-slate-900 text-slate-600"
                  }`}
                >
                  {scene.id}
                </span>
                <span className="truncate max-w-[90px]">{scene.title.split(". ")[1]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN ANIMATED STAGE SCREEN */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col justify-center items-center z-10 my-auto min-h-[620px]">
        {/* Stage Subtitle Header */}
        <div className="w-full text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium text-indigo-300 mb-3 shadow-sm">
            <Zap size={13} className="text-indigo-400 animate-bounce" /> STAGE {currentScene} OF 12
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            {activeSceneInfo.title}
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium max-w-xl mx-auto">
            {activeSceneInfo.subtitle}
          </p>
        </div>

        {/* DYNAMIC SCENE CONTAINER */}
        <div className="w-full max-w-4xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl min-h-[420px] flex flex-col justify-center relative overflow-hidden transition-all duration-500">
          
          {/* SCENE 1: BUSINESS DATA */}
          {currentScene === 1 && (
            <div className="flex flex-col items-center gap-8 animate-fadeIn">
              <h2 className="text-xl font-bold text-slate-200">"Let's see what happened to revenue."</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {/* Sales Card */}
                <div className="bg-slate-950/80 border border-indigo-900/40 rounded-xl p-5 shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-center gap-2 text-indigo-400 mb-4 font-bold text-sm">
                    <ShoppingCart size={18} /> SALES DATA
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Gross Revenue</span> <span className="font-mono text-white">$520,000</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Orders Count</span> <span className="font-mono text-white">4,200</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Discounts</span> <span className="font-mono text-amber-400">-$60,000</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Returns</span> <span className="font-mono text-rose-400">-$40,000</span>
                    </li>
                  </ul>
                </div>

                {/* Inventory Card */}
                <div className="bg-slate-950/80 border border-purple-900/40 rounded-xl p-5 shadow-lg transform hover:-translate-y-1 transition-all duration-300 delay-100">
                  <div className="flex items-center gap-2 text-purple-400 mb-4 font-bold text-sm">
                    <Package size={18} /> INVENTORY DATA
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Tracked SKUs</span> <span className="font-mono text-white">140 Products</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Omnichannel Stores</span> <span className="font-mono text-white">12 Locations</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Stockout Status</span> <span className="font-mono text-rose-400 font-bold">3 Active Stockouts</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Top Stockout SKU</span> <span className="font-mono text-purple-300">SKU-ELEC-101</span>
                    </li>
                  </ul>
                </div>

                {/* Marketing Card */}
                <div className="bg-slate-950/80 border border-cyan-900/40 rounded-xl p-5 shadow-lg transform hover:-translate-y-1 transition-all duration-300 delay-200">
                  <div className="flex items-center gap-2 text-cyan-400 mb-4 font-bold text-sm">
                    <Megaphone size={18} /> MARKETING DATA
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Active Campaigns</span> <span className="font-mono text-white">8 Campaigns</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>Primary Channel</span> <span className="font-mono text-white">Paid Search</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1">
                      <span>EU Budget Change</span> <span className="font-mono text-amber-400 font-bold">-20% Spend Cut</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Spend Delta</span> <span className="font-mono text-amber-400">-$18,000</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Engine Flow Connector */}
              <div className="flex items-center gap-4 mt-2 px-6 py-2.5 rounded-full bg-slate-950 border border-indigo-900/50 text-xs font-mono text-indigo-300 shadow-inner animate-pulse">
                <Database size={14} /> Collecting business signals...
                <ArrowRight size={14} className="text-indigo-400" />
                <Cpu size={14} className="text-purple-400" /> Statistical Analysis Engine
              </div>
            </div>
          )}

          {/* SCENE 2: KPI CALCULATION */}
          {currentScene === 2 && (
            <div className="flex flex-col items-center gap-8 animate-fadeIn">
              <h2 className="text-xl font-semibold text-slate-300">Governed Formula: Net Revenue</h2>
              <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-xl flex flex-col items-center gap-4">
                <div className="flex items-center justify-between w-full text-sm font-medium border-b border-slate-800 pb-3">
                  <span className="text-slate-400">Gross Revenue</span>
                  <span className="font-mono text-lg font-bold text-white">$520,000</span>
                </div>
                <div className="flex items-center justify-between w-full text-sm font-medium border-b border-slate-800 pb-3 text-amber-400">
                  <span>- Discounts Amount</span>
                  <span className="font-mono text-lg font-bold">-$60,000</span>
                </div>
                <div className="flex items-center justify-between w-full text-sm font-medium border-b border-slate-800 pb-3 text-rose-400">
                  <span>- Returns Amount</span>
                  <span className="font-mono text-lg font-bold">-$40,000</span>
                </div>
                <div className="flex items-center justify-between w-full pt-2">
                  <span className="text-indigo-300 font-extrabold text-base">NET REVENUE</span>
                  <span className="font-mono text-3xl font-black text-emerald-400 animate-scaleUp">
                    $420,000
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-mono bg-slate-950 px-4 py-1.5 rounded-md border border-slate-800">
                Formula: net_revenue = gross_revenue - discount_amount - returns_amount
              </p>
            </div>
          )}

          {/* SCENE 3: HISTORICAL BASELINE */}
          {currentScene === 3 && (
            <div className="flex flex-col items-center gap-6 animate-fadeIn">
              <div className="flex items-center justify-between w-full">
                <h2 className="text-lg font-bold text-slate-200">Historical Net Revenue (Same-Weekday OLS Trend)</h2>
                <span className="text-xs px-3 py-1 bg-indigo-950 border border-indigo-800 text-indigo-300 rounded-full font-mono">
                  Target Date: Aug 15, 2026
                </span>
              </div>

              {/* Simplified Historical Bar Graph */}
              <div className="w-full bg-slate-950 p-6 rounded-xl border border-slate-800 flex items-end justify-between gap-4 h-52 relative">
                {/* Horizontal Baseline Expected Indicator Line */}
                <div className="absolute top-[25%] left-0 right-0 border-b-2 border-dashed border-emerald-400/70 z-10 flex items-center justify-between px-4">
                  <span className="text-[11px] font-mono text-emerald-300 bg-slate-950 px-2 py-0.5 rounded border border-emerald-900">
                    EXPECTED BASELINE: $840K
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">OLS Trend + Seasonality</span>
                </div>

                {/* Bars */}
                {data.scene3_historicalBaseline.points.map((pt, idx) => {
                  const isTarget = idx === data.scene3_historicalBaseline.points.length - 1;
                  const heightPct = (pt.value / 900000) * 100;
                  return (
                    <div key={pt.date} className="flex-1 flex flex-col items-center gap-2 z-20">
                      <span className={`text-xs font-mono font-bold ${isTarget ? 'text-rose-400' : 'text-slate-300'}`}>
                        ${Math.round(pt.value / 1000)}K
                      </span>
                      <div
                        className={`w-full max-w-[48px] rounded-t-md transition-all duration-700 ${
                          isTarget
                            ? "bg-gradient-to-t from-rose-600 to-rose-400 shadow-lg shadow-rose-950/80 animate-pulse"
                            : "bg-gradient-to-t from-indigo-900 to-indigo-500"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-xs text-slate-400 font-medium">{pt.date}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-6 text-xs text-slate-400 bg-slate-950 px-5 py-2.5 rounded-lg border border-slate-800">
                <div>Method: <span className="text-slate-200 font-mono">same_weekday_trend</span></div>
                <div>Seasonality Adj: <span className="text-slate-200 font-mono">$0</span></div>
                <div>Reliability: <span className="text-emerald-400 font-bold font-mono">95%</span></div>
              </div>
            </div>
          )}

          {/* SCENE 4: ACTUAL VS EXPECTED */}
          {currentScene === 4 && (
            <div className="flex flex-col items-center gap-8 animate-fadeIn">
              <h2 className="text-lg font-bold text-slate-300">Significant Negative Variance Detected</h2>
              <div className="grid grid-cols-2 gap-8 w-full max-w-lg">
                <div className="bg-slate-950 border border-emerald-900/60 p-6 rounded-2xl text-center shadow-lg">
                  <div className="text-xs font-bold text-emerald-400 tracking-wider mb-2">EXPECTED REVENUE</div>
                  <div className="text-3xl font-black font-mono text-white">$840,000</div>
                  <div className="text-xs text-slate-400 mt-2">Baseline Model Forecast</div>
                </div>

                <div className="bg-slate-950 border border-rose-900/60 p-6 rounded-2xl text-center shadow-lg">
                  <div className="text-xs font-bold text-rose-400 tracking-wider mb-2">ACTUAL REVENUE</div>
                  <div className="text-3xl font-black font-mono text-rose-400">$420,000</div>
                  <div className="text-xs text-slate-400 mt-2">Reported Sales Value</div>
                </div>
              </div>

              <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl px-8 py-4 text-center shadow-xl animate-scaleUp">
                <div className="text-sm font-semibold text-slate-300">VARIANCE DELTA</div>
                <div className="text-3xl font-black font-mono text-rose-400 mt-1">-$420,000</div>
                <div className="text-xs font-bold text-rose-300 mt-1">50% BELOW EXPECTED BASELINE</div>
              </div>
            </div>
          )}

          {/* SCENE 5: STATISTICAL ANOMALY DETECTION */}
          {currentScene === 5 && (
            <div className="flex flex-col items-center gap-6 animate-fadeIn">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white">Statistical Z-Score Thresholding</h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  residual (-$420K) / trailing_std_dev ($123.5K) = Z-Score
                </p>
              </div>

              {/* Z-Score Scale Visualization */}
              <div className="w-full bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>-4.0 (Severe Drop)</span>
                  <span>-2.0 (Threshold)</span>
                  <span>0.0 (Baseline)</span>
                  <span>+2.0 (Threshold)</span>
                  <span>+4.0 (Surge)</span>
                </div>
                <div className="w-full h-4 bg-slate-900 rounded-full relative overflow-hidden border border-slate-800">
                  {/* Normal Range Shading */}
                  <div className="absolute left-[25%] right-[25%] top-0 bottom-0 bg-indigo-950/80 border-x border-indigo-800" />
                  {/* Observed Z-score Indicator Marker */}
                  <div className="absolute left-[8%] top-0 bottom-0 w-2.5 bg-rose-500 rounded-full shadow-lg shadow-rose-500 animate-pulse" />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span className="text-rose-400 font-bold">Observed Z = -3.4</span>
                  <span className="text-indigo-300">Normal Range: ±2.0</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-rose-950/60 border border-rose-700/80 px-6 py-3 rounded-xl shadow-lg animate-bounce">
                <AlertTriangle size={24} className="text-rose-400" />
                <div>
                  <div className="font-extrabold text-sm text-white tracking-wide">⚠ ANOMALY DETECTED</div>
                  <div className="text-xs text-rose-300 font-mono">Z-Score (-3.4) exceeds statistical threshold (±2.0)</div>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 6: ROOT CAUSE ANALYSIS */}
          {currentScene === 6 && (
            <div className="flex flex-col items-center gap-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-slate-200">Counterfactual Control-Store Comparison</h2>
              
              {/* Branching Tree Diagram */}
              <div className="grid grid-cols-2 gap-6 w-full">
                {/* Driver 1: Inventory Stockout */}
                <div className="bg-slate-950 border border-rose-900/50 p-5 rounded-xl flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-rose-400">DRIVER 1: INVENTORY STOCKOUT</span>
                    <span className="text-[10px] font-mono bg-rose-950 px-2 py-0.5 rounded text-rose-300">Control Comparison</span>
                  </div>
                  <p className="text-xs text-slate-300">Top SKU (SKU-ELEC-101) stockout across affected store network.</p>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                    <span className="text-xs text-slate-400">Estimated Impact</span>
                    <span className="text-lg font-black font-mono text-rose-400">-$300,000</span>
                  </div>
                </div>

                {/* Driver 2: Paid Search Cut */}
                <div className="bg-slate-950 border border-amber-900/50 p-5 rounded-xl flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-400">DRIVER 2: PAID SEARCH CUT</span>
                    <span className="text-[10px] font-mono bg-amber-950 px-2 py-0.5 rounded text-amber-300">Channel Control</span>
                  </div>
                  <p className="text-xs text-slate-300">20% spend reduction in EU online channel campaign.</p>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                    <span className="text-xs text-slate-400">Estimated Impact</span>
                    <span className="text-lg font-black font-mono text-amber-400">-$120,000</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 font-mono bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                Methodology: (Stocked-Out Store Baseline - Actual Revenue 0) + Regional Online Control Comparison
              </div>
            </div>
          )}

          {/* SCENE 7: DRIVER CONTRIBUTION */}
          {currentScene === 7 && (
            <div className="flex flex-col items-center gap-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-slate-200">Revenue Impact Share Distribution</h2>
              
              <div className="w-full bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-300">TOTAL REVENUE DROP</span>
                  <span className="font-mono text-xl font-bold text-rose-400">-$420,000 (100%)</span>
                </div>

                {/* Stockout Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-rose-400 font-bold">1. Top SKU Stockouts</span>
                    <span className="font-mono text-slate-200">-$300,000 (71.4%)</span>
                  </div>
                  <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: '71.4%' }} />
                  </div>
                </div>

                {/* Paid Search Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <span className="text-amber-400 font-bold">2. EU Paid Search Budget Cut</span>
                    <span className="font-mono text-slate-200">-$120,000 (28.6%)</span>
                  </div>
                  <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: '28.6%' }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 px-4 py-2 rounded-lg border border-emerald-900">
                <CheckCircle size={14} /> 100% of variance accounted for (Residual Unexplained: $0)
              </div>
            </div>
          )}

          {/* SCENE 8: CONFIDENCE & MATERIALITY */}
          {currentScene === 8 && (
            <div className="flex flex-col items-center gap-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-slate-200">Multi-Factor Evidence Reliability</h2>
              
              <div className="grid grid-cols-2 gap-6 w-full">
                {/* Confidence Card */}
                <div className="bg-slate-950 border border-indigo-900/60 p-6 rounded-2xl flex flex-col items-center text-center shadow-lg">
                  <span className="text-xs font-bold text-indigo-400 tracking-wider">CONFIDENCE SCORE</span>
                  <span className="text-4xl font-black font-mono text-indigo-300 my-2">82%</span>
                  <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                    HIGH CONFIDENCE
                  </span>
                  <p className="text-[11px] text-slate-400 mt-3">
                    0.30*Evidence + 0.25*Quality + 0.20*ModelFit + 0.15*Causal + 0.10*Freshness
                  </p>
                </div>

                {/* Materiality Card */}
                <div className="bg-slate-950 border border-purple-900/60 p-6 rounded-2xl flex flex-col items-center text-center shadow-lg">
                  <span className="text-xs font-bold text-purple-400 tracking-wider">MATERIALITY SCORE</span>
                  <span className="text-4xl font-black font-mono text-purple-300 my-2">85%</span>
                  <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                    HIGH MATERIALITY
                  </span>
                  <p className="text-[11px] text-slate-400 mt-3">
                    Statistical Significance (Z=3.4) × High Business Dollar Impact ($420K)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SCENE 9: SAFETY / ABSTENTION GATE */}
          {currentScene === 9 && (
            <div className="flex flex-col items-center gap-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-slate-200">Abstention Safety Evaluation Gate</h2>
              
              <div className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
                {data.scene9_safetyAbstention.checkedRules.map((r, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-900 last:border-0">
                    <span className="text-slate-300 flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-400" /> {r.rule}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-900">
                      {r.status} ({r.val})
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 bg-emerald-950/60 border border-emerald-700/80 px-6 py-2.5 rounded-xl shadow-lg">
                <CheckCircle size={20} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-200">
                  SAFETY CLEAR: Evidence is verified. Proceeding to generate recommendations.
                </span>
              </div>
            </div>
          )}

          {/* SCENE 10: EVIDENCE PACK */}
          {currentScene === 10 && (
            <div className="flex flex-col items-center gap-5 animate-fadeIn">
              <div className="text-center">
                <h2 className="text-lg font-bold text-white">Structured Evidence Pack JSON</h2>
                <p className="text-xs text-slate-400">Ground-truth deterministic contract generated by statistical engine</p>
              </div>

              <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-300 max-h-56 overflow-y-auto scrollbar-thin">
                <pre>{JSON.stringify(data.scene10_evidencePack, null, 2)}</pre>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Source of Truth: Engine guarantees numbers are strictly deterministic (SQL + Statistical Models).
              </div>
            </div>
          )}

          {/* SCENE 11: LLM EXPLANATION */}
          {currentScene === 11 && (
            <div className="flex flex-col items-center gap-6 animate-fadeIn">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950 border border-purple-700 text-purple-300 text-xs font-mono">
                <Sparkles size={14} /> LLM NARRATIVE GENERATOR (EVIDENCE-BOUNDED)
              </div>

              <div className="bg-slate-950 border border-purple-900/60 p-6 rounded-2xl w-full shadow-xl relative">
                <div className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-2">Narrative Summary</div>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  "{data.scene11_llmExplanation.narrativeText}"
                </p>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                <HelpCircle size={14} className="text-indigo-400" />
                <span>The LLM never calculates Z-scores or discovers root causes. It only formats the Evidence Pack.</span>
              </div>
            </div>
          )}

          {/* SCENE 12: FINAL EXECUTIVE INSIGHT */}
          {currentScene === 12 && (
            <div className="flex flex-col items-center gap-6 animate-fadeIn">
              <div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-indigo-400 tracking-wider">EXECUTIVE INTELLIGENCE CARD</span>
                    <h2 className="text-xl font-black text-white">{data.scene12_finalInsight.title}</h2>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 font-mono font-bold border border-emerald-800">
                    CONFIDENCE: {data.scene12_finalInsight.confidence}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400">EXPECTED</div>
                    <div className="text-lg font-bold font-mono text-emerald-400">{data.scene12_finalInsight.expected}</div>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400">ACTUAL</div>
                    <div className="text-lg font-bold font-mono text-rose-400">{data.scene12_finalInsight.actual}</div>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400">VARIANCE</div>
                    <div className="text-lg font-bold font-mono text-rose-400">{data.scene12_finalInsight.delta}</div>
                  </div>
                </div>

                <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="text-xs font-bold text-slate-300">PRIMARY ROOT CAUSES IDENTIFIED:</div>
                  <div className="text-xs text-rose-300 flex justify-between">
                    <span>1. {data.scene12_finalInsight.primaryDriver}</span>
                    <span className="font-mono">-$300K</span>
                  </div>
                  <div className="text-xs text-amber-300 flex justify-between">
                    <span>2. {data.scene12_finalInsight.secondaryDriver}</span>
                    <span className="font-mono">-$120K</span>
                  </div>
                </div>

                <div className="bg-indigo-950/40 border border-indigo-800/80 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-indigo-300">RECOMMENDED ACTION</div>
                    <div className="text-xs text-white mt-0.5">{data.scene12_finalInsight.recommendedAction}</div>
                  </div>
                  <span className="text-[10px] bg-indigo-900 text-indigo-200 px-2.5 py-1 rounded font-semibold">
                    {data.scene12_finalInsight.ownerPersona}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* PRESENTER SCRIPT FOOTER PANEL */}
      {showPresenterScript && !isFullscreen && (
        <footer className="border-t border-slate-800/80 bg-[#0a0d18]/95 backdrop-blur-md px-6 py-3 z-30 sticky bottom-0">
          <div className="max-w-4xl mx-auto flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 shrink-0 mt-0.5">
              <FileText size={16} />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-bold text-purple-400 tracking-wider">
                PRESENTER VOICEOVER SCRIPT — SCENE {currentScene}:
              </div>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed font-sans italic">
                "{PRESENTER_SCRIPTS[currentScene]}"
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
