import { Film, Loader2, PlayCircle, RefreshCcw, Video } from 'lucide-react';
import type { ProjectFinalFilm, SceneVideoJob, StorylineGenerationResult, StorylinePackageRecord } from '@/types';

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
  sceneFilmTypeByBeatId: Record<string, string>;
  filmType: string;
  filmTypeOptions: string[];
  cameraMoves: readonly string[];
  onRefreshSceneVideos: () => void;
  onGenerateAllSceneVideos: () => void;
  onGenerateFinalFilm: () => void;
  onGenerateSceneVideo: (beatId: string, prompt: string) => void;
  onToggleSceneLock: (beatId: string, locked: boolean) => void;
  onChangeSceneFilmType: (beatId: string, filmType: string) => void;
  onChangeVideoPrompt: (beatId: string, prompt: string) => void;
  onAppendCameraMove: (beatId: string, move: string) => void;
  getSceneFrameUrl: (scene: any) => string;
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
    sceneFilmTypeByBeatId,
    filmType,
    filmTypeOptions,
    cameraMoves,
    onRefreshSceneVideos,
    onGenerateAllSceneVideos,
    onGenerateFinalFilm,
    onGenerateSceneVideo,
    onToggleSceneLock,
    onChangeSceneFilmType,
    onChangeVideoPrompt,
    onAppendCameraMove,
    getSceneFrameUrl,
    getSceneVideoUrl,
  } = props;

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#07131f]/70 via-black/60 to-[#1a1208]/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-xs uppercase tracking-widest text-gray-500"><Film className="w-4 h-4" /> Scenes Workspace</p>
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
              disabled={!isAuthenticated || isGeneratingFinalFilm || videoStats.completed === 0}
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
            <p className="text-[11px] uppercase tracking-widest text-cyan-200 mb-1">Final Film</p>
            <div className="rounded overflow-hidden border border-gray-800 bg-black/50 aspect-video">
              <video src={getSceneVideoUrl(finalFilm.videoUrl)} className="w-full h-full object-cover" controls preload="auto" playsInline />
            </div>
          </div>
        )}
        {finalFilm?.status === 'failed' && finalFilm.error && (
          <p className="text-[11px] text-rose-300">Final film failed: {finalFilm.error}</p>
        )}
      </div>

      <h4 className="text-xl text-white font-semibold">{generatedPackage.writeup.headline}</h4>
      <p className="text-sm text-gray-400 mt-1">{generatedPackage.writeup.deck}</p>
      <div className="mt-4 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-3 min-w-max pr-2">
          {generatedPackage.storyboard.map(scene => (
            <div key={`${scene.sceneNumber}-${scene.beatId}`} className="w-[320px] md:w-[360px] shrink-0 rounded-lg border border-gray-800 bg-black/30 p-3 space-y-2">
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
              <div className="rounded-md overflow-hidden border border-gray-800 bg-black/40 aspect-video">
                <img
                  src={getSceneFrameUrl(scene)}
                  alt={`Scene ${scene.sceneNumber} concept frame`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-100">Scene {scene.sceneNumber} · Beat {scene.beatId}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onGenerateSceneVideo(scene.beatId, videoPromptByBeatId[scene.beatId] || '')}
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
                  <textarea
                    value={videoPromptByBeatId[scene.beatId] || ''}
                    onChange={event => onChangeVideoPrompt(scene.beatId, event.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200 min-h-16"
                    placeholder="Add director-level motion/acting/environment notes for this scene video."
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
                </div>
              </details>
              {sceneVideosByBeatId[scene.beatId] && (
                <p className="text-[11px] text-cyan-200/80">
                  Video status: {sceneVideosByBeatId[scene.beatId].status}{sceneVideosByBeatId[scene.beatId].error ? ` · ${sceneVideosByBeatId[scene.beatId].error}` : ''}
                </p>
              )}
              <p className="text-[11px] text-gray-500 line-clamp-2">{scene.imagePrompt || scene.visualDirection}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
