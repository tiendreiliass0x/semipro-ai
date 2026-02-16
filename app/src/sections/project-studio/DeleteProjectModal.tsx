import { Loader2, Trash2 } from 'lucide-react';

type DeleteProjectModalProps = {
  open: boolean;
  projectTitle: string;
  isAuthenticated: boolean;
  isDeletingProject: boolean;
  onCancel: () => void;
  onConfirmDelete: () => void;
};

export function DeleteProjectModal(props: DeleteProjectModalProps) {
  const { open, projectTitle, isAuthenticated, isDeletingProject, onCancel, onConfirmDelete } = props;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#12080a] p-5">
        <h4 className="text-lg text-rose-100 font-semibold mb-2">Confirm Deletion</h4>
        <p className="text-sm text-rose-100/85">You are about to soft-delete <span className="font-semibold">{projectTitle}</span>. This removes it from the active project list.</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded border border-gray-700 text-sm text-gray-300"
            disabled={isDeletingProject}
          >
            Cancel
          </button>
          <button
            onClick={onConfirmDelete}
            disabled={!isAuthenticated || isDeletingProject}
            className="px-4 py-2 rounded bg-rose-600 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isDeletingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} {isDeletingProject ? 'Deleting...' : 'DELETE'}
          </button>
        </div>
      </div>
    </div>
  );
}
