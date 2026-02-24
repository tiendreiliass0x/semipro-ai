# Scene Journey: Logline to Merged Video Prompt

This document explains how a single scene video prompt is produced, what contributes to the final merged prompt, and what has been simplified to keep quality high while reducing prompt bloat.

## 1) Journey Overview

1. User writes a **Logline** in project details.
2. User can polish synopsis; backend stores polished synopsis.
3. Notes and beat polishing produce structured beats.
4. Storyboard generation produces per-scene data (`slugline`, `visualDirection`, `camera`, `audio`, `voiceover`, `onScreenText`, `imagePrompt`, `durationSeconds`).
5. Scene video generation resolves:
   - style bible,
   - scenes bible,
   - per-scene prompt layers,
   - continuation settings and anchor image.
6. Backend builds:
   - `directorPrompt`,
   - `cinematographerPrompt`,
   - `mergedPrompt`.
7. Backend stores prompt layer snapshot + full trace payload and queues video generation.

## 2) Inputs Participating in Final Merged Prompt

### Project inputs
- `project.title`
- `project.polishedSynopsis || project.pseudoSynopsis` (logline fallback)

### Storyboard scene inputs
- `slugline`
- `visualDirection`
- `camera`
- `audio`
- `voiceover`
- `onScreenText`
- `durationSeconds`
- `imagePrompt`

### Style inputs
- Style Bible: `visualStyle`, `cameraGrammar`, `doList`, `dontList`
- Scenes Bible: `overview`, `characterCanon`, `locationCanon`, `cinematicLanguage`, `paletteAndTexture`, `continuityInvariants`

### Per-scene layer inputs
- Director layer override
- Cinematographer layer override
- Film type
- Continuation mode
- Anchor beat selection
- Auto-regenerate threshold

### Continuity anchor inputs
- Manual anchor scene image (if selected)
- Else previous clip last frame (if previous clip exists)
- Else previous storyboard frame in strict mode
- Else current scene frame

## 3) Prompt Composition Rules

Prompt precedence remains:
1. Scenes Bible hard constraints
2. Cinematographer directives (camera/lens/lighting)
3. Director directives (performance/emotion/story intent)

## 4) Simplification Applied

To reduce token overhead without lowering quality:

1. **Shared scene packet** is built once and reused in both director/cinematographer builders.
2. **Deduplicated context** from both prompt blocks.
3. **Conditional field inclusion**: empty fields are omitted instead of emitted as blank lines.
4. **Compact bullet directives** replace verbose repeated prose.
5. **Short explicit precedence block** in merged prompt.

## 5) Observability

Each generation stores:
- prompt layer snapshot (`scene_prompt_layers`)
- prompt construction trace (`scene_video_prompt_traces`)

Trace payload includes:
- request inputs,
- resolved anchor source,
- director/cinematographer prompt previews,
- merged prompt preview,
- key length metrics.
