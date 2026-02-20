import { useState } from 'react';
import { Boxes, Compass, FolderOpen, Wand2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MovieProject } from '@/types';

type ProjectSidebarProps = {
  projects: MovieProject[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
};

export function ProjectSidebar(props: ProjectSidebarProps) {
  const {
    projects,
    selectedProjectId,
    onSelectProject,
  } = props;

  const [activeRail, setActiveRail] = useState<'explore' | 'assets' | 'generate' | 'tools' | null>(null);
  const showSidePane = activeRail !== null;

  const railItems: Array<{ key: 'explore' | 'assets' | 'generate' | 'tools'; icon: LucideIcon; label: string }> = [
    { key: 'explore', icon: Compass, label: 'Explore' },
    { key: 'assets', icon: FolderOpen, label: 'Assets' },
    { key: 'generate', icon: Wand2, label: 'Generate' },
    { key: 'tools', icon: Boxes, label: 'Tools' },
  ];

  return (
    <aside className="hidden lg:block fixed left-4 top-24 z-30">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#08141f]/90 to-black/80 p-2 shadow-xl shadow-cyan-950/30">
          <div className="space-y-2">
            {railItems.map(item => (
              <button
                key={item.label}
                onClick={() => setActiveRail(prev => prev === item.key ? null : item.key)}
                className={`w-full rounded-xl px-2 py-2.5 text-[11px] flex flex-col items-center gap-1 transition ${activeRail === item.key ? 'bg-white/10 text-[#D0FF59]' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`transition-all duration-300 ease-out overflow-hidden ${showSidePane ? 'w-[244px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-2 pointer-events-none'}`}>
          <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#07131f]/80 to-black/70 p-4 shadow-xl shadow-cyan-950/20">
            {activeRail === 'assets' && (
              <>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Projects</p>
                <div className="space-y-2 mb-2 max-h-[52vh] overflow-auto pr-1">
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
              </>
            )}

            {activeRail === 'explore' && <p className="text-xs text-gray-500">Explore panel coming next.</p>}
            {activeRail === 'generate' && <p className="text-xs text-gray-500">Generate shortcuts coming next.</p>}
            {activeRail === 'tools' && <p className="text-xs text-gray-500">Tools panel coming next.</p>}
          </div>
        </div>
      </div>
    </aside>
  );
}
