import OpenAI from 'openai';
import { fal } from '@fal-ai/client';
import { resolveImageModel } from './imageModel';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || '';
const FAL_IMAGE_MODEL = process.env.FAL_IMAGE_MODEL || 'fal-ai/flux-pro/kontext/text-to-image';
const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';
const SUPPORTS_TEMPERATURE = !OPENAI_MODEL.startsWith('gpt-5');

if (FAL_KEY) {
  fal.config({ credentials: FAL_KEY });
}

const STORY_PACKAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['writeup', 'storyboard', 'extras'],
  properties: {
    writeup: {
      type: 'object',
      additionalProperties: false,
      required: ['headline', 'deck', 'narrative'],
      properties: {
        headline: { type: 'string' },
        deck: { type: 'string' },
        narrative: { type: 'string' },
      },
    },
    storyboard: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['sceneNumber', 'beatId', 'slugline', 'imagePrompt', 'visualDirection', 'camera', 'audio', 'voiceover', 'onScreenText', 'transition', 'durationSeconds'],
        properties: {
          sceneNumber: { type: 'number' },
          beatId: { type: 'string' },
          slugline: { type: 'string' },
          imagePrompt: { type: 'string' },
          visualDirection: { type: 'string' },
          camera: { type: 'string' },
          audio: { type: 'string' },
          voiceover: { type: 'string' },
          onScreenText: { type: 'string' },
          transition: { type: 'string' },
          durationSeconds: { type: 'number' },
        },
      },
    },
    extras: {
      type: 'object',
      additionalProperties: false,
      required: ['logline', 'socialCaption', 'pullQuotes'],
      properties: {
        logline: { type: 'string' },
        socialCaption: { type: 'string' },
        pullQuotes: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const;

const STORYBOARD_SCENE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sceneNumber', 'beatId', 'slugline', 'imagePrompt', 'visualDirection', 'camera', 'audio', 'voiceover', 'onScreenText', 'transition', 'durationSeconds'],
  properties: {
    sceneNumber: { type: 'number' },
    beatId: { type: 'string' },
    slugline: { type: 'string' },
    imagePrompt: { type: 'string' },
    visualDirection: { type: 'string' },
    camera: { type: 'string' },
    audio: { type: 'string' },
    voiceover: { type: 'string' },
    onScreenText: { type: 'string' },
    transition: { type: 'string' },
    durationSeconds: { type: 'number' },
  },
} as const;

const POLISHED_SYNOPSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'logline', 'synopsis', 'plotScript'],
  properties: {
    title: { type: 'string' },
    logline: { type: 'string' },
    synopsis: { type: 'string' },
    plotScript: { type: 'string' },
  },
} as const;

const POLISHED_BEATS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['beats'],
  properties: {
    beats: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['minuteStart', 'minuteEnd', 'pseudoBeat', 'polishedBeat', 'objective', 'conflict', 'turn', 'intensity', 'tags'],
        properties: {
          minuteStart: { type: 'number' },
          minuteEnd: { type: 'number' },
          pseudoBeat: { type: 'string' },
          polishedBeat: { type: 'string' },
          objective: { type: 'string' },
          conflict: { type: 'string' },
          turn: { type: 'string' },
          intensity: { type: 'number' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const;

const PROJECT_STORYBOARD_SCHEMA = STORY_PACKAGE_SCHEMA;

const HYBRID_SCREENPLAY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'format', 'screenplay', 'scenes'],
  properties: {
    title: { type: 'string' },
    format: { type: 'string' },
    screenplay: { type: 'string' },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['sceneId', 'sceneNumber', 'heading', 'action', 'dialogue', 'shotNotes'],
        properties: {
          sceneId: { type: 'string' },
          sceneNumber: { type: 'number' },
          heading: { type: 'string' },
          action: { type: 'string' },
          dialogue: { type: 'array', items: { type: 'string' } },
          shotNotes: { type: 'string' },
        },
      },
    },
  },
} as const;

const SCENES_BIBLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['overview', 'characterCanon', 'locationCanon', 'cinematicLanguage', 'paletteAndTexture', 'continuityInvariants', 'progressionMap'],
  properties: {
    overview: { type: 'string' },
    characterCanon: { type: 'string' },
    locationCanon: { type: 'string' },
    cinematicLanguage: { type: 'string' },
    paletteAndTexture: { type: 'string' },
    continuityInvariants: { type: 'array', items: { type: 'string' } },
    progressionMap: { type: 'string' },
  },
} as const;

const parseJsonFromText = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
};

type CreateResponseFn = (args: any) => Promise<any>;

const extractOutputText = (response: any): string => {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  if (Array.isArray(response?.output)) {
    return response.output
      .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
      .filter((content: any) => content?.type === 'output_text' || content?.type === 'text')
      .map((content: any) => content?.text || '')
      .join('\n')
      .trim();
  }

  return '';
};

const callLlmForJson = async (
  args: {
    taskName?: string;
    systemInstruction: string;
    payload: any;
    temperature: number;
    responseSchema: any;
  },
  createResponse: CreateResponseFn
) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const startedAt = Date.now();
  const taskName = args.taskName || 'text-generation';
  console.log(`[text] ${taskName} started (model: ${OPENAI_MODEL})`);

  try {
    const response = await createResponse({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: args.systemInstruction,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify(args.payload),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'storyline_payload',
          schema: args.responseSchema,
          strict: true,
        },
      },
      ...(SUPPORTS_TEMPERATURE ? { temperature: args.temperature } : {}),
    });

    const parsed = parseJsonFromText(extractOutputText(response));
    if (!parsed) throw new Error('OpenAI returned invalid JSON');
    console.log(`[text] ${taskName} completed in ${Date.now() - startedAt}ms`);
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[text] ${taskName} failed after ${Date.now() - startedAt}ms: ${message}`);
    throw error;
  }
};

const createOpenAIClient = () => new OpenAI({ apiKey: OPENAI_API_KEY });

const generateImageWithXai = async (args: { prompt: string; modelId: string }) => {
  if (!XAI_API_KEY) {
    throw new Error('XAI_API_KEY is not configured for Grok image');
  }

  const response = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: args.modelId,
      prompt: args.prompt,
      size: '1536x1024',
      n: 1,
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok image generation failed (${response.status})`);
  }

  const data = await response.json() as any;
  const imageUrl =
    data?.data?.[0]?.url
    || data?.images?.[0]?.url
    || '';
  if (!imageUrl) {
    throw new Error('Grok image generation returned no image URL');
  }
  return String(imageUrl);
};

export const generateStoryboardFrameWithLlm = async (prompt: string, imageModelKey?: string) => {
  if (!FAL_KEY) {
    if (resolveImageModel(imageModelKey).provider === 'fal') {
      throw new Error('FAL_KEY is not configured');
    }
  }
  const imageModel = resolveImageModel(imageModelKey);
  const startedAt = Date.now();
  console.log(`[image] frame generation started (model: ${imageModel.key} -> ${imageModel.modelId || FAL_IMAGE_MODEL})`);

  if (imageModel.provider === 'xai') {
    const imageUrl = await generateImageWithXai({ prompt, modelId: imageModel.modelId });
    console.log(`[image] frame generation completed in ${Date.now() - startedAt}ms`);
    return imageUrl;
  }

  const result = await fal.subscribe(imageModel.modelId || FAL_IMAGE_MODEL, {
    input: {
      prompt,
    },
    logs: true,
    onQueueUpdate: update => {
      if (update.status === 'IN_PROGRESS') {
        const messages = Array.isArray(update.logs) ? update.logs.map(log => log.message).filter(Boolean) : [];
        if (messages.length > 0) {
          console.log(`[image] ${messages.join(' | ')}`);
        }
      }
    },
  });

  const imageUrl =
    (result as any)?.data?.images?.[0]?.url
    || (result as any)?.data?.image?.url
    || '';

  if (!imageUrl) {
    console.error(`[image] frame generation failed after ${Date.now() - startedAt}ms: no image URL`);
    throw new Error('FAL image generation returned no image URL');
  }

  console.log(`[image] frame generation completed in ${Date.now() - startedAt}ms`);
  return imageUrl as string;
};

export const generateStoryPackageWithLlm = async (storylineContext: any, prompt: string) => {
  const client = createOpenAIClient();
  return callLlmForJson({
    taskName: 'generate-story-package',
    systemInstruction: 'You are a documentary writer and storyboard artist. Use only facts from context. Do not invent missing facts; use UNKNOWN. Keep chronology aligned with beat order. Return only JSON with shape: { writeup: { headline, deck, narrative }, storyboard: Scene[], extras: { logline, socialCaption, pullQuotes[] } }. Each storyboard scene must include: sceneNumber, beatId, slugline, imagePrompt, visualDirection, camera, audio, voiceover, onScreenText, transition, durationSeconds. imagePrompt should be a concise cinematic concept-art prompt for one frame of the scene.',
    payload: {
      prompt: prompt || 'Create a compelling documentary write-up and production-ready storyboard.',
      storyline: storylineContext,
    },
    temperature: 0.7,
    responseSchema: STORY_PACKAGE_SCHEMA,
  }, client.responses.create.bind(client.responses));
};

export const regenerateStoryboardSceneWithLlm = async (storylineContext: any, scene: any, prompt: string) => {
  const client = createOpenAIClient();
  return callLlmForJson({
    taskName: 'regenerate-storyboard-scene',
    systemInstruction: 'You are a documentary storyboard editor. Rewrite one scene only. Keep facts grounded in the supplied storyline/anecdote context. Keep sceneNumber and beatId aligned with the provided scene. Return only JSON with fields: sceneNumber, beatId, slugline, imagePrompt, visualDirection, camera, audio, voiceover, onScreenText, transition, durationSeconds.',
    payload: {
      prompt: prompt || 'Regenerate this scene with stronger cinematic detail while staying factual.',
      storyline: storylineContext,
      scene,
    },
    temperature: 0.65,
    responseSchema: STORYBOARD_SCENE_SCHEMA,
  }, client.responses.create.bind(client.responses));
};

export const refineSynopsisWithLlm = async (args: { pseudoSynopsis: string; style?: string; durationMinutes?: number; styleBible?: any }) => {
  const client = createOpenAIClient();
  return callLlmForJson({
    taskName: 'refine-synopsis',
    systemInstruction: 'You are an award-winning film development editor. Rewrite rough synopsis text into polished cinematic synopsis. Keep intent and core plot. Also generate a concise plot script treatment (4-6 short paragraphs) focused on story progression and cinematic beats. Return only JSON with keys: title, logline, synopsis, plotScript.',
    payload: {
      style: args.style || 'cinematic',
      durationMinutes: Number(args.durationMinutes || 1),
      styleBible: args.styleBible || null,
      pseudoSynopsis: args.pseudoSynopsis,
    },
    temperature: 0.7,
    responseSchema: POLISHED_SYNOPSIS_SCHEMA,
  }, client.responses.create.bind(client.responses));
};

export const polishNotesIntoBeatsWithLlm = async (args: { synopsis: string; notes: any[]; durationMinutes?: number; style?: string; styleBible?: any }) => {
  const client = createOpenAIClient();
  return callLlmForJson({
    taskName: 'polish-notes-into-beats',
    systemInstruction: 'You are a film story editor. Convert rough story notes into coherent minute-by-minute beats. Keep chronology logical and escalating. Return only JSON with shape: { beats: [{ minuteStart, minuteEnd, pseudoBeat, polishedBeat, objective, conflict, turn, intensity, tags[] }] }.',
    payload: {
      style: args.style || 'cinematic',
      styleBible: args.styleBible || null,
      durationMinutes: Number(args.durationMinutes || 1),
      synopsis: args.synopsis,
      notes: args.notes,
    },
    temperature: 0.65,
    responseSchema: POLISHED_BEATS_SCHEMA,
  }, client.responses.create.bind(client.responses));
};

export const generateProjectStoryboardWithLlm = async (args: { title: string; synopsis: string; beats: any[]; prompt?: string; style?: string; styleBible?: any; filmType?: string }) => {
  const client = createOpenAIClient();
  return callLlmForJson({
    taskName: 'generate-project-storyboard',
    systemInstruction: 'You are a film director and storyboard artist. Generate a coherent cinematic storyboard from polished beats. Respect beat order and pacing. If a filmType is provided, lean strongly into that visual language and storytelling grammar. Return only JSON with shape { writeup, storyboard, extras } and each storyboard item must include beatId and imagePrompt. imagePrompt should be a concise visual generation prompt for a single storyboard frame.',
    payload: {
      title: args.title,
      style: args.style || 'cinematic',
      filmType: args.filmType || '',
      styleBible: args.styleBible || null,
      prompt: args.prompt || 'Generate a cinematic storyboard package.',
      synopsis: args.synopsis,
      beats: args.beats,
    },
    temperature: 0.7,
    responseSchema: PROJECT_STORYBOARD_SCHEMA,
  }, client.responses.create.bind(client.responses));
};

export const generateHybridScreenplayWithLlm = async (args: {
  title: string;
  synopsis: string;
  plotScript: string;
  beats: any[];
  style?: string;
  styleBible?: any;
  durationMinutes?: number;
}) => {
  const client = createOpenAIClient();
  return callLlmForJson({
    taskName: 'generate-hybrid-screenplay',
    systemInstruction: 'You are a screenwriter and directing consultant. Produce a hybrid screenplay that combines classic scene headings/action/dialogue with short practical shot notes for each scene. Enforce INT./EXT. LOCATION - TIME headings, coherent chronology, and emotionally clear character beats. Return only JSON with keys: title, format, screenplay, scenes. Scene format must include sceneId, sceneNumber, heading, action, dialogue[], shotNotes.',
    payload: {
      title: args.title,
      style: args.style || 'cinematic',
      durationMinutes: Number(args.durationMinutes || 1),
      styleBible: args.styleBible || null,
      synopsis: args.synopsis,
      plotScript: args.plotScript,
      beats: args.beats,
    },
    temperature: 0.65,
    responseSchema: HYBRID_SCREENPLAY_SCHEMA,
  }, client.responses.create.bind(client.responses));
};

export const generateScenesBibleWithLlm = async (args: {
  title: string;
  synopsis: string;
  plotScript: string;
  screenplay: string;
  style?: string;
  styleBible?: any;
}) => {
  const client = createOpenAIClient();
  return callLlmForJson({
    taskName: 'generate-scenes-bible',
    systemInstruction: 'You are a film continuity supervisor and cinematography lead. Build a Scenes Bible that keeps the full film coherent across scene clips. Include global identity and environment canon, visual language constraints, palette and texture rules, non-negotiable continuity invariants, and progression guidance across the film. Return only JSON with keys: overview, characterCanon, locationCanon, cinematicLanguage, paletteAndTexture, continuityInvariants, progressionMap.',
    payload: {
      title: args.title,
      style: args.style || 'cinematic',
      styleBible: args.styleBible || null,
      synopsis: args.synopsis,
      plotScript: args.plotScript,
      screenplay: args.screenplay,
    },
    temperature: 0.55,
    responseSchema: SCENES_BIBLE_SCHEMA,
  }, client.responses.create.bind(client.responses));
};

export const __test = {
  callLlmForJson,
  parseJsonFromText,
  extractOutputText,
};
