import { Plus, Settings, Trash2 } from 'lucide-react';
import type { MovieProject } from '@/types';

type ProjectSidebarProps = {
  projects: MovieProject[];
  selectedProjectId: string | null;
  selectedProject: MovieProject | null;
  showProjectSettingsPane: boolean;
  isAuthenticated: boolean;
  isDeletingProject: boolean;
  onSelectProject: (projectId: string) => void;
  onOpenCreateProject: () => void;
  onToggleSettingsPane: () => void;
  onRequestDelete: () => void;
};

export function ProjectSidebar(props: ProjectSidebarProps) {
  const {
    projects,
    selectedProjectId,
    selectedProject,
    showProjectSettingsPane,
    isAuthenticated,
    isDeletingProject,
    onSelectProject,
    onOpenCreateProject,
    onToggleSettingsPane,
    onRequestDelete,
  } = props;

  return (
    <aside className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#07131f]/80 to-black/70 p-4 h-fit shadow-xl shadow-cyan-950/20">
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Projects</p>
      <div className="space-y-2 mb-4">
        {projects.map(project => (
          <button
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${selectedProjectId === project.id ? 'border-cyan-300/70 text-cyan-100 bg-cyan-400/10' : 'border-gray-800 text-gray-300 bg-black/30'}`}
          >
            <p className="font-medium truncate">{project.title}</p>
            <p className="text-xs text-gray-500 mt-1">{project.durationMinutes} min · {project.style}</p>
          </button>
        ))}
      </div>

      <div className="space-y-2 border-t border-gray-800 pt-4">
        <button
          onClick={onOpenCreateProject}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-[#D0FF59] text-black text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Create Film
        </button>
        <button
          onClick={onToggleSettingsPane}
          disabled={!selectedProject}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded border border-gray-700 text-gray-200 text-sm disabled:opacity-40"
        >
          <Settings className="w-4 h-4" /> Project Settings
        </button>
        {showProjectSettingsPane && selectedProject && (
          <div className="rounded-lg border border-gray-800 bg-black/25 p-3 space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-gray-500">Current Project</p>
            <p className="text-sm text-gray-200">{selectedProject.title}</p>
            <div className="rounded border border-rose-500/20 bg-rose-500/5 p-2">
              <p className="text-[11px] text-rose-100/80">Soft delete removes this project from active views while preserving data.</p>
              <button
                onClick={onRequestDelete}
                disabled={!isAuthenticated || isDeletingProject}
                className="mt-2 inline-flex items-center gap-2 px-2.5 py-1.5 rounded border border-rose-400/40 text-rose-100 text-xs font-semibold disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> DELETE
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
