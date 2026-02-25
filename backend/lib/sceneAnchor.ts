export type AnchorMode = 'off' | 'strict' | 'balanced' | 'loose';

export const resolveSceneAnchor = (args: {
  continuationMode: AnchorMode;
  currentSceneImageUrl: string;
  previousSceneBeatId?: string;
  previousSceneImageUrl?: string;
  previousClipLastFrameUrl?: string;
  manualAnchorBeatId?: string;
  manualAnchorImageUrl?: string;
}) => {
  const manualAnchorBeatId = String(args.manualAnchorBeatId || '').trim();
  const manualAnchorImageUrl = String(args.manualAnchorImageUrl || '').trim();
  const previousClipLastFrameUrl = String(args.previousClipLastFrameUrl || '').trim();
  const previousSceneImageUrl = String(args.previousSceneImageUrl || '').trim();
  const previousSceneBeatId = String(args.previousSceneBeatId || '').trim();
  const currentSceneImageUrl = String(args.currentSceneImageUrl || '').trim();

  if (args.continuationMode === 'off') {
    return {
      anchorBeatId: '',
      sourceImageUrl: currentSceneImageUrl,
      anchorSource: 'continuation-off-current-scene-frame',
    } as const;
  }

  if (manualAnchorBeatId && manualAnchorImageUrl) {
    return {
      anchorBeatId: manualAnchorBeatId,
      sourceImageUrl: manualAnchorImageUrl,
      anchorSource: 'manual-anchor-scene',
    } as const;
  }

  if (previousSceneBeatId && previousClipLastFrameUrl) {
    return {
      anchorBeatId: previousSceneBeatId,
      sourceImageUrl: previousClipLastFrameUrl,
      anchorSource: 'previous-clip-last-frame',
    } as const;
  }

  if (args.continuationMode === 'strict' && previousSceneBeatId && previousSceneImageUrl) {
    return {
      anchorBeatId: previousSceneBeatId,
      sourceImageUrl: previousSceneImageUrl,
      anchorSource: 'previous-scene-storyboard-frame',
    } as const;
  }

  return {
    anchorBeatId: '',
    sourceImageUrl: currentSceneImageUrl,
    anchorSource: 'current-scene-frame',
  } as const;
};
