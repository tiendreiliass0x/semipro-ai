import { useEffect, useMemo, useRef, useState } from 'react';
import { Clapperboard, Compass, Lock, Mic, Palette, Plus, RefreshCcw, ShieldAlert, Sparkles, Unlock, Wand2, X, Film, ChevronLeft, ChevronRight, ChevronDown, Loader2, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { ContinuityIssue, MovieProject, ProjectBeat, ProjectFinalFilm, ProjectScenesBible, ProjectScreenplay, ProjectStyleBible, ScenePromptLayer, SceneVideoJob, SceneVideoPromptTrace, StorylineGenerationResult, StorylinePackageRecord, StoryNote } from '@/types';
import { DeleteProjectModal } from './project-studio/DeleteProjectModal';
import { ScenesWorkspace } from './project-studio/ScenesWorkspace';

export function ProjectStudio() {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<MovieProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [notes, setNotes] = useState<StoryNote[]>([]);
  const [beats, setBeats] = useState<ProjectBeat[]>([]);
  const [generatedPackage, setGeneratedPackage] = useState<StorylineGenerationResult | null>(null);
  const [latestPackage, setLatestPackage] = useState<StorylinePackageRecord | null>(null);
  const [styleBible, setStyleBible] = useState<ProjectStyleBible>({
    visualStyle: '',
    cameraGrammar: '',
    doList: [],
    dontList: [],
  });
  const [screenplay, setScreenplay] = useState<ProjectScreenplay['payload']>({
    title: '',
    format: 'hybrid',
    screenplay: '',
    scenes: [],
  });
  const [scenesBible, setScenesBible] = useState<ProjectScenesBible>({
    overview: '',
    characterCanon: '',
    locationCanon: '',
    cinematicLanguage: '',
    paletteAndTexture: '',
    continuityInvariants: [],
    progressionMap: '',
  });
  const [continuityIssues, setContinuityIssues] = useState<ContinuityIssue[]>([]);
  const [previewMode, setPreviewMode] = useState<'timeline' | 'intensity' | 'all' | null>(null);
  const [previewBeats, setPreviewBeats] = useState<ProjectBeat[]>([]);
  const [previewIssues, setPreviewIssues] = useState<ContinuityIssue[]>([]);
  const [sceneVideosByBeatId, setSceneVideosByBeatId] = useState<Record<string, SceneVideoJob>>({});
  const [finalFilm, setFinalFilm] = useState<ProjectFinalFilm | null>(null);

  const [projectIdeaInput, setProjectIdeaInput] = useState('');
  const [editingProjectTitle, setEditingProjectTitle] = useState('');
  const [editingProjectPseudoSynopsis, setEditingProjectPseudoSynopsis] = useState('');
  const [isEditingProjectDetails, setIsEditingProjectDetails] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [directorPrompt, setDirectorPrompt] = useState('Cinematic, emotionally grounded, practical for low-budget production.');
  const [filmType, setFilmType] = useState('cinematic live-action');
  const [storyboardImageModel, setStoryboardImageModel] = useState<'fal' | 'grok'>('fal');
  const [sceneFilmTypeByBeatId, setSceneFilmTypeByBeatId] = useState<Record<string, string>>({});
  const [sceneModelByBeatId, setSceneModelByBeatId] = useState<Record<string, 'seedance' | 'kling' | 'veo3'>>({});
  const [continuationModeByBeatId, setContinuationModeByBeatId] = useState<Record<string, 'off' | 'strict' | 'balanced' | 'loose'>>({});
  const [anchorBeatIdByBeatId, setAnchorBeatIdByBeatId] = useState<Record<string, string>>({});
  const [autoRegenThresholdByBeatId, setAutoRegenThresholdByBeatId] = useState<Record<string, number>>({});
  const [synopsisTab, setSynopsisTab] = useState<'pseudo' | 'polished' | 'screenplay' | 'scenesBible'>('pseudo');
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isRecordCreating, setIsRecordCreating] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isSavingProjectDetails, setIsSavingProjectDetails] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [leftSidebarPane, setLeftSidebarPane] = useState<'projects' | 'misc' | 'settings' | null>('projects');
  const [isRefiningSynopsis, setIsRefiningSynopsis] = useState(false);
  const [isSavingStyleBible, setIsSavingStyleBible] = useState(false);
  const [isGeneratingScreenplay, setIsGeneratingScreenplay] = useState(false);
  const [isSavingScreenplay, setIsSavingScreenplay] = useState(false);
  const [screenplayInlineError, setScreenplayInlineError] = useState<string | null>(null);
  const [isGeneratingScenesBible, setIsGeneratingScenesBible] = useState(false);
  const [isSavingScenesBible, setIsSavingScenesBible] = useState(false);
  const [scenesBibleInlineError, setScenesBibleInlineError] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isPolishingBeats, setIsPolishingBeats] = useState(false);
  const [isGeneratingMoreStarterBeats, setIsGeneratingMoreStarterBeats] = useState(false);
  const [isBeatCaptureInputOpen, setIsBeatCaptureInputOpen] = useState(true);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isRegeneratingAllStoryboardImages, setIsRegeneratingAllStoryboardImages] = useState(false);
  const [isRegeneratingStoryboardImageBeatId, setIsRegeneratingStoryboardImageBeatId] = useState<string | null>(null);
  const [showStoryboardPromptByBeatId, setShowStoryboardPromptByBeatId] = useState<Record<string, boolean>>({});
  const [isCheckingContinuity, setIsCheckingContinuity] = useState(false);
  const [isPreviewingFix, setIsPreviewingFix] = useState<'timeline' | 'intensity' | 'all' | null>(null);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [isGeneratingVideoBeatId, setIsGeneratingVideoBeatId] = useState<string | null>(null);
  const [notesFilter, setNotesFilter] = useState<'all' | 'mine' | 'ai_starter'>('all');
  const [isGeneratingAllVideos, setIsGeneratingAllVideos] = useState(false);
  const [isRefreshingVideos, setIsRefreshingVideos] = useState(false);
  const [isGeneratingFinalFilm, setIsGeneratingFinalFilm] = useState(false);
  const [videoPromptByBeatId, setVideoPromptByBeatId] = useState<Record<string, string>>({});
  const [cinematographerPromptByBeatId, setCinematographerPromptByBeatId] = useState<Record<string, string>>({});
  const [promptLayerVersionByBeatId, setPromptLayerVersionByBeatId] = useState<Record<string, number>>({});
  const [promptLayerHistoryByBeatId, setPromptLayerHistoryByBeatId] = useState<Record<string, ScenePromptLayer[]>>({});
  const [activePromptHistoryBeatId, setActivePromptHistoryBeatId] = useState<string | null>(null);
  const [isLoadingPromptHistory, setIsLoadingPromptHistory] = useState(false);
  const [traceHistoryByBeatId, setTraceHistoryByBeatId] = useState<Record<string, SceneVideoPromptTrace[]>>({});
  const [activeTraceBeatId, setActiveTraceBeatId] = useState<string | null>(null);
  const [isLoadingTraceHistory, setIsLoadingTraceHistory] = useState(false);
  const [isSavingPromptLayerByBeatId, setIsSavingPromptLayerByBeatId] = useState<Record<string, boolean>>({});
  const beatsScrollRef = useRef<HTMLDivElement | null>(null);
  const projectIdeaInputRef = useRef<HTMLTextAreaElement | null>(null);

  const filmTypeOptions = [
    'cinematic live-action',
    'manga anime style',
    'lego movie style',
    'pixar-inspired stylized 3d',
    'hand-painted watercolor animation',
    'neo-noir graphic novel',
    'retro 80s cyberpunk',
    'documentary realism',
  ];
  const videoModelOptions: Array<{ key: 'seedance' | 'kling' | 'veo3'; label: string }> = [
    { key: 'seedance', label: 'Seedance' },
    { key: 'kling', label: 'Kling' },
    { key: 'veo3', label: 'Veo 3' },
  ];
  const storyboardImageModelOptions: Array<{ key: 'fal' | 'grok'; label: string }> = [
    { key: 'fal', label: 'FAL Flux' },
    { key: 'grok', label: 'Grok Image' },
  ];

  const cameraMoves = [
    'Truck left',
    'Truck right',
    'Pan left',
    'Pan right',
    'Push in',
    'Pull out',
    'Pedestal up',
    'Pedestal down',
    'Tilt up',
    'Tilt down',
    'Zoom in',
    'Zoom out',
    'Shake',
    'Tracking shot',
    'Static shot',
  ] as const;

  const getFriendlySaveError = (error: unknown, label: 'screenplay' | 'scenes bible') => {
    const fallback = `We couldn't save the ${label}. Please try again.`;
    if (!(error instanceof Error)) return fallback;
    const text = String(error.message || '').toLowerCase();
    if (!text) return fallback;
    if (text.includes('authentication required') || text.includes('401')) return 'Your session expired. Please sign in again and retry.';
    if (text.includes('project not found') || text.includes('404')) return 'This project is no longer available. Refresh and try again.';
    if (text.includes('payload is required') || text.includes('400')) return `Some ${label} fields are missing. Please review and try again.`;
    if (text.includes('network') || text.includes('fetch')) return 'Network issue detected. Check your connection and retry.';
    return fallback;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getProjects();
        setProjects(data);
        if (!selectedProjectId && data.length) setSelectedProjectId(data[0].id);
      } catch {
        setProjects([]);
      }
    };
    load();
  }, []);

  const selectedProject = useMemo(() => {
    return projects.find(project => project.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const filteredNotes = useMemo(() => {
    if (notesFilter === 'all') return notes;
    if (notesFilter === 'ai_starter') return notes.filter(note => note.source === 'ai_starter');
    return notes.filter(note => note.source !== 'ai_starter');
  }, [notes, notesFilter]);

  const createStarterBeatStories = (synopsis: string): string[] => {
    const intro = (synopsis || '').trim().split(/\n+/)[0] || '';
    if (!intro) return [];

    const sentences = intro
      .split(/(?<=[.!?])\s+/)
      .map(item => item.trim())
      .filter(Boolean);

    const seeds = sentences.length > 0 ? sentences : [intro];
    const maxCount = 5;
    const targetCount = Math.max(4, Math.min(maxCount, seeds.length));
    const drafts: string[] = [];

    for (let index = 0; index < targetCount; index++) {
      const source = seeds[index % seeds.length];
      const cleaned = source.replace(/["“”]/g, '').trim();
      if (!cleaned) continue;
      const prefix = index === 0 ? 'Opening setup:' : index === targetCount - 1 ? 'Tension rise:' : 'Beat story:';
      drafts.push(`${prefix} ${cleaned}`);
    }

    return Array.from(new Set(drafts)).slice(0, maxCount);
  };

  const createStarterBeatsFromSource = (textSource: string, existingAiStarters: string[]): string[] => {
    const raw = String(textSource || '').trim();
    if (!raw) return [];

    const introLine = raw.split(/\n+/)[0] || '';
    const chunks = raw
      .replace(introLine, '')
      .split(/\n+|(?<=[.!?])\s+/)
      .map(item => item.trim())
      .filter(item => item.length > 20);

    const existingSet = new Set(existingAiStarters.map(item => item.trim().toLowerCase()));
    const outputs: string[] = [];
    for (const chunk of chunks) {
      const line = `Beat story: ${chunk.replace(/^[\-\*\d\.\s]+/, '')}`;
      const normalized = line.trim().toLowerCase();
      if (existingSet.has(normalized)) continue;
      outputs.push(line);
      existingSet.add(normalized);
      if (outputs.length >= 6) break;
    }
    return outputs;
  };

  const upsertPromptLayerHistoryItem = (item: ScenePromptLayer | null | undefined) => {
    if (!item?.beatId) return;
    setPromptLayerHistoryByBeatId(prev => {
      const current = prev[item.beatId] || [];
      const merged = [item, ...current.filter(existing => existing.id !== item.id)]
        .sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
      return { ...prev, [item.beatId]: merged };
    });
  };

  useEffect(() => {
    if (!selectedProject) return;
    const loadDetails = async () => {
      const [notesResponse, beatsResponse, storyboardResponse, styleBibleResponse, continuityResponse, videosResponse, finalFilmResponse, screenplayResponse, scenesBibleResponse, promptLayersResponse] = await Promise.all([
        api.getProjectNotes(selectedProject.id).catch(() => ({ items: [] })),
        api.getProjectBeats(selectedProject.id).catch(() => ({ items: [] })),
        api.getLatestProjectStoryboard(selectedProject.id).catch(() => ({ item: null })),
        api.getProjectStyleBible(selectedProject.id).catch(() => ({ item: { visualStyle: '', cameraGrammar: '', doList: [], dontList: [] } })),
        api.checkProjectContinuity(selectedProject.id).catch(() => ({ success: true, issues: [] })),
        api.listSceneVideos(selectedProject.id).catch(() => ({ items: [] })),
        api.getLatestProjectFinalFilm(selectedProject.id).catch(() => ({ item: null })),
        api.getProjectScreenplay(selectedProject.id).catch(() => ({ item: null })),
        api.getProjectScenesBible(selectedProject.id).catch(() => ({ item: null })),
        api.listScenePromptLayers(selectedProject.id).catch(() => ({ items: [] })),
      ]);
      setNotes(notesResponse.items || []);
      setBeats(beatsResponse.items || []);
      setLatestPackage(storyboardResponse.item || null);
      setGeneratedPackage(storyboardResponse.item?.payload || null);
      setStyleBible(styleBibleResponse.item);
      setContinuityIssues(continuityResponse.issues || []);
      const byBeat: Record<string, SceneVideoJob> = {};
      (videosResponse.items || []).forEach(item => {
        if (item?.beatId) byBeat[item.beatId] = item;
      });
      setSceneVideosByBeatId(byBeat);
      setFinalFilm(finalFilmResponse.item || null);
      setScreenplay(screenplayResponse.item?.payload || { title: '', format: 'hybrid', screenplay: '', scenes: [] });
      setScenesBible(scenesBibleResponse.item || {
        overview: '',
        characterCanon: '',
        locationCanon: '',
        cinematicLanguage: '',
        paletteAndTexture: '',
        continuityInvariants: [],
        progressionMap: '',
      });
      const scenePromptLayers = (promptLayersResponse.items || []) as ScenePromptLayer[];
      const directorByBeat: Record<string, string> = {};
      const cinematographerByBeat: Record<string, string> = {};
      const filmTypeByBeat: Record<string, string> = {};
      const modelByBeat: Record<string, 'seedance' | 'kling' | 'veo3'> = {};
      const continuationModeByBeat: Record<string, 'off' | 'strict' | 'balanced' | 'loose'> = {};
      const anchorByBeat: Record<string, string> = {};
      const thresholdByBeat: Record<string, number> = {};
      const versionByBeat: Record<string, number> = {};
      scenePromptLayers.forEach(item => {
        if (!item?.beatId) return;
        directorByBeat[item.beatId] = String(item.directorPrompt || '');
        cinematographerByBeat[item.beatId] = String(item.cinematographerPrompt || '');
        if (String(item.filmType || '').trim()) {
          filmTypeByBeat[item.beatId] = String(item.filmType);
        }
        if (item.generationModel === 'seedance' || item.generationModel === 'kling' || item.generationModel === 'veo3') {
          modelByBeat[item.beatId] = item.generationModel;
        }
        if (item.continuationMode === 'off' || item.continuationMode === 'strict' || item.continuationMode === 'balanced' || item.continuationMode === 'loose') {
          continuationModeByBeat[item.beatId] = item.continuationMode;
        }
        if (String(item.anchorBeatId || '').trim()) {
          anchorByBeat[item.beatId] = String(item.anchorBeatId);
        }
        thresholdByBeat[item.beatId] = Number(item.autoRegenerateThreshold ?? 0.75);
        versionByBeat[item.beatId] = Number(item.version || 1);
      });
      setVideoPromptByBeatId(directorByBeat);
      setCinematographerPromptByBeatId(cinematographerByBeat);
      setSceneFilmTypeByBeatId(filmTypeByBeat);
      setSceneModelByBeatId(modelByBeat);
      setContinuationModeByBeatId(continuationModeByBeat);
      setAnchorBeatIdByBeatId(anchorByBeat);
      setAutoRegenThresholdByBeatId(thresholdByBeat);
      setPromptLayerVersionByBeatId(versionByBeat);
      setPromptLayerHistoryByBeatId({});
      setActivePromptHistoryBeatId(null);
      setTraceHistoryByBeatId({});
      setActiveTraceBeatId(null);
    };
    loadDetails();
  }, [selectedProject?.id]);

  const openPromptLayerHistory = async (beatId: string) => {
    if (!selectedProject?.id) return;
    setActivePromptHistoryBeatId(beatId);
    setIsLoadingPromptHistory(true);
    try {
      const response = await api.getScenePromptLayerHistory(selectedProject.id, beatId);
      setPromptLayerHistoryByBeatId(prev => ({
        ...prev,
        [beatId]: response.items || [],
      }));
    } finally {
      setIsLoadingPromptHistory(false);
    }
  };

  const openSceneVideoTraceHistory = async (beatId: string) => {
    if (!selectedProject?.id) return;
    setActiveTraceBeatId(beatId);
    setIsLoadingTraceHistory(true);
    try {
      const response = await api.listSceneVideoPromptTraces(selectedProject.id, beatId, 20);
      setTraceHistoryByBeatId(prev => ({
        ...prev,
        [beatId]: response.items || [],
      }));
    } finally {
      setIsLoadingTraceHistory(false);
    }
  };

  const restoreScenePromptLayer = (beatId: string, layer: ScenePromptLayer) => {
    if (!beatId || !layer) return;
    setVideoPromptByBeatId(prev => ({ ...prev, [beatId]: String(layer.directorPrompt || '') }));
    setCinematographerPromptByBeatId(prev => ({ ...prev, [beatId]: String(layer.cinematographerPrompt || '') }));
    if (String(layer.filmType || '').trim()) {
      setSceneFilmTypeByBeatId(prev => ({ ...prev, [beatId]: String(layer.filmType) }));
    }
    if (layer.generationModel === 'seedance' || layer.generationModel === 'kling' || layer.generationModel === 'veo3') {
      setSceneModelByBeatId(prev => ({ ...prev, [beatId]: layer.generationModel }));
    }
    if (layer.continuationMode === 'off' || layer.continuationMode === 'strict' || layer.continuationMode === 'balanced' || layer.continuationMode === 'loose') {
      setContinuationModeByBeatId(prev => ({ ...prev, [beatId]: layer.continuationMode }));
    }
    setAnchorBeatIdByBeatId(prev => ({ ...prev, [beatId]: String(layer.anchorBeatId || '') }));
    setAutoRegenThresholdByBeatId(prev => ({ ...prev, [beatId]: Number(layer.autoRegenerateThreshold ?? 0.75) }));
    setActivePromptHistoryBeatId(null);
    setBusyMessage(`Restored prompt layer v${layer.version} to scene editor.`);
  };

  useEffect(() => {
    if (!selectedProject) return;
    setEditingProjectTitle(selectedProject.title || '');
    setEditingProjectPseudoSynopsis(selectedProject.pseudoSynopsis || '');
    setFilmType(String(selectedProject.filmType || '').trim() || 'cinematic live-action');
    setIsEditingProjectDetails(false);
    setLeftSidebarPane('projects');
    setScreenplayInlineError(null);
    setScenesBibleInlineError(null);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const hasRunning = Object.values(sceneVideosByBeatId).some(item => item.status === 'queued' || item.status === 'processing');
    if (!hasRunning) return;

    const timer = setInterval(async () => {
      const response = await api.listSceneVideos(selectedProject.id).catch(() => ({ items: [] }));
      const byBeat: Record<string, SceneVideoJob> = {};
      (response.items || []).forEach(item => {
        if (item?.beatId) byBeat[item.beatId] = item;
      });
      setSceneVideosByBeatId(byBeat);
    }, 4000);

    return () => clearInterval(timer);
  }, [selectedProject?.id, sceneVideosByBeatId]);

  const saveStyleBible = async () => {
    if (!selectedProject || !isAuthenticated) return;
    setIsSavingStyleBible(true);
    setBusyMessage('Saving style bible...');
    try {
      const response = await api.updateProjectStyleBible(selectedProject.id, styleBible);
      setStyleBible(response.item);
      setBusyMessage('Style bible saved.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to save style bible');
    } finally {
      setIsSavingStyleBible(false);
    }
  };

  const generateScreenplay = async () => {
    if (!selectedProject || !isAuthenticated || isGeneratingScreenplay) return;
    setIsGeneratingScreenplay(true);
    setBusyMessage('Generating hybrid screenplay...');
    try {
      const response = await api.generateProjectScreenplay(selectedProject.id);
      setScreenplay(response.item?.payload || { title: '', format: 'hybrid', screenplay: '', scenes: [] });
      setBusyMessage('Hybrid screenplay generated.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to generate screenplay');
    } finally {
      setIsGeneratingScreenplay(false);
    }
  };

  const saveScreenplay = async () => {
    if (!selectedProject || !isAuthenticated || isSavingScreenplay) return;
    setIsSavingScreenplay(true);
    setScreenplayInlineError(null);
    setBusyMessage('Saving screenplay...');
    try {
      const payload = {
        title: String(screenplay.title || selectedProject.title || '').trim(),
        format: String(screenplay.format || 'hybrid').trim() || 'hybrid',
        screenplay: String(screenplay.screenplay || ''),
        scenes: Array.isArray(screenplay.scenes) ? screenplay.scenes : [],
      };
      const response = await api.updateProjectScreenplay(selectedProject.id, payload);
      if (response.item?.payload) {
        setScreenplay(response.item.payload);
      }
      setBusyMessage(`Screenplay saved (v${response.item?.version || 'n/a'}).`);
    } catch (error) {
      const friendly = getFriendlySaveError(error, 'screenplay');
      setScreenplayInlineError(friendly);
      setBusyMessage(friendly);
    } finally {
      setIsSavingScreenplay(false);
    }
  };

  const generateScenesBible = async () => {
    if (!selectedProject || !isAuthenticated || isGeneratingScenesBible) return;
    setIsGeneratingScenesBible(true);
    setBusyMessage('Generating scenes bible...');
    try {
      const response = await api.generateProjectScenesBible(selectedProject.id);
      if (response.item) setScenesBible(response.item);
      setBusyMessage('Scenes bible generated.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to generate scenes bible');
    } finally {
      setIsGeneratingScenesBible(false);
    }
  };

  const saveScenesBible = async () => {
    if (!selectedProject || !isAuthenticated || isSavingScenesBible) return;
    setIsSavingScenesBible(true);
    setScenesBibleInlineError(null);
    setBusyMessage('Saving scenes bible...');
    try {
      const payload = {
        overview: String(scenesBible.overview || ''),
        characterCanon: String(scenesBible.characterCanon || ''),
        locationCanon: String(scenesBible.locationCanon || ''),
        cinematicLanguage: String(scenesBible.cinematicLanguage || ''),
        paletteAndTexture: String(scenesBible.paletteAndTexture || ''),
        continuityInvariants: Array.isArray(scenesBible.continuityInvariants) ? scenesBible.continuityInvariants : [],
        progressionMap: String(scenesBible.progressionMap || ''),
      };
      const response = await api.updateProjectScenesBible(selectedProject.id, payload);
      if (response.item) {
        setScenesBible(response.item);
      }
      setBusyMessage('Scenes bible saved.');
    } catch (error) {
      const friendly = getFriendlySaveError(error, 'scenes bible');
      setScenesBibleInlineError(friendly);
      setBusyMessage(friendly);
    } finally {
      setIsSavingScenesBible(false);
    }
  };

  const createProjectFromInput = async (input: { pseudoSynopsis: string; title?: string }) => {
    if (!isAuthenticated || !input.pseudoSynopsis.trim()) return;
    setIsCreatingProject(true);
    setBusyMessage('Creating project...');
    try {
      const created = await api.createProject({
        title: (input.title || '').trim() || undefined,
        pseudoSynopsis: input.pseudoSynopsis.trim(),
        style: 'cinematic',
        filmType,
        durationMinutes: 1,
      });
      setProjects(prev => [created, ...prev]);
      setSelectedProjectId(created.id);
      setFilmType(String(created.filmType || '').trim() || filmType);
      setProjectIdeaInput('');
      setBusyMessage('Project created.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const createProjectFromIdeaBox = async () => {
    await createProjectFromInput({
      pseudoSynopsis: projectIdeaInput,
    });
  };

  const handleFilmTypeChange = async (nextFilmTypeRaw: string) => {
    const nextFilmType = String(nextFilmTypeRaw || '').trim();
    setFilmType(nextFilmType);
    if (!selectedProject || !isAuthenticated || !nextFilmType) return;
    if (String(selectedProject.filmType || '').trim() === nextFilmType) return;
    try {
      const response = await api.updateProject(selectedProject.id, { filmType: nextFilmType });
      setProjects(prev => prev.map(project => (project.id === selectedProject.id ? response.item : project)));
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to save film style');
    }
  };

  const startNoteRecording = () => {
    if (!selectedProject?.id || !isAuthenticated) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setBusyMessage('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = '';
    recognition.onstart = () => {
      setIsListening(true);
      setBusyMessage('Listening... speak your beat story.');
    };
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) setBusyMessage(`Listening... ${interim}`);
    };
    recognition.onerror = () => {
      setBusyMessage('Could not capture audio note. Try again.');
      setIsListening(false);
    };
    recognition.onend = async () => {
      setIsListening(false);
      const text = finalText.trim();
      if (!text) return;
      setNoteInput(prev => `${prev ? `${prev}\n` : ''}${text}`.trim());
      setBusyMessage('Audio captured. Review then click Add.');
    };

    recognition.start();
  };

  const recordProjectIdea = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setBusyMessage('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = '';
    recognition.onstart = () => {
      setIsRecordCreating(true);
      setBusyMessage('Listening... capture your project idea.');
    };
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += `${transcript} `;
        } else {
          interim += transcript;
        }
      }
      if (interim) setBusyMessage(`Listening... ${interim}`);
    };
    recognition.onerror = () => {
      setBusyMessage('Could not capture audio idea. Try again.');
      setIsRecordCreating(false);
    };
    recognition.onend = async () => {
      setIsRecordCreating(false);
      const transcript = finalText.trim();
      if (!transcript) {
        setBusyMessage('No audio captured. Try again.');
        return;
      }

      setProjectIdeaInput(prev => `${prev ? `${prev}\n\n` : ''}${transcript}`.trim());
      setBusyMessage('Audio idea captured. Press Enter to start creating.');
    };

    recognition.start();
  };

  const refineSynopsis = async () => {
    if (!selectedProject || !isAuthenticated) return;
    setIsRefiningSynopsis(true);
    setBusyMessage('Refining synopsis...');
    try {
      const response = await api.refineProjectSynopsis(selectedProject.id);
      setProjects(prev => prev.map(project => project.id === selectedProject.id ? response.project : project));

      if (notes.length === 0) {
        const starterBeatStories = createStarterBeatStories(response.refined?.synopsis || response.project?.polishedSynopsis || '');
        if (starterBeatStories.length > 0) {
          setBusyMessage('Seeding starter beat stories...');
          const seededItems: StoryNote[] = [];
          for (const rawText of starterBeatStories) {
            const seeded = await api.addProjectNote(selectedProject.id, { rawText, source: 'ai_starter' });
            seededItems.push(seeded.item);
          }
          setNotes(seededItems);
        }
      }

      setBusyMessage('Synopsis polished.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to refine synopsis');
    } finally {
      setIsRefiningSynopsis(false);
    }
  };

  const addNote = async () => {
    if (!selectedProject || !isAuthenticated || !noteInput.trim()) return;
    setIsAddingNote(true);
    setBusyMessage('Adding note...');
    try {
      const response = await api.addProjectNote(selectedProject.id, { rawText: noteInput.trim(), source: 'typed' });
      setNotes(prev => [...prev, response.item]);
      setNoteInput('');
      setBusyMessage('Note added.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const generateMoreAiStarterBeats = async () => {
    if (!selectedProject || !isAuthenticated || isGeneratingMoreStarterBeats) return;
    const draftStarters = createStarterBeatsFromSource(
      selectedProject.polishedSynopsis || selectedProject.pseudoSynopsis,
      notes.filter(note => note.source === 'ai_starter').map(note => note.rawText)
    );

    if (draftStarters.length === 0) {
      setBusyMessage('No additional AI starter beats found from your current synopsis yet.');
      return;
    }

    setIsGeneratingMoreStarterBeats(true);
    setBusyMessage('Generating more AI starter beats...');
    try {
      const seededItems: StoryNote[] = [];
      for (const rawText of draftStarters) {
        const seeded = await api.addProjectNote(selectedProject.id, { rawText, source: 'ai_starter' });
        seededItems.push(seeded.item);
      }
      setNotes(prev => [...prev, ...seededItems]);
      setBusyMessage(`Added ${seededItems.length} AI starter beats from your synopsis.`);
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to generate more AI starter beats');
    } finally {
      setIsGeneratingMoreStarterBeats(false);
    }
  };

  const recordNote = () => startNoteRecording();

  const polishBeats = async () => {
    if (!selectedProject || !isAuthenticated) return;
    setIsPolishingBeats(true);
    setBusyMessage('Polishing beats from notes...');
    try {
      const response = await api.polishProjectBeats(selectedProject.id);
      setBeats(response.items || []);
      setBusyMessage(`Generated ${response.items.length} polished beats.`);
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to polish beats');
    } finally {
      setIsPolishingBeats(false);
    }
  };

  const toggleBeatLock = async (beat: ProjectBeat) => {
    if (!selectedProject || !isAuthenticated) return;
    try {
      const nextLocked = !beat.locked;
      const response = await api.setProjectBeatLock(selectedProject.id, beat.id, nextLocked);
      setBeats(prev => prev.map(item => item.id === beat.id ? { ...item, locked: response.item.locked } : item));
      setBusyMessage(nextLocked ? 'Beat locked.' : 'Beat unlocked.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to update beat lock');
    }
  };

  const toggleSceneLock = async (beatId: string, locked: boolean) => {
    if (!selectedProject || !isAuthenticated) return;
    try {
      const response = await api.setProjectStoryboardSceneLock(selectedProject.id, beatId, !locked);
      setLatestPackage(response.item);
      setGeneratedPackage(response.item.payload);
      setBusyMessage(!locked ? 'Scene locked.' : 'Scene unlocked.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to update scene lock');
    }
  };

  const runContinuityCheck = async () => {
    if (!selectedProject) return;
    setIsCheckingContinuity(true);
    setBusyMessage('Running continuity check...');
    try {
      const response = await api.checkProjectContinuity(selectedProject.id);
      setContinuityIssues(response.issues || []);
      setBusyMessage(`Continuity check complete: ${response.issues.length} issue(s).`);
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed continuity check');
    } finally {
      setIsCheckingContinuity(false);
    }
  };

  const previewContinuityFix = async (mode: 'timeline' | 'intensity' | 'all') => {
    if (!selectedProject || !isAuthenticated) return;
    setIsPreviewingFix(mode);
    setBusyMessage(`Previewing ${mode} continuity fix...`);
    try {
      const response = await api.fixProjectContinuity(selectedProject.id, mode, true);
      setPreviewMode(mode);
      setPreviewBeats(response.items || []);
      setPreviewIssues(response.issues || []);
      setBusyMessage(`Preview ready (${mode}).`);
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to preview continuity fix');
    } finally {
      setIsPreviewingFix(null);
    }
  };

  const applyPreviewFix = async () => {
    if (!selectedProject || !previewMode || !isAuthenticated) return;
    setIsApplyingFix(true);
    setBusyMessage(`Applying ${previewMode} continuity fix...`);
    try {
      const response = await api.fixProjectContinuity(selectedProject.id, previewMode, false);
      setBeats(response.items || []);
      setContinuityIssues(response.issues || []);
      setPreviewMode(null);
      setPreviewBeats([]);
      setPreviewIssues([]);
      setBusyMessage(`Auto-fix (${response.mode}) applied. ${response.issues.length} issue(s) remain.`);
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed continuity auto-fix');
    } finally {
      setIsApplyingFix(false);
    }
  };

  const previewChanges = useMemo(() => {
    if (!previewMode || !previewBeats.length) return [];
    const currentByOrder = new Map<number, ProjectBeat>();
    beats.forEach(beat => currentByOrder.set(Number(beat.orderIndex), beat));

    return previewBeats
      .map(candidate => {
        const current = currentByOrder.get(Number(candidate.orderIndex));
        if (!current) return null;
        const fieldsChanged: string[] = [];
        if (Number(current.minuteStart) !== Number(candidate.minuteStart)) fieldsChanged.push(`start ${current.minuteStart} -> ${candidate.minuteStart}`);
        if (Number(current.minuteEnd) !== Number(candidate.minuteEnd)) fieldsChanged.push(`end ${current.minuteEnd} -> ${candidate.minuteEnd}`);
        if (Number(current.intensity) !== Number(candidate.intensity)) fieldsChanged.push(`intensity ${current.intensity} -> ${candidate.intensity}`);
        if (!fieldsChanged.length) return null;
        return {
          orderIndex: candidate.orderIndex,
          beatId: candidate.id,
          locked: !!current.locked,
          fieldsChanged,
          text: candidate.polishedBeat,
        };
      })
      .filter(Boolean) as Array<{ orderIndex: number; beatId: string; locked: boolean; fieldsChanged: string[]; text: string }>;
  }, [beats, previewBeats, previewMode]);

  const hasProjectDetailChanges = useMemo(() => {
    if (!selectedProject) return false;
    const currentTitle = String(selectedProject.title || '').trim();
    const currentPseudoSynopsis = String(selectedProject.pseudoSynopsis || '').trim();
    return editingProjectTitle.trim() !== currentTitle || editingProjectPseudoSynopsis.trim() !== currentPseudoSynopsis;
  }, [selectedProject, editingProjectTitle, editingProjectPseudoSynopsis]);

  const miscStats = useMemo(() => {
    const aiStarters = notes.filter(note => note.source === 'ai_starter').length;
    const completedVideos = Object.values(sceneVideosByBeatId).filter(item => item?.status === 'completed').length;
    return {
      notes: notes.length,
      aiStarters,
      beats: beats.length,
      scenes: generatedPackage?.storyboard?.length || 0,
      completedVideos,
    };
  }, [notes, beats, generatedPackage, sceneVideosByBeatId]);

  const getSceneFrameUrl = (scene: any) => {
    if (scene.imageUrl && typeof scene.imageUrl === 'string') {
      if (scene.imageUrl.startsWith('/uploads/')) {
        return api.getUploadsUrl(scene.imageUrl);
      }
      if (scene.imageUrl.startsWith('http://') || scene.imageUrl.startsWith('https://')) {
        return scene.imageUrl;
      }
    }

    const basePrompt = scene.imagePrompt || `${scene.slugline}. ${scene.visualDirection}`;
    const fullPrompt = `${basePrompt}. cinematic storyboard frame, concept art, dramatic lighting, 16:9`;
    const seedSource = `${selectedProject?.id || 'project'}-${scene.sceneNumber}-${scene.beatId}`;
    const seed = Array.from(seedSource).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=576&seed=${seed}&nologo=true`;
  };

  const getSceneVideoUrl = (videoUrl: string) => {
    if (!videoUrl) return '';
    if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) return videoUrl;
    return api.getUploadsUrl(videoUrl);
  };

  const getStoryboardThumbBorder = (beatId: string) => {
    const status = sceneVideosByBeatId[beatId]?.status;
    if (status === 'completed') return 'border-[#D0FF59]';
    if (status === 'processing' || status === 'queued') return 'border-amber-400';
    if (status === 'failed') return 'border-rose-500';
    return 'border-gray-700';
  };

  const getStoryboardImagePromptText = (scene: any) => {
    return [
      filmType ? `Film type: ${filmType}` : '',
      String(scene?.imagePrompt || '').trim(),
      String(scene?.slugline || '').trim(),
      String(scene?.visualDirection || '').trim(),
      String(scene?.camera || '').trim() ? `Camera: ${String(scene.camera).trim()}` : '',
      String(scene?.audio || '').trim() ? `Audio mood: ${String(scene.audio).trim()}` : '',
    ].filter(Boolean).join('\n');
  };

  const generateStoryboard = async () => {
    if (!selectedProject || !isAuthenticated) return;
    setIsGeneratingStoryboard(true);
    setBusyMessage('Generating storyboard package...');
    try {
      const response = await api.generateProjectStoryboard(selectedProject.id, directorPrompt, filmType, storyboardImageModel);
      setGeneratedPackage(response.result);
      setLatestPackage(response.package);
      setBusyMessage(`Storyboard generated (v${response.package.version}).`);
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to generate storyboard');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const regenerateStoryboardImage = async (beatId: string) => {
    if (!selectedProject?.id || !isAuthenticated || !beatId) return;
    setIsRegeneratingStoryboardImageBeatId(beatId);
    setBusyMessage('Regenerating storyboard image...');
    try {
      const response = await api.regenerateStoryboardImage(selectedProject.id, beatId, {
        imageModelKey: storyboardImageModel,
        filmType,
      });
      if (response.item?.payload) {
        setLatestPackage(response.item);
        setGeneratedPackage(response.item.payload);
      }
      setBusyMessage('Storyboard image regenerated.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to regenerate storyboard image');
    } finally {
      setIsRegeneratingStoryboardImageBeatId(null);
    }
  };

  const regenerateAllStoryboardImages = async () => {
    if (!selectedProject?.id || !isAuthenticated) return;
    setIsRegeneratingAllStoryboardImages(true);
    setBusyMessage('Regenerating all storyboard images...');
    try {
      const response = await api.regenerateAllStoryboardImages(selectedProject.id, {
        imageModelKey: storyboardImageModel,
        filmType,
      });
      if (response.item?.payload) {
        setLatestPackage(response.item);
        setGeneratedPackage(response.item.payload);
      }
      setBusyMessage(`Storyboard images refreshed: ${response.refreshedCount} updated, ${response.failedCount} failed.`);
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to regenerate storyboard images');
    } finally {
      setIsRegeneratingAllStoryboardImages(false);
    }
  };

  const saveScenePromptLayer = async (beatId: string, source: string = 'manual-edit') => {
    if (!selectedProject?.id || !isAuthenticated) return null;
    setIsSavingPromptLayerByBeatId(prev => ({ ...prev, [beatId]: true }));
    try {
      const response = await api.saveScenePromptLayer(selectedProject.id, beatId, {
        directorPrompt: videoPromptByBeatId[beatId] || '',
        cinematographerPrompt: cinematographerPromptByBeatId[beatId] || '',
        filmType: sceneFilmTypeByBeatId[beatId] || filmType,
        modelKey: sceneModelByBeatId[beatId] || 'seedance',
        continuationMode: continuationModeByBeatId[beatId] || 'strict',
        anchorBeatId: anchorBeatIdByBeatId[beatId] || '',
        autoRegenerateThreshold: autoRegenThresholdByBeatId[beatId] ?? 0.75,
        source,
      });
      setPromptLayerVersionByBeatId(prev => ({ ...prev, [beatId]: response.item.version }));
      upsertPromptLayerHistoryItem(response.item);
      return response.item;
    } catch {
      return null;
    } finally {
      setIsSavingPromptLayerByBeatId(prev => ({ ...prev, [beatId]: false }));
    }
  };

  const generateSceneVideo = async (beatId: string) => {
    if (!selectedProject?.id || !isAuthenticated) return;
    setIsGeneratingVideoBeatId(beatId);
    setBusyMessage('Queueing scene video render...');
    try {
      const response = await api.generateSceneVideo(selectedProject.id, beatId, {
        directorPrompt: videoPromptByBeatId[beatId] || '',
        cinematographerPrompt: cinematographerPromptByBeatId[beatId] || '',
        filmType: sceneFilmTypeByBeatId[beatId] || filmType,
        imageModelKey: storyboardImageModel,
        modelKey: sceneModelByBeatId[beatId] || 'seedance',
        continuationMode: continuationModeByBeatId[beatId] || 'strict',
        anchorBeatId: anchorBeatIdByBeatId[beatId] || '',
        autoRegenerateThreshold: autoRegenThresholdByBeatId[beatId] ?? 0.75,
      });
      setSceneVideosByBeatId(prev => ({ ...prev, [beatId]: response.item }));
      if (response.promptLayer?.version) {
        setPromptLayerVersionByBeatId(prev => ({ ...prev, [beatId]: response.promptLayer!.version }));
      }
      upsertPromptLayerHistoryItem(response.promptLayer);
      setBusyMessage('Scene video job queued. Rendering in background...');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to generate scene video');
    } finally {
      setIsGeneratingVideoBeatId(null);
    }
  };

  const refreshSceneVideoStatuses = async () => {
    if (!selectedProject?.id) return;
    setIsRefreshingVideos(true);
    try {
      const response = await api.listSceneVideos(selectedProject.id);
      const byBeat: Record<string, SceneVideoJob> = {};
      (response.items || []).forEach(item => {
        if (item?.beatId) byBeat[item.beatId] = item;
      });
      setSceneVideosByBeatId(byBeat);
    } finally {
      setIsRefreshingVideos(false);
    }
  };

  const generateAllSceneVideos = async () => {
    if (!selectedProject?.id || !generatedPackage?.storyboard?.length || !isAuthenticated) return;
    setIsGeneratingAllVideos(true);
    setBusyMessage('Queueing all scene videos...');
    try {
      for (const scene of generatedPackage.storyboard) {
        const existing = sceneVideosByBeatId[scene.beatId];
        if (existing?.status === 'queued' || existing?.status === 'processing') continue;
        const response = await api.generateSceneVideo(selectedProject.id, scene.beatId, {
          directorPrompt: videoPromptByBeatId[scene.beatId] || '',
          cinematographerPrompt: cinematographerPromptByBeatId[scene.beatId] || '',
          filmType: sceneFilmTypeByBeatId[scene.beatId] || filmType,
          imageModelKey: storyboardImageModel,
          modelKey: sceneModelByBeatId[scene.beatId] || 'seedance',
          continuationMode: continuationModeByBeatId[scene.beatId] || 'strict',
          anchorBeatId: anchorBeatIdByBeatId[scene.beatId] || '',
          autoRegenerateThreshold: autoRegenThresholdByBeatId[scene.beatId] ?? 0.75,
        }).catch(() => null);
        if (response?.item) {
          setSceneVideosByBeatId(prev => ({ ...prev, [scene.beatId]: response.item }));
          if (response.promptLayer?.version) {
            setPromptLayerVersionByBeatId(prev => ({ ...prev, [scene.beatId]: response.promptLayer!.version }));
          }
          upsertPromptLayerHistoryItem(response.promptLayer);
        }
      }
      setBusyMessage('All scene video jobs queued. Rendering in background...');
    } finally {
      setIsGeneratingAllVideos(false);
    }
  };

  const videoStats = useMemo(() => {
    if (!generatedPackage?.storyboard?.length) {
      return { total: 0, completed: 0, processing: 0, failed: 0, queued: 0, progress: 0 };
    }

    const total = generatedPackage.storyboard.length;
    let completed = 0;
    let processing = 0;
    let failed = 0;
    let queued = 0;

    generatedPackage.storyboard.forEach(scene => {
      const status = sceneVideosByBeatId[scene.beatId]?.status;
      if (status === 'completed') completed += 1;
      else if (status === 'processing') processing += 1;
      else if (status === 'failed') failed += 1;
      else if (status === 'queued') queued += 1;
    });

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, processing, failed, queued, progress };
  }, [generatedPackage, sceneVideosByBeatId]);

  const appendCameraMoveToPrompt = (beatId: string, move: string) => {
    setCinematographerPromptByBeatId(prev => {
      const current = (prev[beatId] || '').trim();
      if (!current) return { ...prev, [beatId]: move };
      return { ...prev, [beatId]: `${current}, ${move}` };
    });
  };

  const scrollBeats = (direction: 'left' | 'right') => {
    if (!beatsScrollRef.current) return;
    beatsScrollRef.current.scrollBy({
      left: direction === 'left' ? -360 : 360,
      behavior: 'smooth',
    });
  };

  const resizeProjectIdeaInput = () => {
    const element = projectIdeaInputRef.current;
    if (!element) return;
    element.style.height = '0px';
    const nextHeight = Math.max(72, Math.min(element.scrollHeight, 220));
    element.style.height = `${nextHeight}px`;
  };

  useEffect(() => {
    resizeProjectIdeaInput();
  }, [projectIdeaInput]);

  const softDeleteCurrentProject = async () => {
    if (!selectedProject || !isAuthenticated || isDeletingProject) return;

    setIsDeletingProject(true);
    setBusyMessage('Soft-deleting project...');
    try {
      await api.softDeleteProject(selectedProject.id);
      const deletedId = selectedProject.id;
      const remainingProjects = projects.filter(project => project.id !== deletedId);
      setProjects(remainingProjects);
      setSelectedProjectId(remainingProjects[0]?.id || null);
      setGeneratedPackage(null);
      setLatestPackage(null);
      setNotes([]);
      setBeats([]);
      setContinuityIssues([]);
      setPreviewBeats([]);
      setPreviewIssues([]);
      setSceneVideosByBeatId({});
      setFinalFilm(null);
      setVideoPromptByBeatId({});
      setCinematographerPromptByBeatId({});
      setPromptLayerVersionByBeatId({});
      setPromptLayerHistoryByBeatId({});
      setActivePromptHistoryBeatId(null);
      setTraceHistoryByBeatId({});
      setActiveTraceBeatId(null);
      setSceneFilmTypeByBeatId({});
      setSceneModelByBeatId({});
      setContinuationModeByBeatId({});
      setAnchorBeatIdByBeatId({});
      setAutoRegenThresholdByBeatId({});
      setShowStoryboardPromptByBeatId({});
      setScreenplay({ title: '', format: 'hybrid', screenplay: '', scenes: [] });
      setScenesBible({
        overview: '',
        characterCanon: '',
        locationCanon: '',
        cinematicLanguage: '',
        paletteAndTexture: '',
        continuityInvariants: [],
        progressionMap: '',
      });
      setShowDeleteConfirmModal(false);
      setBusyMessage('Project soft-deleted.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to soft-delete project');
    } finally {
      setIsDeletingProject(false);
    }
  };

  const saveProjectDetails = async () => {
    if (!selectedProject || !isAuthenticated || isSavingProjectDetails) return;
    if (!editingProjectTitle.trim() || !editingProjectPseudoSynopsis.trim()) {
      setBusyMessage('Project title and logline are required.');
      return;
    }

    setIsSavingProjectDetails(true);
    setBusyMessage('Saving project details...');
    try {
      const response = await api.updateProject(selectedProject.id, {
        title: editingProjectTitle.trim(),
        pseudoSynopsis: editingProjectPseudoSynopsis.trim(),
        filmType,
      });
      setProjects(prev => prev.map(project => project.id === selectedProject.id ? response.item : project));
      setIsEditingProjectDetails(false);
      setBusyMessage('Project details updated.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to update project details');
    } finally {
      setIsSavingProjectDetails(false);
    }
  };

  const generateFinalFilm = async () => {
    if (!selectedProject || !isAuthenticated || isGeneratingFinalFilm) return;
    setIsGeneratingFinalFilm(true);
    setBusyMessage('Compiling final film from scene clips...');
    try {
      const response = await api.generateProjectFinalFilm(selectedProject.id);
      setFinalFilm(response.item || null);
      setBusyMessage('Final film compiled successfully.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to compile final film');
    } finally {
      setIsGeneratingFinalFilm(false);
    }
  };

  return (
    <>
    <section id="project-studio" className="relative min-h-screen py-20 overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-cyan-500/15 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full" />
      <div className="w-full">
        <div className="hidden xl:block fixed left-0 top-24 bottom-0 z-30 pb-3">
          <div className="h-full rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#07131f]/90 to-black/85 p-2 shadow-xl shadow-cyan-950/20 flex items-start gap-2 pr-1">
            <div className="w-14 rounded-xl border border-cyan-500/20 bg-black/35 p-1.5 flex flex-col gap-2">
              <button
                onClick={() => setLeftSidebarPane(prev => prev === 'projects' ? null : 'projects')}
                className={`w-full rounded-lg px-1 py-2 text-[10px] flex flex-col items-center gap-1 ${leftSidebarPane === 'projects' ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-400/40' : 'text-gray-400 border border-transparent hover:text-gray-200'}`}
              >
                <Film className="w-4 h-4" /> Projects
              </button>
              <button
                onClick={() => setLeftSidebarPane(prev => prev === 'misc' ? null : 'misc')}
                className={`w-full rounded-lg px-1 py-2 text-[10px] flex flex-col items-center gap-1 ${leftSidebarPane === 'misc' ? 'bg-cyan-500/15 text-cyan-100 border border-cyan-400/40' : 'text-gray-400 border border-transparent hover:text-gray-200'}`}
              >
                <Compass className="w-4 h-4" /> Misc
              </button>
              <button
                onClick={() => setLeftSidebarPane(prev => prev === 'settings' ? null : 'settings')}
                className={`w-full rounded-lg px-1 py-2 text-[10px] flex flex-col items-center gap-1 ${leftSidebarPane === 'settings' ? 'bg-rose-500/15 text-rose-100 border border-rose-400/40' : 'text-gray-400 border border-transparent hover:text-gray-200'}`}
              >
                <Palette className="w-4 h-4" /> Settings
              </button>
            </div>

            <div className={`h-full transition-all duration-200 ease-out overflow-hidden ${leftSidebarPane ? 'w-[270px] opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
              <div className="h-full rounded-xl border border-cyan-500/20 bg-black/30 p-3 overflow-auto">
                {leftSidebarPane === 'projects' ? (
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-widest text-gray-500">All Projects</p>
                    {projects.length === 0 ? (
                      <p className="text-xs text-gray-500">No projects yet. Create one from your idea box.</p>
                    ) : (
                      <div className="space-y-2">
                        {projects.map(project => (
                          <button
                            key={`sidebar-project-${project.id}`}
                            onClick={() => setSelectedProjectId(project.id)}
                            className={`w-full text-left rounded-lg border px-2.5 py-2 ${selectedProjectId === project.id ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-gray-800 bg-black/30 hover:border-gray-700'}`}
                          >
                            <p className="text-sm text-gray-100 truncate">{project.title}</p>
                            <p className="text-[11px] text-gray-500 mt-1">{project.durationMinutes} min · {project.style}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : !selectedProject ? (
                  <p className="text-xs text-gray-500">Select or create a project to see this pane.</p>
                ) : leftSidebarPane === 'misc' ? (
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-widest text-gray-500">Project Misc</p>
                    <div className="rounded-lg border border-gray-800 bg-black/30 p-3">
                      <p className="text-[11px] uppercase tracking-widest text-gray-500">Project</p>
                      <p className="text-sm text-gray-100 mt-1 break-words">{selectedProject.title}</p>
                      <p className="text-[11px] text-gray-500 mt-2">{selectedProject.durationMinutes} min · {selectedProject.style}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black/30 p-3 space-y-2">
                      <p className="text-[11px] uppercase tracking-widest text-gray-500">Live Stats</p>
                      <p className="text-xs text-gray-300">Notes: {miscStats.notes}</p>
                      <p className="text-xs text-gray-300">AI Starters: {miscStats.aiStarters}</p>
                      <p className="text-xs text-gray-300">Beat Scenes: {miscStats.beats}</p>
                      <p className="text-xs text-gray-300">Storyboard Scenes: {miscStats.scenes}</p>
                      <p className="text-xs text-gray-300">Videos Completed: {miscStats.completedVideos}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black/30 p-3 space-y-2">
                      <p className="text-[11px] uppercase tracking-widest text-gray-500">Pipeline Health</p>
                      <p className={`text-xs ${selectedProject.polishedSynopsis ? 'text-emerald-300' : 'text-gray-500'}`}>Polished Synopsis {selectedProject.polishedSynopsis ? 'ready' : 'pending'}</p>
                      <p className={`text-xs ${screenplay.screenplay ? 'text-emerald-300' : 'text-gray-500'}`}>Hybrid Screenplay {screenplay.screenplay ? 'ready' : 'pending'}</p>
                      <p className={`text-xs ${styleBible.visualStyle || styleBible.cameraGrammar ? 'text-emerald-300' : 'text-gray-500'}`}>Style Bible {(styleBible.visualStyle || styleBible.cameraGrammar) ? 'seeded' : 'pending'}</p>
                      <p className={`text-xs ${scenesBible.overview ? 'text-emerald-300' : 'text-gray-500'}`}>Scenes Bible {scenesBible.overview ? 'ready' : 'pending'}</p>
                      <p className={`text-xs ${finalFilm?.status === 'completed' ? 'text-emerald-300' : finalFilm?.status === 'failed' ? 'text-rose-300' : 'text-gray-500'}`}>Final Film {finalFilm?.status || 'not started'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-widest text-rose-200">Project Settings</p>
                    <p className="text-[11px] text-rose-100/80">Delete removes this project from active views while preserving data in the database.</p>
                    <button
                      onClick={() => setShowDeleteConfirmModal(true)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded border border-rose-400/40 text-rose-100 text-sm"
                    >
                      Delete Project
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start xl:pl-20">

          <div className="space-y-6 min-w-0">
            {!selectedProject && (
              <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-black/70 to-[#111827]/60 p-6 text-gray-300 space-y-4">
                <p className="text-sm text-gray-300">Start with your movie idea. We will create a project instantly from your input.</p>
                {!isAuthenticated && <p className="text-xs text-amber-200/80">Sign in first, then drop your first idea here.</p>}

                <div className={`relative rounded-2xl border bg-black/45 px-4 py-3 transition-all ${projectIdeaInput.trim() ? 'border-cyan-300/40 shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_28px_rgba(34,211,238,0.16)]' : 'border-cyan-500/20'}`}>
                  <textarea
                    ref={projectIdeaInputRef}
                    value={projectIdeaInput}
                    onChange={event => setProjectIdeaInput(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        createProjectFromIdeaBox();
                      }
                    }}
                    className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none pr-28 text-sm text-gray-100 resize-none leading-relaxed"
                    placeholder="Describe the film you want to create... tone, world, protagonist, stakes, style."
                    disabled={!isAuthenticated || isCreatingProject}
                    rows={1}
                  />

                  <div className="absolute right-3 bottom-3 inline-flex items-center gap-2">
                    <button
                      onClick={recordProjectIdea}
                      disabled={!isAuthenticated || isRecordCreating || isCreatingProject}
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-full border text-gray-200 bg-black/45 disabled:opacity-40 ${isRecordCreating ? 'border-[#D0FF59] animate-mic-pulse-ring' : 'border-gray-700'}`}
                      title={isRecordCreating ? 'Listening...' : 'Record idea'}
                    >
                      {isRecordCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={createProjectFromIdeaBox}
                      disabled={!isAuthenticated || !projectIdeaInput.trim() || isCreatingProject}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#D0FF59] text-black disabled:opacity-40"
                      title={isCreatingProject ? 'Creating...' : 'Start creating'}
                    >
                      {isCreatingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-800 bg-black/30 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-1">Film Style</p>
                  <select
                    value={filmType}
                    onChange={event => { void handleFilmTypeChange(event.target.value); }}
                    className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200"
                    disabled={!isAuthenticated || isCreatingProject}
                  >
                    {filmTypeOptions.map(option => (
                      <option key={`idea-film-type-${option}`} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-gray-500">Press Enter to submit. Use Shift+Enter for a new line.</p>
              </div>
            )}

            {selectedProject && (
              <>
                <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-[#1b1307]/70 via-black/60 to-[#07131f]/70 p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    {isEditingProjectDetails ? (
                      <input
                        value={editingProjectTitle}
                        onChange={event => setEditingProjectTitle(event.target.value)}
                        onBlur={() => {
                          if (!hasProjectDetailChanges) setIsEditingProjectDetails(false);
                        }}
                        className="flex-1 bg-black/40 border border-gray-700 rounded px-3 py-2 text-lg text-white"
                        placeholder="Project title"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setIsEditingProjectDetails(true)}
                        className="text-2xl text-white font-semibold text-left hover:text-cyan-100"
                        title="Click to edit title"
                      >
                        {selectedProject.title}
                      </button>
                    )}
                    <span className="text-xs uppercase tracking-widest text-gray-500">{selectedProject.durationMinutes}-min cinematic</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {([
                      { id: 'pseudo', label: 'Logline' },
                      { id: 'polished', label: 'Polished Synopsis' },
                      { id: 'screenplay', label: 'Screenplay' },
                      { id: 'scenesBible', label: 'Scenes Bible' },
                    ] as const).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setSynopsisTab(tab.id)}
                        className={`text-xs uppercase tracking-widest px-2 py-1 rounded border ${synopsisTab === tab.id ? 'border-amber-300/70 text-amber-100 bg-amber-400/10' : 'border-gray-700 text-gray-400'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="mb-3 max-w-sm">
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-1">Film Style</p>
                    <select
                      value={filmType}
                      onChange={event => { void handleFilmTypeChange(event.target.value); }}
                      className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200"
                    >
                      {filmTypeOptions.map(option => (
                        <option key={`project-film-type-${option}`} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {synopsisTab === 'pseudo' && (
                    <textarea
                      value={editingProjectPseudoSynopsis}
                      onChange={event => setEditingProjectPseudoSynopsis(event.target.value)}
                      className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 min-h-28"
                      placeholder="Logline"
                      disabled={!isAuthenticated}
                    />
                  )}
                  {synopsisTab === 'polished' && (
                    <p className="text-sm text-gray-200 whitespace-pre-line">{selectedProject.polishedSynopsis || 'Not polished yet.'}</p>
                  )}
                  {synopsisTab === 'screenplay' && (
                    <div className="space-y-2">
                      <textarea
                        value={screenplay.screenplay}
                        onChange={event => setScreenplay(prev => ({ ...prev, screenplay: event.target.value }))}
                        className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 min-h-44"
                        placeholder="Generate a hybrid screenplay from your story beats."
                        disabled={!isAuthenticated}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={generateScreenplay} disabled={!isAuthenticated || isGeneratingScreenplay} className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-700 text-sm text-gray-200 disabled:opacity-50">
                          {isGeneratingScreenplay ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {isGeneratingScreenplay ? 'Generating...' : 'Generate Screenplay'}
                        </button>
                        <button onClick={saveScreenplay} disabled={!isAuthenticated || isSavingScreenplay} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50">
                          {isSavingScreenplay ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {isSavingScreenplay ? 'Saving...' : 'Save Screenplay'}
                        </button>
                      </div>
                      {screenplayInlineError && (
                        <p className="text-xs text-rose-300">{screenplayInlineError}</p>
                      )}
                    </div>
                  )}
                  {synopsisTab === 'scenesBible' && (
                    <div className="space-y-2">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-widest text-gray-500">Overview</p>
                          <textarea
                            value={scenesBible.overview}
                            onChange={event => setScenesBible(prev => ({ ...prev, overview: event.target.value }))}
                            className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 min-h-24"
                            placeholder="Scenes bible overview"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-widest text-gray-500">Character Canon</p>
                          <textarea
                            value={scenesBible.characterCanon}
                            onChange={event => setScenesBible(prev => ({ ...prev, characterCanon: event.target.value }))}
                            className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 min-h-24"
                            placeholder="Character canon"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-widest text-gray-500">Location Canon</p>
                          <textarea
                            value={scenesBible.locationCanon}
                            onChange={event => setScenesBible(prev => ({ ...prev, locationCanon: event.target.value }))}
                            className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 min-h-24"
                            placeholder="Location canon"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-widest text-gray-500">Cinematic Language</p>
                          <textarea
                            value={scenesBible.cinematicLanguage}
                            onChange={event => setScenesBible(prev => ({ ...prev, cinematicLanguage: event.target.value }))}
                            className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 min-h-24"
                            placeholder="Cinematic language"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-widest text-gray-500">Palette and Texture</p>
                          <textarea
                            value={scenesBible.paletteAndTexture}
                            onChange={event => setScenesBible(prev => ({ ...prev, paletteAndTexture: event.target.value }))}
                            className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 min-h-24"
                            placeholder="Palette and texture"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-widest text-gray-500">Continuity Invariants</p>
                          <textarea
                            value={(scenesBible.continuityInvariants || []).join('\n')}
                            onChange={event => setScenesBible(prev => ({ ...prev, continuityInvariants: event.target.value.split('\n').map(item => item.trim()).filter(Boolean) }))}
                            className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 min-h-24"
                            placeholder="One invariant per line"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <p className="text-[11px] uppercase tracking-widest text-gray-500">Progression Map</p>
                          <textarea
                            value={scenesBible.progressionMap}
                            onChange={event => setScenesBible(prev => ({ ...prev, progressionMap: event.target.value }))}
                            className="w-full bg-black/40 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 min-h-24"
                            placeholder="Progression map"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={generateScenesBible} disabled={!isAuthenticated || isGeneratingScenesBible} className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-700 text-sm text-gray-200 disabled:opacity-50">
                          {isGeneratingScenesBible ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {isGeneratingScenesBible ? 'Generating...' : 'Generate Scenes Bible'}
                        </button>
                        <button onClick={saveScenesBible} disabled={!isAuthenticated || isSavingScenesBible} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50">
                          {isSavingScenesBible ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {isSavingScenesBible ? 'Saving...' : 'Save Scenes Bible'}
                        </button>
                      </div>
                      {scenesBibleInlineError && (
                        <p className="text-xs text-rose-300">{scenesBibleInlineError}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={refineSynopsis}
                      disabled={!isAuthenticated || isRefiningSynopsis || isSavingProjectDetails}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50"
                    >
                      {isRefiningSynopsis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} {isRefiningSynopsis ? 'Polishing...' : 'Create Polished Synopsis'}
                    </button>
                    {(isEditingProjectDetails || hasProjectDetailChanges) && (
                      <>
                        <button
                          onClick={saveProjectDetails}
                          disabled={!isAuthenticated || isSavingProjectDetails || !hasProjectDetailChanges}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50"
                        >
                          {isSavingProjectDetails ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          {isSavingProjectDetails ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingProjectDetails(false);
                            setEditingProjectTitle(selectedProject.title || '');
                            setEditingProjectPseudoSynopsis(selectedProject.pseudoSynopsis || '');
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-700 text-sm text-gray-300"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>

                </div>

                <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#08121f]/70 to-black/60 p-5">
                  <details>
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-200"><Palette className="w-4 h-4" /> Style Bible</span>
                      <span className="text-[11px] text-gray-500">Tap to expand</span>
                    </summary>
                    <div className="grid md:grid-cols-2 gap-3 mt-4">
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-widest text-gray-500">Visual Style</p>
                        <textarea
                          value={styleBible.visualStyle}
                          onChange={event => setStyleBible(prev => ({ ...prev, visualStyle: event.target.value }))}
                          className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-20"
                          placeholder="Visual style"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-widest text-gray-500">Camera Grammar</p>
                        <textarea
                          value={styleBible.cameraGrammar}
                          onChange={event => setStyleBible(prev => ({ ...prev, cameraGrammar: event.target.value }))}
                          className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-20"
                          placeholder="Camera grammar"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-widest text-gray-500">Do List</p>
                        <textarea
                          value={(styleBible.doList || []).join('\n')}
                          onChange={event => setStyleBible(prev => ({ ...prev, doList: event.target.value.split('\n').map(item => item.trim()).filter(Boolean) }))}
                          className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-20"
                          placeholder="One item per line"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-widest text-gray-500">Don't List</p>
                        <textarea
                          value={(styleBible.dontList || []).join('\n')}
                          onChange={event => setStyleBible(prev => ({ ...prev, dontList: event.target.value.split('\n').map(item => item.trim()).filter(Boolean) }))}
                          className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-20"
                          placeholder="One item per line"
                        />
                      </div>
                    </div>
                    <button onClick={saveStyleBible} disabled={!isAuthenticated || isSavingStyleBible} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-700 text-sm text-gray-200 hover:text-cyan-200 disabled:opacity-50">
                      {isSavingStyleBible ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {isSavingStyleBible ? 'Saving...' : 'Save Style Bible'}
                    </button>
                  </details>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#071712]/70 to-black/60 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-xs uppercase tracking-widest text-gray-500">Beat Story Capture</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsBeatCaptureInputOpen(prev => !prev)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-700 bg-[#D0FF59] text-black font-semibold text-[11px]"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${isBeatCaptureInputOpen ? 'rotate-180' : ''}`} />
                        {isBeatCaptureInputOpen ? 'Close': <><span>Add Beat Story</span><Plus className="w-4 h-4" /></>}
                      </button>
                      <button
                        onClick={generateMoreAiStarterBeats}
                        disabled={!isAuthenticated || isGeneratingMoreStarterBeats}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-cyan-400/40 text-cyan-100 text-[11px] disabled:opacity-50"
                      >
                        {isGeneratingMoreStarterBeats ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Generate More AI Starters
                      </button>
                    </div>
                  </div>
                  {isBeatCaptureInputOpen && (
                    <div className="flex gap-2">
                      <textarea value={noteInput} onChange={event => setNoteInput(event.target.value)} className="flex-1 bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-16" placeholder="Type a beat story note..." />
                      <button onClick={addNote} disabled={!isAuthenticated || isAddingNote} className="h-fit inline-flex items-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50">
                        {isAddingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {isAddingNote ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        onClick={recordNote}
                        disabled={!isAuthenticated || isListening}
                        className={`h-fit inline-flex items-center gap-2 px-3 py-2 rounded border text-sm text-gray-300 disabled:opacity-50 ${isListening ? 'border-[#D0FF59] animate-mic-pulse-ring' : 'border-gray-700'}`}
                      >
                        <Mic className="w-4 h-4" /> {isListening ? 'Listening...' : 'Record'}
                      </button>
                    </div>
                  )}
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {([
                        { key: 'all', label: 'All' },
                        { key: 'mine', label: 'Mine' },
                        { key: 'ai_starter', label: 'AI Starters' },
                      ] as const).map(filter => (
                        <button
                          key={filter.key}
                          onClick={() => setNotesFilter(filter.key)}
                          className={`text-[11px] px-2 py-1 rounded border ${notesFilter === filter.key ? 'border-cyan-400/60 text-cyan-100 bg-cyan-500/10' : 'border-gray-700 text-gray-400'}`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <div className="flex gap-2 min-w-max pr-2">
                        {filteredNotes.map(note => (
                          <div key={note.id} className="w-[300px] md:w-[360px] shrink-0 rounded-lg border border-gray-800 bg-black/30 px-3 py-2 text-sm text-gray-300">
                            {note.source === 'ai_starter' && (
                              <p className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-cyan-200 mb-1">
                                <Sparkles className="w-3 h-3" /> AI Starter
                              </p>
                            )}
                            {(note.source === 'typed' || note.source === 'audio') && (
                              <p className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-200 mb-1">
                                <Mic className="w-3 h-3" /> Your Beat Story
                              </p>
                            )}
                            {note.rawText}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#120b1f]/70 to-black/60 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-violet-200">
                      <Film className="w-4 h-4" /> Beat Scenes
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-violet-200/80">Swipe timeline</span>
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => scrollBeats('left')} className="p-1.5 rounded border border-gray-700 text-gray-300 hover:text-white">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => scrollBeats('right')} className="p-1.5 rounded border border-gray-700 text-gray-300 hover:text-white">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <button onClick={polishBeats} disabled={!isAuthenticated || isPolishingBeats} className="inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-700 text-sm text-gray-200 hover:text-[#D0FF59] disabled:opacity-50">
                        {isPolishingBeats ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {isPolishingBeats ? 'Polishing...' : 'Polish Beats'}
                      </button>
                    </div>
                  </div>
                  {isPolishingBeats && (
                    <div className="mb-3 rounded-md border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-100 inline-flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Building coherent beat timeline in background...
                    </div>
                  )}
                  <div className="relative min-w-0">
                    <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-[#120b1f] to-transparent z-10" />
                    <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-[#120b1f] to-transparent z-10" />
                    <div
                      ref={beatsScrollRef}
                      className="overflow-x-auto max-w-full pb-2"
                      style={{ WebkitOverflowScrolling: 'touch' }}
                      onWheel={event => {
                        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                          event.currentTarget.scrollLeft += event.deltaY;
                        }
                      }}
                    >
                      <div className="flex gap-3 min-w-max pr-4">
                      {beats.map(beat => (
                        <div key={beat.id} className="w-[280px] md:w-[320px] shrink-0 rounded-lg border border-gray-800 bg-black/35 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-[#D0FF59]">{beat.minuteStart}m - {beat.minuteEnd}m</p>
                            <button onClick={() => toggleBeatLock(beat)} disabled={!isAuthenticated} className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-300 disabled:opacity-50">
                              {beat.locked ? <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" />Locked</span> : <span className="inline-flex items-center gap-1"><Unlock className="w-3 h-3" />Unlocked</span>}
                            </button>
                          </div>
                          <p className="text-sm text-gray-200 mt-1">{beat.polishedBeat}</p>
                          <p className="text-xs text-gray-500 mt-2">Objective: {beat.objective || 'n/a'}</p>
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-gray-800 bg-black/25 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs uppercase tracking-widest text-gray-500">Continuity Checker</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={runContinuityCheck} disabled={isCheckingContinuity} className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-gray-700 rounded text-gray-300 disabled:opacity-50">
                          {isCheckingContinuity ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />} {isCheckingContinuity ? 'Checking...' : 'Run Check'}
                        </button>
                        <button onClick={() => previewContinuityFix('timeline')} disabled={!isAuthenticated || isPreviewingFix !== null} className="text-xs px-2 py-1 border border-gray-700 rounded text-gray-300 disabled:opacity-50">
                          {isPreviewingFix === 'timeline' ? 'Previewing...' : 'Preview Timeline'}
                        </button>
                        <button onClick={() => previewContinuityFix('intensity')} disabled={!isAuthenticated || isPreviewingFix !== null} className="text-xs px-2 py-1 border border-gray-700 rounded text-gray-300 disabled:opacity-50">
                          {isPreviewingFix === 'intensity' ? 'Previewing...' : 'Preview Intensity'}
                        </button>
                        <button onClick={() => previewContinuityFix('all')} disabled={!isAuthenticated || isPreviewingFix !== null} className="text-xs px-2 py-1 border border-gray-700 rounded text-[#D0FF59] disabled:opacity-50">
                          {isPreviewingFix === 'all' ? 'Previewing...' : 'Preview All'}
                        </button>
                      </div>
                    </div>
                    {continuityIssues.length === 0 ? (
                      <p className="text-xs text-gray-500">No continuity issues detected.</p>
                    ) : (
                      <div className="space-y-2">
                        {continuityIssues.slice(0, 8).map((issue, index) => (
                          <div key={`${issue.code}-${issue.beatId || index}`} className="rounded border border-gray-800 px-2 py-1">
                            <p className="text-xs text-gray-300">{issue.message}</p>
                            {issue.suggestion && <p className="text-[11px] text-gray-500 mt-1">{issue.suggestion}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </>
            )}
          </div>

          <aside className="space-y-6 min-w-0 self-start">
            {selectedProject && (
              <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-[#1d1206]/70 to-black/60 p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Storyboard</p>
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={regenerateAllStoryboardImages}
                      disabled={!isAuthenticated || isRegeneratingAllStoryboardImages || !generatedPackage?.storyboard?.length}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded border border-cyan-400/40 text-cyan-100 text-xs font-semibold disabled:opacity-50"
                    >
                      {isRegeneratingAllStoryboardImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                      {isRegeneratingAllStoryboardImages ? 'Refreshing...' : 'Regenerate All Images'}
                    </button>
                    <button onClick={generateStoryboard} disabled={!isAuthenticated || isGeneratingStoryboard} className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50">
                      {isGeneratingStoryboard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />} {isGeneratingStoryboard ? 'Generating...' : 'Generate Storyboard'}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">Director Prompt</p>
                <textarea value={directorPrompt} onChange={event => setDirectorPrompt(event.target.value)} className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-16" />
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-1">Storyboard Image Model</p>
                  <select
                    value={storyboardImageModel}
                    onChange={event => setStoryboardImageModel(event.target.value as 'fal' | 'grok')}
                    className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200"
                  >
                    {storyboardImageModelOptions.map(option => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                </div>
                {generatedPackage?.storyboard?.length ? (
                  <div className="mt-3 rounded-xl border border-white/25 bg-black/25 p-2.5">
                    <div
                      className="grid gap-2"
                      style={{ gridTemplateColumns: `repeat(${Math.max(generatedPackage.storyboard.length, 1)}, minmax(0, 1fr))` }}
                    >
                      {generatedPackage.storyboard.map(scene => (
                        <div
                          key={`storyboard-top-strip-${scene.beatId}`}
                          className={`relative w-full h-12 md:h-14 rounded-md overflow-hidden border-2 ${getStoryboardThumbBorder(scene.beatId)} bg-black/40`}
                          title={`Scene ${scene.sceneNumber}`}
                        >
                          <img
                            src={getSceneFrameUrl(scene)}
                            alt={`Scene ${scene.sceneNumber}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="flex gap-3 min-w-max px-1 pr-2 mt-4">
                {generatedPackage?.storyboard.map( scene => (
                  <div
                    key={`${scene.sceneNumber}-${scene.beatId}`}
                    className="w-[320px] md:w-[360px] shrink-0 rounded-lg border border-gray-800 bg-black/30 p-3 space-y-2"
                  >
                    <div className="relative rounded-md overflow-hidden border border-gray-800 bg-black/40 aspect-video">
                      {showStoryboardPromptByBeatId[scene.beatId] ? (
                        <div className="w-full h-full bg-black/70 px-3 py-2 overflow-auto">
                          <p className="text-[10px] uppercase tracking-widest text-cyan-200 mb-1">Storyboard Image Prompt</p>
                          <p className="text-[11px] text-gray-200 whitespace-pre-wrap">{getStoryboardImagePromptText(scene) || '(No prompt available)'}</p>
                        </div>
                      ) : (
                        <img
                          src={getSceneFrameUrl(scene)}
                          alt={`Scene ${scene.sceneNumber} concept frame`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <button
                        onClick={() => setShowStoryboardPromptByBeatId(prev => ({ ...prev, [scene.beatId]: !prev[scene.beatId] }))}
                        className="absolute z-10 left-1 top-1 inline-flex items-center justify-center px-2 h-5 rounded-full border border-black/30 bg-black/55 text-white text-[10px]"
                        title={showStoryboardPromptByBeatId[scene.beatId] ? 'Flip to image' : 'Flip to prompt'}
                      >
                        {showStoryboardPromptByBeatId[scene.beatId] ? 'Image' : 'Prompt'}
                      </button>
                      <button
                        onClick={() => regenerateStoryboardImage(scene.beatId)}
                        disabled={!isAuthenticated || isRegeneratingStoryboardImageBeatId === scene.beatId}
                        className="absolute z-10 right-1 top-1 inline-flex items-center justify-center w-5 h-5 rounded-full border border-black/30 bg-black/55 text-white disabled:opacity-50"
                        title="Regenerate scene image"
                      >
                        {isRegeneratingStoryboardImageBeatId === scene.beatId ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2">{scene.imagePrompt || scene.visualDirection}</p>
                  </div>)
                )}
                </div>
                </div>
              </div>
            )}

            {isGeneratingStoryboard && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-100 inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Creating scenes and rendering frame images in the background...
              </div>
            )}

            {generatedPackage && (
              <ScenesWorkspace
                generatedPackage={generatedPackage}
                latestPackage={latestPackage}
                sceneVideosByBeatId={sceneVideosByBeatId}
                videoStats={videoStats}
                finalFilm={finalFilm}
                isAuthenticated={isAuthenticated}
                isRefreshingVideos={isRefreshingVideos}
                isGeneratingAllVideos={isGeneratingAllVideos}
                isGeneratingFinalFilm={isGeneratingFinalFilm}
                isGeneratingVideoBeatId={isGeneratingVideoBeatId}
                videoPromptByBeatId={videoPromptByBeatId}
                cinematographerPromptByBeatId={cinematographerPromptByBeatId}
                promptLayerVersionByBeatId={promptLayerVersionByBeatId}
                promptLayerHistoryByBeatId={promptLayerHistoryByBeatId}
                activePromptHistoryBeatId={activePromptHistoryBeatId}
                isLoadingPromptHistory={isLoadingPromptHistory}
                traceHistoryByBeatId={traceHistoryByBeatId}
                activeTraceBeatId={activeTraceBeatId}
                isLoadingTraceHistory={isLoadingTraceHistory}
                isSavingPromptLayerByBeatId={isSavingPromptLayerByBeatId}
                sceneFilmTypeByBeatId={sceneFilmTypeByBeatId}
                sceneModelByBeatId={sceneModelByBeatId}
                continuationModeByBeatId={continuationModeByBeatId}
                anchorBeatIdByBeatId={anchorBeatIdByBeatId}
                autoRegenThresholdByBeatId={autoRegenThresholdByBeatId}
                filmType={filmType}
                filmTypeOptions={filmTypeOptions}
                videoModelOptions={videoModelOptions}
                cameraMoves={cameraMoves}
                onRefreshSceneVideos={refreshSceneVideoStatuses}
                onGenerateAllSceneVideos={generateAllSceneVideos}
                onGenerateFinalFilm={generateFinalFilm}
                onGenerateSceneVideo={generateSceneVideo}
                onSaveScenePromptLayer={beatId => saveScenePromptLayer(beatId)}
                onOpenPromptLayerHistory={openPromptLayerHistory}
                onClosePromptLayerHistory={() => setActivePromptHistoryBeatId(null)}
                onOpenSceneVideoTraceHistory={openSceneVideoTraceHistory}
                onCloseSceneVideoTraceHistory={() => setActiveTraceBeatId(null)}
                onRestoreScenePromptLayer={restoreScenePromptLayer}
                onToggleSceneLock={toggleSceneLock}
                onChangeSceneFilmType={(beatId, value) => setSceneFilmTypeByBeatId(prev => ({ ...prev, [beatId]: value }))}
                onChangeSceneModel={(beatId, value) => setSceneModelByBeatId(prev => ({ ...prev, [beatId]: value }))}
                onChangeContinuationMode={(beatId, value) => setContinuationModeByBeatId(prev => ({ ...prev, [beatId]: value }))}
                onChangeAnchorBeatId={(beatId, value) => setAnchorBeatIdByBeatId(prev => ({ ...prev, [beatId]: value }))}
                onChangeAutoRegenThreshold={(beatId, value) => setAutoRegenThresholdByBeatId(prev => ({ ...prev, [beatId]: value }))}
                onChangeVideoPrompt={(beatId, prompt) => setVideoPromptByBeatId(prev => ({ ...prev, [beatId]: prompt }))}
                onChangeCinematographerPrompt={(beatId, prompt) => setCinematographerPromptByBeatId(prev => ({ ...prev, [beatId]: prompt }))}
                onAppendCameraMove={appendCameraMoveToPrompt}
                getSceneFrameUrl={getSceneFrameUrl}
                getSceneVideoUrl={getSceneVideoUrl}
              />
            )}
          </aside>
        </div>

        {busyMessage && (
          <p className="text-sm text-gray-400 mt-6 flex items-center justify-center gap-2 text-center">
            {(isCreatingProject || isSavingProjectDetails || isRefiningSynopsis || isSavingStyleBible || isGeneratingScreenplay || isSavingScreenplay || isGeneratingScenesBible || isSavingScenesBible || isAddingNote || isPolishingBeats || isGeneratingMoreStarterBeats || isGeneratingStoryboard || isRegeneratingAllStoryboardImages || isRegeneratingStoryboardImageBeatId !== null || isCheckingContinuity || isPreviewingFix !== null || isApplyingFix || isGeneratingAllVideos || isRefreshingVideos || isGeneratingFinalFilm)
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : null}
            {busyMessage}
          </p>
        )}
      </div>

      {previewMode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-800 bg-[#050505] p-5 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-lg text-white font-semibold">Continuity Fix Preview ({previewMode})</h4>
              <button onClick={() => { setPreviewMode(null); setPreviewBeats([]); setPreviewIssues([]); }} className="p-1 rounded border border-gray-700 text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Proposed Beat Changes</p>
            {previewChanges.length === 0 ? (
              <p className="text-sm text-gray-400">No beat field changes are needed.</p>
            ) : (
              <div className="space-y-2">
                {previewChanges.map(change => (
                  <div key={`${change.orderIndex}-${change.beatId}`} className="rounded-lg border border-gray-800 bg-black/30 px-3 py-2">
                    <p className="text-xs text-[#D0FF59]">Beat #{change.orderIndex} {change.locked ? '(locked)' : ''}</p>
                    <p className="text-xs text-gray-300 mt-1">{change.fieldsChanged.join(' · ')}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs uppercase tracking-widest text-gray-500 mt-4 mb-2">Remaining Issues After Fix</p>
            {previewIssues.length === 0 ? (
              <p className="text-sm text-gray-400">No issues remain.</p>
            ) : (
              <div className="space-y-2">
                {previewIssues.slice(0, 8).map((issue, index) => (
                  <div key={`${issue.code}-${issue.beatId || index}`} className="rounded border border-gray-800 px-2 py-1">
                    <p className="text-xs text-gray-300">{issue.message}</p>
                    {issue.suggestion && <p className="text-[11px] text-gray-500 mt-1">{issue.suggestion}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => { setPreviewMode(null); setPreviewBeats([]); setPreviewIssues([]); }} className="px-3 py-2 rounded border border-gray-700 text-sm text-gray-300">
                Cancel
              </button>
              <button onClick={() => applyPreviewFix()} disabled={!isAuthenticated || isApplyingFix} className="px-4 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
                {isApplyingFix && <Loader2 className="w-4 h-4 animate-spin" />} {isApplyingFix ? 'Applying...' : 'Apply Fix'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteProjectModal
        open={showDeleteConfirmModal && !!selectedProject}
        projectTitle={selectedProject?.title || ''}
        isAuthenticated={isAuthenticated}
        isDeletingProject={isDeletingProject}
        onCancel={() => setShowDeleteConfirmModal(false)}
        onConfirmDelete={softDeleteCurrentProject}
      />
    </section>
    </>
  );
}
