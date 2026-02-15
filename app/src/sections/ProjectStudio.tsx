import { useEffect, useMemo, useRef, useState } from 'react';
import { Clapperboard, Compass, Lock, Mic, Palette, Plus, ShieldAlert, Sparkles, Unlock, Wand2, X, Film, ChevronLeft, ChevronRight, Loader2, Video, RefreshCcw, PlayCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { ContinuityIssue, MovieProject, ProjectBeat, ProjectStyleBible, SceneVideoJob, StorylineGenerationResult, StorylinePackageRecord, StoryNote } from '@/types';

export function ProjectStudio() {
  const { isAuthenticated, verifyKey, isVerifying, error: authError } = useAuth();
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
  const [continuityIssues, setContinuityIssues] = useState<ContinuityIssue[]>([]);
  const [previewMode, setPreviewMode] = useState<'timeline' | 'intensity' | 'all' | null>(null);
  const [previewBeats, setPreviewBeats] = useState<ProjectBeat[]>([]);
  const [previewIssues, setPreviewIssues] = useState<ContinuityIssue[]>([]);
  const [sceneVideosByBeatId, setSceneVideosByBeatId] = useState<Record<string, SceneVideoJob>>({});

  const [newTitle, setNewTitle] = useState('');
  const [newPseudoSynopsis, setNewPseudoSynopsis] = useState('');
  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [directorPrompt, setDirectorPrompt] = useState('Cinematic, emotionally grounded, practical for low-budget production.');
  const [filmType, setFilmType] = useState('cinematic live-action');
  const [sceneFilmTypeByBeatId, setSceneFilmTypeByBeatId] = useState<Record<string, string>>({});
  const [synopsisTab, setSynopsisTab] = useState<'pseudo' | 'polished' | 'plotScript'>('pseudo');
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isRecordCreating, setIsRecordCreating] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isRefiningSynopsis, setIsRefiningSynopsis] = useState(false);
  const [isSavingStyleBible, setIsSavingStyleBible] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isPolishingBeats, setIsPolishingBeats] = useState(false);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isCheckingContinuity, setIsCheckingContinuity] = useState(false);
  const [isPreviewingFix, setIsPreviewingFix] = useState<'timeline' | 'intensity' | 'all' | null>(null);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [isGeneratingVideoBeatId, setIsGeneratingVideoBeatId] = useState<string | null>(null);
  const [notesFilter, setNotesFilter] = useState<'all' | 'mine' | 'ai_starter'>('all');
  const [isGeneratingAllVideos, setIsGeneratingAllVideos] = useState(false);
  const [isRefreshingVideos, setIsRefreshingVideos] = useState(false);
  const [videoPromptByBeatId, setVideoPromptByBeatId] = useState<Record<string, string>>({});
  const beatsScrollRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!selectedProject) return;
    const loadDetails = async () => {
      const [notesResponse, beatsResponse, storyboardResponse, styleBibleResponse, continuityResponse, videosResponse] = await Promise.all([
        api.getProjectNotes(selectedProject.id).catch(() => ({ items: [] })),
        api.getProjectBeats(selectedProject.id).catch(() => ({ items: [] })),
        api.getLatestProjectStoryboard(selectedProject.id).catch(() => ({ item: null })),
        api.getProjectStyleBible(selectedProject.id).catch(() => ({ item: { visualStyle: '', cameraGrammar: '', doList: [], dontList: [] } })),
        api.checkProjectContinuity(selectedProject.id).catch(() => ({ success: true, issues: [] })),
        api.listSceneVideos(selectedProject.id).catch(() => ({ items: [] })),
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
    };
    loadDetails();
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

  const createProjectFromInput = async (input: { pseudoSynopsis: string; title?: string }) => {
    if (!isAuthenticated || !input.pseudoSynopsis.trim()) return;
    setIsCreatingProject(true);
    setBusyMessage('Creating project...');
    try {
      const created = await api.createProject({
        title: (input.title || '').trim() || undefined,
        pseudoSynopsis: input.pseudoSynopsis.trim(),
        style: 'cinematic',
        durationMinutes: 1,
      });
      setProjects(prev => [created, ...prev]);
      setSelectedProjectId(created.id);
      setShowCreateProjectModal(false);
      setNewTitle('');
      setNewPseudoSynopsis('');
      setBusyMessage('Project created.');
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const createProject = async () => {
    await createProjectFromInput({
      title: newTitle,
      pseudoSynopsis: newPseudoSynopsis,
    });
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

      const generatedTitle = transcript
        .split(/\s+/)
        .slice(0, 6)
        .join(' ')
        .replace(/[.,!?;:]+$/g, '');

      setNewPseudoSynopsis(prev => `${prev ? `${prev}\n\n` : ''}${transcript}`.trim());
      if (!newTitle.trim()) {
        setNewTitle(generatedTitle);
      }
      setBusyMessage('Audio idea captured. Click Create Project when ready.');
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

  const generateStoryboard = async () => {
    if (!selectedProject || !isAuthenticated) return;
    setIsGeneratingStoryboard(true);
    setBusyMessage('Generating storyboard package...');
    try {
      const response = await api.generateProjectStoryboard(selectedProject.id, directorPrompt, filmType);
      setGeneratedPackage(response.result);
      setLatestPackage(response.package);
      setBusyMessage(`Storyboard generated (v${response.package.version}).`);
    } catch (error) {
      setBusyMessage(error instanceof Error ? error.message : 'Failed to generate storyboard');
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const generateSceneVideo = async (beatId: string, promptOverride?: string) => {
    if (!selectedProject?.id || !isAuthenticated) return;
    setIsGeneratingVideoBeatId(beatId);
    setBusyMessage('Queueing scene video render...');
    try {
      const prompt = [directorPrompt, (promptOverride || '').trim()].filter(Boolean).join('\n');
      const response = await api.generateSceneVideo(selectedProject.id, beatId, prompt, sceneFilmTypeByBeatId[beatId] || filmType);
      setSceneVideosByBeatId(prev => ({ ...prev, [beatId]: response.item }));
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
        const prompt = [directorPrompt, (videoPromptByBeatId[scene.beatId] || '').trim()].filter(Boolean).join('\n');
        const response = await api.generateSceneVideo(selectedProject.id, scene.beatId, prompt, sceneFilmTypeByBeatId[scene.beatId] || filmType).catch(() => null);
        if (response?.item) {
          setSceneVideosByBeatId(prev => ({ ...prev, [scene.beatId]: response.item }));
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
    setVideoPromptByBeatId(prev => {
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

  const unlockProjectCreation = async () => {
    const key = accessKeyInput.trim();
    if (!key) return;
    const ok = await verifyKey(key);
    if (ok) {
      setBusyMessage('Access granted. You can now create your film.');
      setAccessKeyInput('');
    }
  };

  return (
    <section id="project-studio" className="relative min-h-screen py-20 px-4 overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-cyan-500/15 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full" />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 text-xs uppercase tracking-widest mb-4">
            <Compass className="w-3.5 h-3.5" /> Semipro Workflow
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-white mb-3 bg-gradient-to-r from-cyan-200 via-white to-amber-200 bg-clip-text text-transparent">SEMIPRO AI</h2>
          <p className="text-gray-400">From rough idea to scene-by-scene cinematic production workflow.</p>
        </div>

        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
          <aside className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#07131f]/80 to-black/70 p-4 h-fit shadow-xl shadow-cyan-950/20">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Projects</p>
            <div className="space-y-2 mb-4">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${selectedProjectId === project.id ? 'border-cyan-300/70 text-cyan-100 bg-cyan-400/10' : 'border-gray-800 text-gray-300 bg-black/30'}`}
                >
                  <p className="font-medium truncate">{project.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{project.durationMinutes} min · {project.style}</p>
                </button>
              ))}
            </div>

            <div className="space-y-2 border-t border-gray-800 pt-4">
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold"
              >
                <Plus className="w-4 h-4" /> Create Film
              </button>
            </div>
          </aside>

          <div className="space-y-6 min-w-0">
            {!selectedProject && (
              <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-black/70 to-[#111827]/60 p-6 text-gray-300 space-y-4">
                <p>Create your first project to start.</p>
                {!isAuthenticated && <p className="text-xs text-amber-200/80">You need an access key before creating a film.</p>}
                <button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" /> Create Film
                </button>
              </div>
            )}

            {selectedProject && (
              <>
                <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-[#1b1307]/70 via-black/60 to-[#07131f]/70 p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-2xl text-white font-semibold">{selectedProject.title}</h3>
                    <span className="text-xs uppercase tracking-widest text-gray-500">{selectedProject.durationMinutes}-min cinematic</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {([
                      { id: 'pseudo', label: 'Pseudo Synopsis' },
                      { id: 'polished', label: 'Polished Synopsis' },
                      { id: 'plotScript', label: 'Plot Script' },
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

                  {synopsisTab === 'pseudo' && (
                    <p className="text-sm text-gray-300 whitespace-pre-line">{selectedProject.pseudoSynopsis}</p>
                  )}
                  {synopsisTab === 'polished' && (
                    <p className="text-sm text-gray-200 whitespace-pre-line">{selectedProject.polishedSynopsis || 'Not polished yet.'}</p>
                  )}
                  {synopsisTab === 'plotScript' && (
                    <p className="text-sm text-gray-200 whitespace-pre-line">{selectedProject.plotScript || 'Generate polished synopsis to produce plot script.'}</p>
                  )}

                  <button onClick={refineSynopsis} disabled={!isAuthenticated || isRefiningSynopsis} className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-700 text-sm text-gray-200 hover:text-cyan-200 disabled:opacity-50">
                    {isRefiningSynopsis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} {isRefiningSynopsis ? 'Polishing...' : 'Polish Synopsis'}
                  </button>
                </div>

                <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#08121f]/70 to-black/60 p-5">
                  <details>
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-200"><Palette className="w-4 h-4" /> Style Bible</span>
                      <span className="text-[11px] text-gray-500">Tap to expand</span>
                    </summary>
                    <div className="grid md:grid-cols-2 gap-3 mt-4">
                      <textarea
                        value={styleBible.visualStyle}
                        onChange={event => setStyleBible(prev => ({ ...prev, visualStyle: event.target.value }))}
                        className="bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-20"
                        placeholder="Visual style"
                      />
                      <textarea
                        value={styleBible.cameraGrammar}
                        onChange={event => setStyleBible(prev => ({ ...prev, cameraGrammar: event.target.value }))}
                        className="bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-20"
                        placeholder="Camera grammar"
                      />
                      <textarea
                        value={(styleBible.doList || []).join('\n')}
                        onChange={event => setStyleBible(prev => ({ ...prev, doList: event.target.value.split('\n').map(item => item.trim()).filter(Boolean) }))}
                        className="bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-20"
                        placeholder="Do list (one per line)"
                      />
                      <textarea
                        value={(styleBible.dontList || []).join('\n')}
                        onChange={event => setStyleBible(prev => ({ ...prev, dontList: event.target.value.split('\n').map(item => item.trim()).filter(Boolean) }))}
                        className="bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-20"
                        placeholder="Don't list (one per line)"
                      />
                    </div>
                    <button onClick={saveStyleBible} disabled={!isAuthenticated || isSavingStyleBible} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-700 text-sm text-gray-200 hover:text-cyan-200 disabled:opacity-50">
                      {isSavingStyleBible ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {isSavingStyleBible ? 'Saving...' : 'Save Style Bible'}
                    </button>
                  </details>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#071712]/70 to-black/60 p-5">
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Beat Story Capture</p>
                  <div className="flex gap-2">
                    <textarea value={noteInput} onChange={event => setNoteInput(event.target.value)} className="flex-1 bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-16" placeholder="Type a beat story note..." />
                    <button onClick={addNote} disabled={!isAuthenticated || isAddingNote} className="h-fit inline-flex items-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50">
                      {isAddingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {isAddingNote ? 'Adding...' : 'Add'}
                    </button>
                    <button onClick={recordNote} disabled={!isAuthenticated || isListening} className="h-fit inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-700 text-sm text-gray-300 disabled:opacity-50">
                      <Mic className="w-4 h-4" /> {isListening ? 'Listening...' : 'Record'}
                    </button>
                  </div>
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

                <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-[#1d1206]/70 to-black/60 p-5">
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Director Prompt</p>
                  <textarea value={directorPrompt} onChange={event => setDirectorPrompt(event.target.value)} className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-16" />
                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-1">Film Type</p>
                    <select
                      value={filmType}
                      onChange={event => setFilmType(event.target.value)}
                      className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm text-gray-200"
                    >
                      {filmTypeOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={generateStoryboard} disabled={!isAuthenticated || isGeneratingStoryboard} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50">
                    {isGeneratingStoryboard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />} {isGeneratingStoryboard ? 'Generating...' : 'Generate Storyboard'}
                  </button>
                </div>

                {isGeneratingStoryboard && (
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-cyan-100 inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating scenes and rendering frame images in the background...
                  </div>
                )}

                {generatedPackage && (
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
                            onClick={refreshSceneVideoStatuses}
                            disabled={isRefreshingVideos}
                            className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {isRefreshingVideos ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />} Refresh
                          </button>
                          <button
                            onClick={generateAllSceneVideos}
                            disabled={!isAuthenticated || isGeneratingAllVideos || videoStats.total === 0}
                            className="text-xs px-2 py-1 rounded bg-[#D0FF59] text-black font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {isGeneratingAllVideos ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />} Generate All Videos
                          </button>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded bg-gray-900 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-[#D0FF59]" style={{ width: `${videoStats.progress}%` }} />
                      </div>
                      <p className="text-xs text-cyan-100/80">
                        {videoStats.completed}/{videoStats.total} completed · {videoStats.processing} processing · {videoStats.queued} queued · {videoStats.failed} failed
                      </p>
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
                                onClick={() => generateSceneVideo(scene.beatId, videoPromptByBeatId[scene.beatId] || '')}
                                disabled={!isAuthenticated || isGeneratingVideoBeatId === scene.beatId || sceneVideosByBeatId[scene.beatId]?.status === 'processing'}
                                className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-300 disabled:opacity-50"
                              >
                                {isGeneratingVideoBeatId === scene.beatId || sceneVideosByBeatId[scene.beatId]?.status === 'queued' || sceneVideosByBeatId[scene.beatId]?.status === 'processing'
                                  ? <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Rendering</span>
                                  : sceneVideosByBeatId[scene.beatId]?.status === 'completed'
                                    ? <span className="inline-flex items-center gap-1"><RefreshCcw className="w-3 h-3" />Regenerate video</span>
                                    : <span className="inline-flex items-center gap-1"><Video className="w-3 h-3" />Generate video</span>}
                              </button>
                              <button onClick={() => toggleSceneLock(scene.beatId, !!scene.locked)} disabled={!isAuthenticated} className="text-[11px] px-2 py-1 rounded border border-gray-700 text-gray-300 disabled:opacity-50">
                                {scene.locked ? <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" />Locked</span> : <span className="inline-flex items-center gap-1"><Unlock className="w-3 h-3" />Unlocked</span>}
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
                                  onChange={event => setSceneFilmTypeByBeatId(prev => ({ ...prev, [scene.beatId]: event.target.value }))}
                                  className="w-full bg-black/40 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200"
                                >
                                  {filmTypeOptions.map(option => (
                                    <option key={`${scene.beatId}-${option}`} value={option}>{option}</option>
                                  ))}
                                </select>
                              </div>
                              <textarea
                                value={videoPromptByBeatId[scene.beatId] || ''}
                                onChange={event => setVideoPromptByBeatId(prev => ({ ...prev, [scene.beatId]: event.target.value }))}
                                className="w-full bg-black/40 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200 min-h-16"
                                placeholder="Add director-level motion/acting/environment notes for this scene video."
                              />
                              <div className="flex flex-wrap gap-1">
                                {cameraMoves.map(move => (
                                  <button
                                    key={`${scene.beatId}-${move}`}
                                    onClick={() => appendCameraMoveToPrompt(scene.beatId, move)}
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
                )}
              </>
            )}
          </div>
        </div>

        {busyMessage && (
          <p className="text-sm text-gray-400 mt-6 flex items-center justify-center gap-2 text-center">
            {(isCreatingProject || isRefiningSynopsis || isSavingStyleBible || isAddingNote || isPolishingBeats || isGeneratingStoryboard || isCheckingContinuity || isPreviewingFix !== null || isApplyingFix || isGeneratingAllVideos || isRefreshingVideos)
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

      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#060a12] p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-lg text-white font-semibold">Create New Project</h4>
              <button onClick={() => setShowCreateProjectModal(false)} className="p-1 rounded border border-gray-700 text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {!isAuthenticated && (
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-amber-200">Unlock Creation</p>
                  <p className="text-[11px] text-amber-100/80">Enter your access key to enable project creation in production.</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={accessKeyInput}
                      onChange={event => setAccessKeyInput(event.target.value)}
                      className="flex-1 bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                      placeholder="Access key"
                    />
                    <button
                      onClick={unlockProjectCreation}
                      disabled={!accessKeyInput.trim() || isVerifying}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded border border-amber-300/60 text-amber-100 text-sm font-semibold disabled:opacity-50"
                    >
                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {isVerifying ? 'Verifying...' : 'Unlock'}
                    </button>
                  </div>
                  {authError && <p className="text-[11px] text-rose-300">{authError}</p>}
                </div>
              )}

              <input
                value={newTitle}
                onChange={event => setNewTitle(event.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
                placeholder="Project title (optional)"
              />
              <textarea
                value={newPseudoSynopsis}
                onChange={event => setNewPseudoSynopsis(event.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-28"
                placeholder="Dump your rough movie idea here"
              />
              <p className="text-[11px] text-gray-500">If title is empty, we auto-generate one from your idea text.</p>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={recordProjectIdea} disabled={!isAuthenticated || isRecordCreating || isCreatingProject} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-white text-black text-sm font-semibold disabled:opacity-50">
                {isRecordCreating || isCreatingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />} {isRecordCreating ? 'Listening...' : isCreatingProject ? 'Creating...' : 'Record Idea'}
              </button>
              <button onClick={createProject} disabled={!newPseudoSynopsis.trim() || !isAuthenticated || isCreatingProject} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50">
                {isCreatingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {isCreatingProject ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
