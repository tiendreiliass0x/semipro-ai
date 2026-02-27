export const buildStorylineContext = (storyline: any) => ({
  id: storyline.id,
  title: storyline.title,
  description: storyline.description,
  style: storyline.style,
  tone: storyline.tone,
  openingLine: storyline.openingLine,
  closingLine: storyline.closingLine,
  timeframe: storyline.timeframe,
  tags: Array.isArray(storyline.tags) ? storyline.tags.slice(0, 12) : [],
  beats: Array.isArray(storyline.beats)
    ? storyline.beats.map((beat: any, index: number) => {
      const source = (beat?.anecdote && typeof beat.anecdote === 'object')
        ? beat.anecdote
        : (beat?.source && typeof beat.source === 'object')
            ? beat.source
            : {};
      return {
        order: index + 1,
        beatId: beat.id,
        intensity: beat.intensity,
        summary: beat.summary,
        voiceover: beat.voiceover,
        connection: beat.connection,
        anecdote: {
          id: source.id ?? beat.id ?? `beat-${index + 1}`,
          date: source.date ?? '',
          year: source.year ?? null,
          title: source.title ?? beat.summary ?? '',
          story: source.story ?? beat.summary ?? '',
          storyteller: source.storyteller ?? '',
          location: source.location ?? '',
          tags: Array.isArray(source.tags) ? source.tags : [],
        },
      };
    })
    : [],
});

type StorylineGeneratorDeps = {
  generateStoryPackageWithLlm: (context: any, prompt: string) => Promise<any>;
  regenerateStoryboardSceneWithLlm: (context: any, scene: any, prompt: string) => Promise<any>;
};

export const createStorylineGenerators = (deps: StorylineGeneratorDeps) => {
  const generateStoryPackage = async (storyline: any, prompt: string) => {
    return deps.generateStoryPackageWithLlm(buildStorylineContext(storyline), prompt);
  };

  const generateStoryboardScene = async (storyline: any, scene: any, prompt: string) => {
    const regenerated = await deps.regenerateStoryboardSceneWithLlm(buildStorylineContext(storyline), scene, prompt);

    return {
      ...regenerated,
      sceneNumber: Number(regenerated?.sceneNumber || scene.sceneNumber),
      beatId: String(regenerated?.beatId || scene.beatId),
      slugline: String(regenerated?.slugline || scene.slugline || ''),
      visualDirection: String(regenerated?.visualDirection || scene.visualDirection || ''),
      camera: String(regenerated?.camera || scene.camera || ''),
      audio: String(regenerated?.audio || scene.audio || ''),
      voiceover: String(regenerated?.voiceover || scene.voiceover || ''),
      onScreenText: String(regenerated?.onScreenText || scene.onScreenText || ''),
      transition: String(regenerated?.transition || scene.transition || ''),
      durationSeconds: Number(regenerated?.durationSeconds || scene.durationSeconds || 6),
    };
  };

  return { generateStoryPackage, generateStoryboardScene };
};
