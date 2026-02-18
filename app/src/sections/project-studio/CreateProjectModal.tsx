import { Loader2, Mic, Plus, X } from 'lucide-react';

type CreateProjectModalProps = {
  open: boolean;
  isAuthenticated: boolean;
  newTitle: string;
  newPseudoSynopsis: string;
  isRecordCreating: boolean;
  isCreatingProject: boolean;
  onClose: () => void;
  onChangeTitle: (value: string) => void;
  onChangePseudoSynopsis: (value: string) => void;
  onRecordIdea: () => void;
  onCreateProject: () => void;
};

export function CreateProjectModal(props: CreateProjectModalProps) {
  const {
    open,
    isAuthenticated,
    newTitle,
    newPseudoSynopsis,
    isRecordCreating,
    isCreatingProject,
    onClose,
    onChangeTitle,
    onChangePseudoSynopsis,
    onRecordIdea,
    onCreateProject,
  } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#060a12] p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h4 className="text-lg text-white font-semibold">Create New Project</h4>
          <button onClick={onClose} className="p-1 rounded border border-gray-700 text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {!isAuthenticated && <p className="text-[11px] text-amber-100/80">Sign in to create projects.</p>}

          <input
            value={newTitle}
            onChange={event => onChangeTitle(event.target.value)}
            className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm"
            placeholder="Project title (optional)"
          />
          <textarea
            value={newPseudoSynopsis}
            onChange={event => onChangePseudoSynopsis(event.target.value)}
            className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-sm min-h-28"
            placeholder="Dump your rough movie idea here"
          />
          <p className="text-[11px] text-gray-500">If title is empty, we auto-generate one from your idea text.</p>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button onClick={onRecordIdea} disabled={!isAuthenticated || isRecordCreating || isCreatingProject} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-white text-black text-sm font-semibold disabled:opacity-50">
            {isRecordCreating || isCreatingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />} {isRecordCreating ? 'Listening...' : isCreatingProject ? 'Creating...' : 'Record Idea'}
          </button>
          <button onClick={onCreateProject} disabled={!newPseudoSynopsis.trim() || !isAuthenticated || isCreatingProject} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold disabled:opacity-50">
            {isCreatingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {isCreatingProject ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
