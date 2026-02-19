import { useState } from 'react';
import { Boxes, Compass, FolderOpen, Settings, Trash2, Wand2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MovieProject } from '@/types';

type ProjectSidebarProps = {
  projects: MovieProject[];
  selectedProjectId: string | null;
  selectedProject: MovieProject | null;
  showProjectSettingsPane: boolean;
  isAuthenticated: boolean;
  isDeletingProject: boolean;
  onSelectProject: (projectId: string) => void;
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
    onToggleSettingsPane,
    onRequestDelete,
  } = props;

  const [activeRail, setActiveRail] = useState<'explore' | 'assets' | 'generate' | 'tools'>('assets');
  const showProjectsPane = activeRail === 'assets';

  const railItems: Array<{ key: 'explore' | 'assets' | 'generate' | 'tools'; icon: LucideIcon; label: string }> = [
    { key: 'explore', icon: Compass, label: 'Explore' },
    { key: 'assets', icon: FolderOpen, label: 'Assets' },
    { key: 'generate', icon: Wand2, label: 'Generate' },
    { key: 'tools', icon: Boxes, label: 'Tools' },
  ];

  return (
    <aside className="sticky top-20 self-start">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#08141f]/90 to-black/80 p-2 shadow-xl shadow-cyan-950/30">
          <div className="space-y-2">
            {railItems.map(item => (
              <button
                key={item.label}
                onClick={() => setActiveRail(item.key)}
                className={`w-full rounded-xl px-2 py-2.5 text-[11px] flex flex-col items-center gap-1 transition ${activeRail === item.key ? 'bg-white/10 text-[#D0FF59]' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`transition-all duration-300 ease-out overflow-hidden ${showProjectsPane ? 'w-[244px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-2 pointer-events-none'}`}>
          <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#07131f]/80 to-black/70 p-4 shadow-xl shadow-cyan-950/20">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Projects</p>
          <div className="space-y-2 mb-4 max-h-[48vh] overflow-auto pr-1">
            {projects.length === 0 && (
              <p className="text-xs text-gray-500">No project yet. Start from the idea box.</p>
            )}
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
          </div>
        </div>
      </div>
    </aside>
  );
}
