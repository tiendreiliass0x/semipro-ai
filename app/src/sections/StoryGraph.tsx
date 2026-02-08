import { useRef, useState, useMemo, useEffect } from 'react';
import { Calendar, User, MapPin, Tag, X, ChevronLeft, ChevronRight, Network, Clock } from 'lucide-react';
import { useTimeline } from '@/context/TimelineContext';
import type { Anecdote } from '@/types';

interface Connection {
  from: string;
  to: string;
  type: 'storyteller' | 'tag';
  label?: string;
}

export function StoryGraph() {
  const { anecdotes, setExpandedAnecdote } = useTimeline();
  const [selectedStory, setSelectedStory] = useState<Anecdote | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'network'>('timeline');
  const [filterStoryteller, setFilterStoryteller] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const years = useMemo(() => {
    return [...new Set(anecdotes.map(a => a.year))].sort((a, b) => a - b);
  }, [anecdotes]);

  const storytellers = useMemo(() => {
    return [...new Set(anecdotes.map(a => a.storyteller))].sort();
  }, [anecdotes]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    anecdotes.forEach(a => a.tags.forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [anecdotes]);

  const filteredAnecdotes = useMemo(() => {
    return anecdotes.filter(a => {
      if (filterStoryteller && a.storyteller !== filterStoryteller) return false;
      if (filterTag && !a.tags.includes(filterTag)) return false;
      return true;
    });
  }, [anecdotes, filterStoryteller, filterTag]);

  const storiesByYear = useMemo(() => {
    const grouped: Record<number, Anecdote[]> = {};
    years.forEach(year => {
      grouped[year] = filteredAnecdotes.filter(a => a.year === year);
    });
    return grouped;
  }, [filteredAnecdotes, years]);

  const connections = useMemo(() => {
    const conns: Connection[] = [];
    for (let i = 0; i < filteredAnecdotes.length; i++) {
      for (let j = i + 1; j < filteredAnecdotes.length; j++) {
        const a1 = filteredAnecdotes[i];
        const a2 = filteredAnecdotes[j];
        if (a1.storyteller === a2.storyteller) {
          conns.push({ from: a1.id, to: a2.id, type: 'storyteller', label: a1.storyteller });
        }
        const sharedTags = a1.tags.filter(t => a2.tags.includes(t));
        if (sharedTags.length > 0) {
          const topTags = sharedTags.slice(0, 2).join(', ');
          const suffix = sharedTags.length > 2 ? ` +${sharedTags.length - 2}` : '';
          conns.push({ from: a1.id, to: a2.id, type: 'tag', label: `${topTags}${suffix}` });
        }
      }
    }
    return conns;
  }, [filteredAnecdotes]);

  const getConnectedStories = (storyId: string) => {
    return connections
      .filter(c => c.from === storyId || c.to === storyId)
      .map(c => ({
        story: filteredAnecdotes.find(a => a.id === (c.from === storyId ? c.to : c.from))!,
        type: c.type,
        label: c.label
      }))
      .filter(c => c.story);
  };

  const clearFilters = () => {
    setFilterStoryteller(null);
    setFilterTag(null);
  };

  return (
    <section id="story-graph" className="relative min-h-screen py-20 px-4">
      <div className="text-center mb-8">
        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white mb-4">
          THE STORY WEB
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Discover how stories connect through time, people, and themes.
        </p>
      </div>

      <div className="max-w-6xl mx-auto mb-8 space-y-4">
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              viewMode === 'timeline' ? 'bg-[#D0FF59] text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Timeline View
          </button>
          <button
            onClick={() => setViewMode('network')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              viewMode === 'network' ? 'bg-[#D0FF59] text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Network className="w-4 h-4" />
            Network View
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <select
            value={filterStoryteller || ''}
            onChange={(e) => setFilterStoryteller(e.target.value || null)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm"
          >
            <option value="">All Storytellers</option>
            {storytellers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterTag || ''}
            onChange={(e) => setFilterTag(e.target.value || null)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm"
          >
            <option value="">All Tags</option>
            {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
          </select>
          {(filterStoryteller || filterTag) && (
            <button onClick={clearFilters} className="px-4 py-2 text-[#D0FF59] text-sm hover:underline">
              Clear filters
            </button>
          )}
        </div>

        <div className="flex justify-center gap-6 text-sm text-gray-500">
          <span>{filteredAnecdotes.length} stories</span>
          <span>{storytellers.length} storytellers</span>
          <span>{allTags.length} themes</span>
          <span>{connections.length} connections</span>
        </div>
      </div>

      <div className="relative w-full max-w-6xl mx-auto">
        {viewMode === 'timeline' ? (
          <TimelineView years={years} storiesByYear={storiesByYear} onSelectStory={setSelectedStory} />
        ) : (
          <NetworkView anecdotes={filteredAnecdotes} connections={connections} onSelectStory={setSelectedStory} />
        )}
      </div>

      {selectedStory && (
        <StoryDetailModal
          story={selectedStory}
          connectedStories={getConnectedStories(selectedStory.id)}
          onClose={() => setSelectedStory(null)}
          onExpand={() => {
            setExpandedAnecdote(selectedStory);
            setSelectedStory(null);
          }}
        />
      )}
    </section>
  );
}

function TimelineView({ years, storiesByYear, onSelectStory }: {
  years: number[];
  storiesByYear: Record<number, Anecdote[]>;
  onSelectStory: (story: Anecdote) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 bg-gray-800/90 hover:bg-gray-700 rounded-full shadow-lg transition-all">
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 bg-gray-800/90 hover:bg-gray-700 rounded-full shadow-lg transition-all">
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide px-16 py-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex items-start gap-8 min-w-max">
          {years.map((year) => {
            const stories = storiesByYear[year] || [];
            if (stories.length === 0) return null;
            return (
              <div key={year} className="flex flex-col items-center relative">
                <div className="mb-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D0FF59] to-[#a8cc47] flex items-center justify-center shadow-lg shadow-[#D0FF59]/20">
                    <span className="text-black font-bold text-lg">{year}</span>
                  </div>
                  <div className="mt-2 text-gray-500 text-sm">{stories.length} stories</div>
                </div>
                <div className="flex flex-col gap-4">
                  {stories.map((story) => (
                    <StoryCard key={story.id} story={story} onClick={() => onSelectStory(story)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute top-[52px] left-16 right-16 h-0.5 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 -z-10" />
      </div>
    </div>
  );
}

function StoryCard({ story, onClick }: { story: Anecdote; onClick: () => void }) {
  return (
    <div onClick={onClick} className="relative w-72 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border border-gray-700 hover:border-[#D0FF59]/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-[#D0FF59]/10 group">
      <div className="flex items-center gap-2 text-[#D0FF59] text-xs mb-2">
        <Calendar className="w-3 h-3" />
        {new Date(story.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
      <h4 className="text-white font-semibold text-sm mb-2 line-clamp-2 group-hover:text-[#D0FF59] transition-colors">{story.title}</h4>
      <p className="text-gray-400 text-xs line-clamp-2 mb-3">{story.story}</p>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <span className="truncate max-w-[80px]">{story.storyteller}</span>
        </div>
        {story.location && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{story.location}</span>
          </div>
        )}
      </div>
      {story.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-700">
          {story.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">#{tag}</span>
          ))}
          {story.tags.length > 3 && <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">+{story.tags.length - 3}</span>}
        </div>
      )}
    </div>
  );
}

function NetworkView({ anecdotes, connections, onSelectStory }: {
  anecdotes: Anecdote[];
  connections: Connection[];
  onSelectStory: (story: Anecdote) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 960, height: 540 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      const width = Math.max(320, Math.floor(containerRef.current!.clientWidth));
      const height = Math.min(640, Math.max(460, 420 + Math.ceil(anecdotes.length / 8) * 40));
      setDimensions({ width, height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [anecdotes.length]);

  const yearGroups = useMemo(() => {
    const groups: Record<number, Anecdote[]> = {};
    anecdotes.forEach(a => {
      if (!groups[a.year]) groups[a.year] = [];
      groups[a.year].push(a);
    });
    return groups;
  }, [anecdotes]);

  const years = useMemo(() => {
    return Object.keys(yearGroups).map(Number).sort((a, b) => a - b);
  }, [yearGroups]);

  const nodes = useMemo(() => {
    const nodeMap = new Map<string, { x: number; y: number; anecdote: Anecdote }>();
    if (!years.length) return nodeMap;

    const leftPad = 70;
    const rightPad = 70;
    const topPad = 84;
    const bottomPad = 56;
    const laneWidth = Math.max(1, dimensions.width - leftPad - rightPad);

    const seededOffset = (seed: string, spread: number) => {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0;
      }
      const normalized = ((hash % 1000) + 1000) % 1000;
      return ((normalized / 999) * 2 - 1) * spread;
    };

    years.forEach((year, yearIndex) => {
      const stories = (yearGroups[year] || []).slice().sort((a, b) => a.date.localeCompare(b.date));
      const laneX = years.length === 1
        ? dimensions.width / 2
        : leftPad + (yearIndex * laneWidth) / (years.length - 1);
      const storyHeight = Math.max(1, dimensions.height - topPad - bottomPad);
      const storyGap = storyHeight / (stories.length + 1);

      stories.forEach((story, storyIndex) => {
        const jitterX = seededOffset(`${story.id}-${year}-x`, 22);
        const jitterY = seededOffset(`${story.id}-${year}-y`, 14);
        nodeMap.set(story.id, {
          x: laneX + jitterX,
          y: topPad + (storyIndex + 1) * storyGap + jitterY,
          anecdote: story
        });
      });
    });
    return nodeMap;
  }, [yearGroups, years, dimensions.width, dimensions.height]);

  const connectionCount = useMemo(() => {
    const counts = new Map<string, number>();
    connections.forEach(conn => {
      counts.set(conn.from, (counts.get(conn.from) || 0) + 1);
      counts.set(conn.to, (counts.get(conn.to) || 0) + 1);
    });
    return counts;
  }, [connections]);

  return (
    <div ref={containerRef} className="glass rounded-2xl p-6 overflow-hidden border border-gray-700/70 bg-gradient-to-b from-gray-900/80 to-black/40">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">Story clusters by year, linked by storyteller and shared themes.</p>
        <p className="text-xs text-gray-500">{years.length} year lanes</p>
      </div>
      <svg viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} className="w-full" style={{ height: `${dimensions.height}px` }}>
        {years.map((year, index) => {
          const x = years.length === 1
            ? dimensions.width / 2
            : 70 + (index * Math.max(1, dimensions.width - 140)) / (years.length - 1);
          return (
            <g key={`lane-${year}`}>
              <line
                x1={x}
                y1={56}
                x2={x}
                y2={dimensions.height - 40}
                stroke="#374151"
                strokeWidth={1}
                strokeDasharray="4 6"
                opacity={0.45}
              />
              <rect x={x - 28} y={20} width={56} height={24} rx={12} fill="#111827" stroke="#4B5563" />
              <text x={x} y={36} textAnchor="middle" fill="#D1D5DB" fontSize="11" fontWeight={600}>{year}</text>
            </g>
          );
        })}

        {connections.map((conn, i) => {
          const from = nodes.get(conn.from);
          const to = nodes.get(conn.to);
          if (!from || !to) return null;
          const isHighlighted = hoveredId === conn.from || hoveredId === conn.to;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 - Math.min(38, Math.abs(from.x - to.x) * 0.12);
          return (
            <path
              key={i}
              d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
              fill="none"
              stroke={conn.type === 'storyteller' ? '#3B82F6' : '#EC4899'}
              strokeWidth={isHighlighted ? 2.8 : 1.2}
              strokeOpacity={isHighlighted ? 0.95 : 0.24}
              strokeDasharray={conn.type === 'tag' ? '5,5' : 'none'}
              className="transition-all duration-300"
            />
          );
        })}

        {Array.from(nodes.entries()).map(([id, node]) => {
          const anecdote = node.anecdote;
          const storyConns = connectionCount.get(id) || 0;
          const isHighlighted = hoveredId === id;
          return (
            <g
              key={id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onClick={() => onSelectStory(anecdote)}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <circle r={isHighlighted ? 28 : 23} fill={isHighlighted ? '#E7FF9A' : '#D0FF59'} stroke="#0F172A" strokeWidth={2} className="transition-all duration-300" filter="url(#glow)" />
              <text textAnchor="middle" dy="0.35em" fill="#0B0F1A" fontSize="13" fontWeight="bold">{anecdote.title.charAt(0).toUpperCase()}</text>
              {storyConns > 0 && (
                <>
                  <circle cx={18} cy={-18} r={9} fill="#111827" stroke="#4B5563" />
                  <text x={18} y={-18} textAnchor="middle" dy="0.35em" fill="#fff" fontSize="8.5">{storyConns}</text>
                </>
              )}
              <text y={38} textAnchor="middle" fill="#E5E7EB" fontSize="10" className="pointer-events-none">
                {anecdote.title.length > 20 ? anecdote.title.slice(0, 20) + '...' : anecdote.title}
              </text>
            </g>
          );
        })}

        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div className="flex justify-center gap-6 mt-4 text-sm bg-black/30 border border-gray-800 rounded-xl py-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500" />
          <span className="text-gray-400">Same Storyteller</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-pink-500" style={{ background: 'repeating-linear-gradient(90deg, #EC4899, #EC4899 5px, transparent 5px, transparent 10px)' }} />
          <span className="text-gray-400">Shared Tag</span>
        </div>
      </div>
    </div>
  );
}

function StoryDetailModal({ story, connectedStories, onClose, onExpand }: {
  story: Anecdote;
  connectedStories: { story: Anecdote; type: string; label?: string }[];
  onClose: () => void;
  onExpand: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto border border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">{story.title}</h3>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-[#D0FF59]" />
                {new Date(story.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4 text-blue-400" />
                {story.storyteller}
              </div>
              {story.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-pink-400" />
                  {story.location}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 leading-relaxed line-clamp-4">{story.story}</p>
        </div>

        {story.tags.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Themes
            </h4>
            <div className="flex flex-wrap gap-2">
              {story.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-gray-800 text-[#D0FF59] rounded-full text-sm">#{tag}</span>
              ))}
            </div>
          </div>
        )}

        {connectedStories.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-500 mb-3">Connected Stories ({connectedStories.length})</h4>
            <div className="space-y-2 max-h-48 overflow-auto">
              {connectedStories.map(({ story: connected, type, label }) => (
                <div key={connected.id} onClick={onExpand} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${type === 'storyteller' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{connected.title}</p>
                    <p className="text-gray-500 text-xs">
                      {type === 'storyteller' ? `Same storyteller: ${label}` : `Shared tag: #${label}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onExpand} className="flex-1 px-4 py-3 bg-[#D0FF59] text-black font-semibold rounded-lg hover:bg-[#b8e04d] transition-colors">
            Read Full Story
          </button>
          <button onClick={onClose} className="px-4 py-3 border border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
