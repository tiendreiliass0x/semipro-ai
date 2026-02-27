import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Film, Loader2, MoveHorizontal, PlayCircle, RefreshCcw, Video } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ProjectFinalFilm, ScenePromptLayer, SceneVideoJob, SceneVideoPromptTrace, StoryboardScene, StorylineGenerationResult, StorylinePackageRecord } from '@/types';

type VideoStats = {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  queued: number;
  progress: number;
};

type ScenesWorkspaceProps = {
  generatedPackage: StorylineGenerationResult;
  latestPackage: StorylinePackageRecord | null;
  sceneVideosByBeatId: Record<string, SceneVideoJob>;
  videoStats: VideoStats;
  finalFilm: ProjectFinalFilm | null;
  isAuthenticated: boolean;
  isRefreshingVideos: boolean;
  isGeneratingAllVideos: boolean;
  isGeneratingFinalFilm: boolean;
  isGeneratingVideoBeatId: string | null;
  videoPromptByBeatId: Record<string, string>;
  cinematographerPromptByBeatId: Record<string, string>;
  promptLayerVersionByBeatId: Record<string, number>;
  promptLayerHistoryByBeatId: Record<string, ScenePromptLayer[]>;
  activePromptHistoryBeatId: string | null;
  isLoadingPromptHistory: boolean;
  traceHistoryByBeatId: Record<string, SceneVideoPromptTrace[]>;
  activeTraceBeatId: string | null;
  isLoadingTraceHistory: boolean;
  isSavingPromptLayerByBeatId: Record<string, boolean>;
  sceneFilmTypeByBeatId: Record<string, string>;
  sceneModelByBeatId: Record<string, 'seedance' | 'kling' | 'veo3'>;
  continuationModeByBeatId: Record<string, 'off' | 'strict' | 'balanced' | 'loose'>;
  anchorBeatIdByBeatId: Record<string, string>;
  autoRegenThresholdByBeatId: Record<string, number>;
  filmType: string;
  filmTypeOptions: string[];
  videoModelOptions: Array<{ key: 'seedance' | 'kling' | 'veo3'; label: string }>;
  cameraMoves: readonly string[];
  onRefreshSceneVideos: () => void;
  onGenerateAllSceneVideos: () => void;
  onGenerateFinalFilm: () => void;
  onGenerateSceneVideo: (beatId: string) => void;
  onSaveScenePromptLayer: (beatId: string) => void;
  onOpenPromptLayerHistory: (beatId: string) => void;
  onClosePromptLayerHistory: () => void;
  onOpenSceneVideoTraceHistory: (beatId: string) => void;
  onCloseSceneVideoTraceHistory: () => void;
  onRestoreScenePromptLayer: (beatId: string, layer: ScenePromptLayer) => void;
  onToggleSceneLock: (beatId: string, locked: boolean) => void;
  onChangeSceneFilmType: (beatId: string, filmType: string) => void;
  onChangeSceneModel: (beatId: string, value: 'seedance' | 'kling' | 'veo3') => void;
  onChangeContinuationMode: (beatId: string, value: 'off' | 'strict' | 'balanced' | 'loose') => void;
  onChangeAnchorBeatId: (beatId: string, value: string) => void;
  onChangeAutoRegenThreshold: (beatId: string, value: number) => void;
  onChangeVideoPrompt: (beatId: string, prompt: string) => void;
  onChangeCinematographerPrompt: (beatId: string, prompt: string) => void;
  onAppendCameraMove: (beatId: string, move: string) => void;
  getSceneFrameUrl: (scene: StoryboardScene) => string;
  getSceneVideoUrl: (url: string) => string;
};

export function ScenesWorkspace(props: ScenesWorkspaceProps) {
  const {
    generatedPackage,
    latestPackage,
    sceneVideosByBeatId,
    videoStats,
    finalFilm,
    isAuthenticated,
    isRefreshingVideos,
    isGeneratingAllVideos,
    isGeneratingFinalFilm,
    isGeneratingVideoBeatId,
    videoPromptByBeatId,
    cinematographerPromptByBeatId,
    promptLayerVersionByBeatId,
    promptLayerHistoryByBeatId,
    activePromptHistoryBeatId,
    isLoadingPromptHistory,
    traceHistoryByBeatId,
    activeTraceBeatId,
    isLoadingTraceHistory,
    isSavingPromptLayerByBeatId,
    sceneFilmTypeByBeatId,
    sceneModelByBeatId,
    continuationModeByBeatId,
    anchorBeatIdByBeatId,
    autoRegenThresholdByBeatId,
    filmType,
    filmTypeOptions,
    videoModelOptions,
    cameraMoves,
    onRefreshSceneVideos,
    onGenerateAllSceneVideos,
    onGenerateFinalFilm,
    onGenerateSceneVideo,
    onSaveScenePromptLayer,
    onOpenPromptLayerHistory,
    onClosePromptLayerHistory,
    onOpenSceneVideoTraceHistory,
    onCloseSceneVideoTraceHistory,
    onRestoreScenePromptLayer,
    onToggleSceneLock,
    onChangeSceneFilmType,
    onChangeSceneModel,
    onChangeContinuationMode,
    onChangeAnchorBeatId,
    onChangeAutoRegenThreshold,
    onChangeVideoPrompt,
    onChangeCinematographerPrompt,
    onAppendCameraMove,
    getSceneFrameUrl,
    getSceneVideoUrl,
  } = props;

  const orderedScenes = generatedPackage.storyboard || [];
  const [copiedDiagnosticsBeatId, setCopiedDiagnosticsBeatId] = useState<string | null>(null);

  const getContinuityBadge = (score: number, threshold: number) => {
    const safeScore = Math.max(0, Math.min(1, Number(score || 0)));
    const safeThreshold = Math.max(0, Math.min(1, Number(threshold || 0.75)));
    const delta = safeScore - safeThreshold;

    if (delta >= 0.1) {
      return {
        tone: 'good',
        label: 'Strong continuity',
        className: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
      };
    }
    if (delta >= 0) {
      return {
        tone: 'warn',
        label: 'At threshold',
        className: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
      };
    }
    return {
      tone: 'risk',
      label: 'Below threshold',
      className: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
    };
  };

  const activePromptHistoryScene = activePromptHistoryBeatId
    ? orderedScenes.find(scene => String(scene.beatId) === String(activePromptHistoryBeatId))
    : null;
  const activePromptHistoryItems = activePromptHistoryBeatId ? (promptLayerHistoryByBeatId[activePromptHistoryBeatId] || []) : [];
  const activeTraceScene = activeTraceBeatId
    ? orderedScenes.find(scene => String(scene.beatId) === String(activeTraceBeatId))
    : null;
  const activeTraceItems = activeTraceBeatId ? (traceHistoryByBeatId[activeTraceBeatId] || []) : [];

  const copyDiagnostics = async (scene: StoryboardScene) => {
    const beatId = String(scene?.beatId || '');
    const video = sceneVideosByBeatId[beatId];
    if (!beatId || !video) return;

    const diagnostics = [
      `sceneNumber=${String(scene.sceneNumber || '')}`,
      `beatId=${beatId}`,
      `status=${String(video.status || '')}`,
      `continuityScore=${Number(video.continuityScore ?? 0).toFixed(2)}`,
      `continuityThreshold=${Number(video.continuityThreshold ?? 0.75).toFixed(2)}`,
      `recommendRegenerate=${Boolean(video.recommendRegenerate)}`,
      `continuationMode=${String(continuationModeByBeatId[beatId] || 'strict')}`,
      `anchorBeatId=${String(anchorBeatIdByBeatId[beatId] || '') || 'auto'}`,
      `directorChars=${String(videoPromptByBeatId[beatId] || '').trim().length}`,
      `cinematographerChars=${String(cinematographerPromptByBeatId[beatId] || '').trim().length}`,
      `reason=${String(video.continuityReason || '')}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(diagnostics);
      setCopiedDiagnosticsBeatId(beatId);
      setTimeout(() => setCopiedDiagnosticsBeatId(current => (current === beatId ? null : current)), 1500);
    } catch {
      // ignore clipboard failures
    }
  };

  const formatTracePayload = (payload: Record<string, unknown>) => {
    try {
      return JSON.stringify(payload || {}, null, 2);
    } catch {
      return '{}';
    }
  };

  const readPath = (source: unknown, path: string): unknown => {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, source);
  };

  const summarizeTraceDiff = (latest: Record<string, unknown>, previous: Record<string, unknown>) => {
    const watchedPaths = [
      'input.promptOverride',
      'input.directorPrompt',
      'input.cinematographerPrompt',
      'input.filmType',
      'input.continuationMode',
      'input.anchorBeatId',
      'input.autoRegenerateThreshold',
      'resolved.directorLayerSource',
      'resolved.cinematographerLayerSource',
      'resolved.activeFilmType',
      'resolved.continuationMode',
      'resolved.anchorBeatId',
      'resolved.sourceImageUrl',
      'lengths.directorPrompt',
      'lengths.cinematographerPrompt',
      'lengths.mergedPrompt',
    ];

    return watchedPaths
      .map(path => {
        const current = readPath(latest, path);
        const prev = readPath(previous, path);
        const a = JSON.stringify(current ?? null);
        const b = JSON.stringify(prev ?? null);
        if (a === b) return null;
        return `${path}: ${String(prev ?? '(empty)')} -> ${String(current ?? '(empty)')}`;
      })
      .filter(Boolean) as string[];
  };

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#07131f]/70 via-black/60 to-[#1a1208]/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-gray-500"><Film className="w-4 h-4" /> Scenes Studio</span>
        {latestPackage && <p className="text-xs text-gray-500">v{latestPackage.version}</p>}
      </div>

      <div className="mb-4 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-sm text-cyan-100">
            <Video className="w-4 h-4" /> Scene Video Studio
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshSceneVideos}
              disabled={isRefreshingVideos}
              className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 disabled:opacity-50 inline-flex items-center gap-1"
            >
              {isRefreshingVideos ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />} Refresh
            </button>
            <button
              onClick={onGenerateAllSceneVideos}
              disabled={!isAuthenticated || isGeneratingAllVideos || videoStats.total === 0}
              className="text-xs px-2 py-1 rounded bg-[#D0FF59] text-black font-semibold disabled:opacity-50 inline-flex items-center gap-1"
            >
              {isGeneratingAllVideos ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />} Generate All Videos
            </button>
            <button
              onClick={onGenerateFinalFilm}
              disabled={!isAuthenticated || isGeneratingFinalFilm || finalFilm?.status === 'queued' || finalFilm?.status === 'processing' || videoStats.completed === 0}
              className="text-xs px-2 py-1 rounded border border-cyan-400/40 text-cyan-100 disabled:opacity-50 inline-flex items-center gap-1"
            >
              {isGeneratingFinalFilm ? <Loader2 className="w-3 h-3 animate-spin" /> : <Film className="w-3 h-3" />} Compile Final Film
            </button>
          </div>
        </div>
        <div className="w-full h-2 rounded bg-gray-900 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-[#D0FF59]" style={{ width: `${videoStats.progress}%` }} />
        </div>
        <p className="text-xs text-cyan-100/80">
          {videoStats.completed}/{videoStats.total} completed · {videoStats.processing} processing · {videoStats.queued} queued · {videoStats.failed} failed
        </p>
        {finalFilm?.status === 'completed' && finalFilm.videoUrl && (
          <div className="mt-2 rounded border border-cyan-400/30 bg-cyan-500/10 p-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[11px] uppercase tracking-widest text-cyan-200">Final Film</p>
              <a
                href={getSceneVideoUrl(finalFilm.videoUrl)}
                download
                className="text-[11px] px-2 py-1 rounded border border-cyan-300/40 text-cyan-100 hover:text-white"
              >
                Download Video
              </a>
            </div>
            <div className="rounded overflow-hidden border border-gray-800 bg-black/50 aspect-video">
              <video src={getSceneVideoUrl(finalFilm.videoUrl)} className="w-full h-full object-cover" controls preload="auto" playsInline />
            </div>
          </div>
        )}
        {(finalFilm?.status === 'queued' || finalFilm?.status === 'processing') && (
          <p className="text-[11px] text-amber-200 inline-flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Final film render {finalFilm.status === 'queued' ? 'queued' : 'in progress'}...
          </p>
        )}
        {finalFilm?.status === 'failed' && finalFilm.error && (
          <p className="text-[11px] text-rose-300">Final film failed: {finalFilm.error}</p>
        )}
      </div>

      <h4 className="text-xl text-white font-semibold">{generatedPackage.writeup.headline}</h4>
      <p className="text-sm text-gray-400 mt-1">{generatedPackage.writeup.deck}</p>
      <div className="mt-4">
        <div className="mb-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-gray-500">
          <MoveHorizontal className="w-3.5 h-3.5" />
          Horizontal Scroll
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-[#070b12] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-[#070b12] to-transparent" />
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex gap-3 min-w-max px-1 pr-2">
          {generatedPackage.storyboard.map((scene, beatIndex) => (
            <div
              key={`${scene.sceneNumber}-${scene.beatId}`}
              className="w-[320px] md:w-[360px] shrink-0 rounded-lg border border-gray-800 bg-black/30 p-3 space-y-2"
            >
              <div className="rounded-md overflow-hidden border border-gray-800 bg-black/40 aspect-video">
                <img
                  src={getSceneFrameUrl(scene)}
                  alt={`Scene ${scene.sceneNumber} concept frame`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {sceneVideosByBeatId[scene.beatId]?.status === 'completed' && sceneVideosByBeatId[scene.beatId]?.videoUrl ? (
                <div className="rounded-md overflow-hidden border border-gray-800 bg-black/40 aspect-video">
                  <video
                    src={getSceneVideoUrl(sceneVideosByBeatId[scene.beatId].videoUrl)}
                    className="w-full h-full object-cover"
                    controls
                    preload="auto"
                    playsInline
                  />
                </div>
              ) : null}
              
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-100">Scene {scene.sceneNumber} · Beat {beatIndex + 1}</p>
                <div className="flex items-center gap-2">
                  <select
                    value={sceneModelByBeatId[scene.beatId] || 'seedance'}
                    onChange={event => onChangeSceneModel(scene.beatId, event.target.value as 'seedance' | 'kling' | 'veo3')}
                    className="max-w-[108px] bg-black/40 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-200"
                    title="Generation model"
                  >
                    {videoModelOptions.map(option => (
                      <option key={`${scene.beatId}-quick-model-${option.key}`} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onGenerateSceneVideo(scene.beatId)}
                    disabled={!isAuthenticated || isGeneratingVideoBeatId === scene.beatId || sceneVideosByBeatId[scene.beatId]?.status === 'processing'}
                    className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-300 disabled:opacity-50"
                  >
                    {isGeneratingVideoBeatId === scene.beatId || sceneVideosByBeatId[scene.beatId]?.status === 'queued' || sceneVideosByBeatId[scene.beatId]?.status === 'processing'
                      ? <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Rendering</span>
                      : sceneVideosByBeatId[scene.beatId]?.status === 'completed'
                        ? <span className="inline-flex items-center gap-1"><RefreshCcw className="w-3 h-3" />Regenerate video</span>
                        : <span className="inline-flex items-center gap-1"><Video className="w-3 h-3" />Generate video</span>}
                  </button>
                  <button onClick={() => onToggleSceneLock(scene.beatId, !!scene.locked)} disabled={!isAuthenticated} className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-300 disabled:opacity-50">
                    {scene.locked ? 'Locked' : 'Unlocked'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">{scene.slugline}</p>
              <details className="rounded-md border border-gray-800 bg-black/20 p-2">
                <summary className="cursor-pointer text-[11px] uppercase tracking-widest text-gray-400">Video Prompt Controls</summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Scene Film Type</p>
                    <select
                      value={sceneFilmTypeByBeatId[scene.beatId] || filmType}
                      onChange={event => onChangeSceneFilmType(scene.beatId, event.target.value)}
                      className="w-full bg-black/40 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200"
                    >
                      {filmTypeOptions.map(option => (
                        <option key={`${scene.beatId}-${option}`} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Scene Continuation Mode</p>
                    <select
                      value={continuationModeByBeatId[scene.beatId] || 'strict'}
                      onChange={event => onChangeContinuationMode(scene.beatId, event.target.value as 'off' | 'strict' | 'balanced' | 'loose')}
                      className="w-full bg-black/40 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200"
                    >
                      <option value="off">off</option>
                      <option value="strict">strict</option>
                      <option value="balanced">balanced</option>
                      <option value="loose">loose</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Anchor Scene Frame</p>
                    <select
                      value={anchorBeatIdByBeatId[scene.beatId] || ''}
                      onChange={event => onChangeAnchorBeatId(scene.beatId, event.target.value)}
                      className="w-full bg-black/40 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200"
                    >
                      <option value="">Auto (current / previous scene)</option>
                      {orderedScenes
                        .filter(candidate => Number(candidate.sceneNumber || 0) < Number(scene.sceneNumber || 0))
                        .map(candidate => (
                          <option key={`${scene.beatId}-anchor-${candidate.beatId}`} value={candidate.beatId}>
                            Scene {candidate.sceneNumber} · {candidate.slugline || candidate.beatId}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Auto-Regenerate Threshold</p>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={Number(autoRegenThresholdByBeatId[scene.beatId] ?? 0.75)}
                      onChange={event => onChangeAutoRegenThreshold(scene.beatId, Number(event.target.value || 0.75))}
                      className="w-full bg-black/40 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200"
                    />
                  </div>
                  <textarea
                    value={videoPromptByBeatId[scene.beatId] || ''}
                    onChange={event => onChangeVideoPrompt(scene.beatId, event.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200 min-h-16"
                    placeholder="Director layer: performance, emotional tone, scene intent."
                  />
                  <textarea
                    value={cinematographerPromptByBeatId[scene.beatId] || ''}
                    onChange={event => onChangeCinematographerPrompt(scene.beatId, event.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200 min-h-16"
                    placeholder="Cinematographer layer: camera, lens feel, movement, lighting."
                  />
                  <div className="flex flex-wrap gap-1">
                    {cameraMoves.map(move => (
                      <button
                        key={`${scene.beatId}-${move}`}
                        onClick={() => onAppendCameraMove(scene.beatId, move)}
                        className="text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-300 hover:text-cyan-200"
                      >
                        {move}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-gray-500">
                      Prompt snapshot version: v{promptLayerVersionByBeatId[scene.beatId] || 0}
                    </p>
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onOpenPromptLayerHistory(scene.beatId)}
                        className="text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-300 hover:text-white"
                      >
                        History
                      </button>
                      <button
                        onClick={() => onSaveScenePromptLayer(scene.beatId)}
                        disabled={!isAuthenticated || !!isSavingPromptLayerByBeatId[scene.beatId]}
                        className="text-[10px] px-2 py-1 rounded border border-cyan-500/40 text-cyan-100 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {isSavingPromptLayerByBeatId[scene.beatId] ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Save Prompt Layer
                      </button>
                    </div>
                  </div>
                </div>
              </details>
              {sceneVideosByBeatId[scene.beatId] && (
                <div className="space-y-1">
                  <p className="text-[11px] text-cyan-200/80">
                    Video status: {sceneVideosByBeatId[scene.beatId].status}{sceneVideosByBeatId[scene.beatId].error ? ` · ${sceneVideosByBeatId[scene.beatId].error}` : ''}
                  </p>
                  {typeof sceneVideosByBeatId[scene.beatId].continuityScore === 'number' && (() => {
                    const score = Number(sceneVideosByBeatId[scene.beatId].continuityScore || 0);
                    const threshold = Number(sceneVideosByBeatId[scene.beatId].continuityThreshold ?? 0.75);
                    const badge = getContinuityBadge(score, threshold);
                    return (
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${badge.className}`}>
                          {badge.tone === 'good' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {badge.label}
                        </span>
                        <div className="inline-flex items-center gap-2">
                          <span className="text-[11px] text-gray-400">
                            Continuity {score.toFixed(2)} / {threshold.toFixed(2)}
                          </span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-[10px] px-2 py-0.5 rounded border border-gray-700 text-gray-300 hover:text-white">Why?</button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 bg-[#0a0a0a] border-gray-700 text-gray-200 p-3">
                              <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">Score Factors</p>
                              <div className="space-y-1 text-xs">
                                <p>Mode: <span className="text-cyan-200">{continuationModeByBeatId[scene.beatId] || 'strict'}</span></p>
                                <p>Anchor frame: <span className="text-cyan-200">{anchorBeatIdByBeatId[scene.beatId] ? `Scene beat ${anchorBeatIdByBeatId[scene.beatId]}` : 'Auto selection'}</span></p>
                                <p>Threshold: <span className="text-cyan-200">{Number(autoRegenThresholdByBeatId[scene.beatId] ?? 0.75).toFixed(2)}</span></p>
                                <p>Director layer length: <span className="text-cyan-200">{String(videoPromptByBeatId[scene.beatId] || '').trim().length} chars</span></p>
                                <p>Cinematographer layer length: <span className="text-cyan-200">{String(cinematographerPromptByBeatId[scene.beatId] || '').trim().length} chars</span></p>
                              </div>
                              {sceneVideosByBeatId[scene.beatId].continuityReason && (
                                <p className="text-[11px] text-amber-200/90 mt-2">{sceneVideosByBeatId[scene.beatId].continuityReason}</p>
                              )}
                              <button
                                onClick={() => copyDiagnostics(scene)}
                                className="mt-2 text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-300 hover:text-white"
                              >
                                {copiedDiagnosticsBeatId === scene.beatId ? 'Copied' : 'Copy diagnostics'}
                              </button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    );
                  })()}
                  {sceneVideosByBeatId[scene.beatId].continuityReason && (
                    <p className="text-[11px] text-amber-200/80">{sceneVideosByBeatId[scene.beatId].continuityReason}</p>
                  )}
                  {Boolean(sceneVideosByBeatId[scene.beatId].recommendRegenerate) && sceneVideosByBeatId[scene.beatId].status === 'completed' && (
                    <button
                      onClick={() => onGenerateSceneVideo(scene.beatId)}
                      disabled={!isAuthenticated || isGeneratingVideoBeatId === scene.beatId}
                      className="text-[10px] px-2 py-1 rounded border border-amber-400/60 text-amber-200 disabled:opacity-50"
                    >
                      Regenerate (Recommended)
                    </button>
                  )}
                  <button
                    onClick={() => onOpenSceneVideoTraceHistory(scene.beatId)}
                    className="text-[10px] px-2 py-1 rounded border border-cyan-500/40 text-cyan-100 hover:text-white"
                  >
                    Prompt Trace
                  </button>
                </div>
              )}
              <p className="text-[11px] text-gray-500 line-clamp-2">{scene.imagePrompt || scene.visualDirection}</p>
            </div>
          ))}
            </div>
          </div>
        </div>
      </div>

      {activeTraceBeatId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-gray-800 bg-[#050505] p-5 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-lg text-white font-semibold">
                Prompt Trace {activeTraceScene ? `· Scene ${activeTraceScene.sceneNumber}` : ''}
              </h4>
              <button onClick={onCloseSceneVideoTraceHistory} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300">Close</button>
            </div>
            {isLoadingTraceHistory ? (
              <p className="text-sm text-gray-400 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading prompt trace...</p>
            ) : activeTraceItems.length === 0 ? (
              <p className="text-sm text-gray-400">No prompt traces found yet for this scene.</p>
            ) : (
              <div className="space-y-3">
                {activeTraceItems.length > 1 && (
                  <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3">
                    <p className="text-[11px] uppercase tracking-widest text-cyan-200 mb-2">Latest vs Previous</p>
                    {(() => {
                      const latest = (activeTraceItems[0]?.payload || {}) as Record<string, unknown>;
                      const previous = (activeTraceItems[1]?.payload || {}) as Record<string, unknown>;
                      const changes = summarizeTraceDiff(latest, previous);
                      if (!changes.length) {
                        return <p className="text-xs text-gray-400">No tracked prompt inputs/resolved values changed.</p>;
                      }
                      return (
                        <div className="space-y-1">
                          {changes.map(change => (
                            <p key={change} className="text-xs text-gray-200">{change}</p>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {activeTraceItems.map(item => (
                  <div key={item.traceId} className="rounded-lg border border-gray-800 bg-black/30 p-3 space-y-2">
                    <p className="text-xs text-cyan-200">trace {item.traceId} · {new Date(item.createdAt).toLocaleString()}</p>
                    <pre className="text-[11px] text-gray-200 whitespace-pre-wrap break-words rounded border border-gray-800 bg-black/40 p-2 overflow-auto max-h-[360px]">
{formatTracePayload(item.payload)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activePromptHistoryBeatId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-800 bg-[#050505] p-5 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-lg text-white font-semibold">
                Prompt Layer History {activePromptHistoryScene ? `· Scene ${activePromptHistoryScene.sceneNumber}` : ''}
              </h4>
              <button onClick={onClosePromptLayerHistory} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300">Close</button>
            </div>
            {isLoadingPromptHistory ? (
              <p className="text-sm text-gray-400 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading prompt history...</p>
            ) : activePromptHistoryItems.length === 0 ? (
              <p className="text-sm text-gray-400">No prompt snapshots yet for this scene.</p>
            ) : (
              <div className="space-y-3">
                {activePromptHistoryItems.map(item => (
                  <div key={item.id} className="rounded-lg border border-gray-800 bg-black/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-cyan-200">v{item.version} · {item.source || 'manual'} · {new Date(item.createdAt).toLocaleString()}</p>
                      <button
                        onClick={() => onRestoreScenePromptLayer(String(activePromptHistoryBeatId), item)}
                        className="text-[10px] px-2 py-1 rounded border border-[#D0FF59]/40 text-[#D0FF59] hover:text-white"
                      >
                        Restore To Editor
                      </button>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-1">Director Layer</p>
                      <p className="text-xs text-gray-200 whitespace-pre-wrap">{item.directorPrompt || '(empty)'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-1">Cinematographer Layer</p>
                      <p className="text-xs text-gray-200 whitespace-pre-wrap">{item.cinematographerPrompt || '(empty)'}</p>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Continuation: {item.continuationMode || 'strict'} · Anchor: {item.anchorBeatId || 'auto'} · Threshold: {Number(item.autoRegenerateThreshold ?? 0.75).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
