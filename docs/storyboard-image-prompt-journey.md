# Storyboard Image Prompt Journey (From Logline)

```mermaid
flowchart TD
  A[User writes Logline\nproject.pseudoSynopsis] --> B[Polish Synopsis\nproject.polishedSynopsis]
  B --> C[Beat Story Capture\nnotes + AI starters]
  C --> D[Polish Beats\nstory_beats]
  D --> E[Generate Storyboard Package\nscene fields per beat]

  E --> E1[scene.slugline]
  E --> E2[scene.visualDirection]
  E --> E3[scene.camera]
  E --> E4[scene.audio]
  E --> E5[scene.imagePrompt]

  F[Storyboard controls\nfilmType + imageModelKey] --> G[buildStoryboardImagePrompt(scene, filmType, project)]
  E1 --> G
  E2 --> G
  E3 --> G
  E4 --> G
  E5 --> G
  B --> G
  A --> G

  G --> H{Prompt empty?}
  H -- No --> I[Use composed scene prompt]
  H -- Yes --> J[Fallback prompt\nproject title + synopsis + quality constraints]
  I --> K[generateStoryboardFrameWithLlm(prompt, imageModelKey)]
  J --> K

  K --> L{imageModelKey}
  L -- fal --> M[FAL image model]
  L -- grok --> N[Grok image model]
  M --> O[imageUrl]
  N --> O

  O --> P[Write scene.imageUrl\ninto new project package version]
  P --> Q[UI refreshes storyboard strip/cards]
```

## Regeneration Paths

- **Single scene regenerate**: `POST /api/projects/:projectId/storyboard/:beatId/image/regenerate`
- **Regenerate all images**: `POST /api/projects/:projectId/storyboard/images/regenerate-all`

Both paths preserve existing scene text and only refresh `scene.imageUrl`.
