export interface Media {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  caption?: string;
}

export interface Anecdote {
  id: string;
  date: string;
  year: number;
  title: string;
  story: string;
  storyteller: string;
  location: string;
  notes: string;
  media: Media[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TimelineYear {
  year: number;
  anecdotes: Anecdote[];
}

export interface StoryNode {
  id: string;
  anecdote: Anecdote;
  x: number;
  y: number;
}

export interface StoryLink {
  source: string;
  target: string;
  type: 'date' | 'storyteller' | 'tag';
}
