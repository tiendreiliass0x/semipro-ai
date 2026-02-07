import { useState, useRef } from 'react';
import { X, Plus, Video, Music, Upload, Loader2, MapPin } from 'lucide-react';
import { useTimeline } from '@/context/TimelineContext';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AnecdoteFormProps {
  year: number;
  onClose: () => void;
}

export function AnecdoteForm({ year, onClose }: AnecdoteFormProps) {
  const { addAnecdote } = useTimeline();
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [storyteller, setStoryteller] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(`${year}-01-01`);
  const [tags, setTags] = useState('');
  const [mediaUrls, setMediaUrls] = useState<{ url: string; type: 'image' | 'video' | 'audio'; caption: string; filename?: string }[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [newMediaCaption, setNewMediaCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !story.trim() || !storyteller.trim()) return;

    addAnecdote({
      date,
      year,
      title: title.trim(),
      story: story.trim(),
      storyteller: storyteller.trim(),
      location: location.trim(),
      notes: notes.trim(),
      media: mediaUrls.map(m => ({
        id: '',
        type: m.type,
        url: m.url,
        caption: m.caption
      })),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });

    onClose();
  };

  const addMedia = () => {
    if (!newMediaUrl.trim()) return;
    setMediaUrls([...mediaUrls, { 
      url: newMediaUrl.trim(), 
      type: newMediaType,
      caption: newMediaCaption.trim()
    }]);
    setNewMediaUrl('');
    setNewMediaCaption('');
  };

  const removeMedia = async (index: number) => {
    const media = mediaUrls[index];
    // If it's an uploaded file, delete it from server
    if (media.filename) {
      try {
        await api.deleteImage(media.filename);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(`Uploading ${files.length} image${files.length > 1 ? 's' : ''}...`);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const result = await api.uploadImage(file);
        return {
          url: result.url,
          type: 'image' as const,
          caption: '',
          filename: result.filename,
        };
      });

      const uploadedMedia = await Promise.all(uploadPromises);
      setMediaUrls([...mediaUrls, ...uploadedMedia]);
      setUploadProgress('');
    } catch (error) {
      console.error('Error uploading images:', error);
      setUploadProgress('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const updateMediaCaption = (index: number, caption: string) => {
    setMediaUrls(mediaUrls.map((m, i) => i === index ? { ...m, caption } : m));
  };

  return (
    <div className="glass rounded-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-2xl text-white">
          Add Story from {year}
        </h3>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div>
          <Label htmlFor="date" className="text-gray-300">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-gray-800/50 border-gray-700 text-white mt-1"
            required
          />
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="title" className="text-gray-300">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What happened?"
            className="bg-gray-800/50 border-gray-700 text-white mt-1"
            required
          />
        </div>

        {/* Story */}
        <div>
          <Label htmlFor="story" className="text-gray-300">Your Story</Label>
          <Textarea
            id="story"
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Tell us what happened..."
            className="bg-gray-800/50 border-gray-700 text-white mt-1 min-h-[120px]"
            required
          />
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location" className="text-gray-300 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where did this happen? (e.g., Showbox, Gas Works Park)"
            className="bg-gray-800/50 border-gray-700 text-white mt-1"
          />
        </div>

        {/* Storyteller */}
        <div>
          <Label htmlFor="storyteller" className="text-gray-300">Your Name</Label>
          <Input
            id="storyteller"
            value={storyteller}
            onChange={(e) => setStoryteller(e.target.value)}
            placeholder="Who are you?"
            className="bg-gray-800/50 border-gray-700 text-white mt-1"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-gray-300">Additional Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional context or details..."
            className="bg-gray-800/50 border-gray-700 text-white mt-1"
          />
        </div>

        {/* Tags */}
        <div>
          <Label htmlFor="tags" className="text-gray-300">Tags (comma separated)</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., concert, wizkid, dance"
            className="bg-gray-800/50 border-gray-700 text-white mt-1"
          />
        </div>

        {/* Media */}
        <div>
          <Label className="text-gray-300">Media</Label>
          
          {/* Image Upload Button */}
          <div className="mt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
              className="w-full border-dashed border-2 border-gray-600 text-gray-300 hover:border-[#D0FF59] hover:text-[#D0FF59] py-4"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {uploadProgress}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Images
                </>
              )}
            </Button>
            <p className="text-gray-500 text-xs mt-1">
              Click to upload images (max 10MB each)
            </p>
          </div>

          {/* Or Add Media by URL */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-500 text-sm mb-2">Or add media by URL:</p>
            <div className="flex gap-2">
              <select
                value={newMediaType}
                onChange={(e) => setNewMediaType(e.target.value as 'image' | 'video' | 'audio')}
                className="bg-gray-800/50 border border-gray-700 text-white rounded-md px-3 py-2"
              >
                <option value="image">Image URL</option>
                <option value="video">Video URL</option>
                <option value="audio">Audio URL</option>
              </select>
              <Input
                value={newMediaUrl}
                onChange={(e) => setNewMediaUrl(e.target.value)}
                placeholder="https://..."
                className="bg-gray-800/50 border-gray-700 text-white flex-1"
              />
              <Button
                type="button"
                onClick={addMedia}
                variant="outline"
                className="border-[#D0FF59] text-[#D0FF59] hover:bg-[#D0FF59] hover:text-black"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Media List */}
          {mediaUrls.length > 0 && (
            <div className="mt-4 space-y-2">
              {mediaUrls.map((media, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg"
                >
                  {media.type === 'image' && (
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-700 rounded overflow-hidden">
                      <img 
                        src={media.url.startsWith('/uploads/') ? api.getUploadsUrl(media.url) : media.url} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {media.type === 'video' && <Video className="w-5 h-5 text-[#D0FF59] flex-shrink-0 mt-1" />}
                  {media.type === 'audio' && <Music className="w-5 h-5 text-[#D0FF59] flex-shrink-0 mt-1" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{media.url}</p>
                    <Input
                      value={media.caption}
                      onChange={(e) => updateMediaCaption(index, e.target.value)}
                      placeholder="Add a caption..."
                      className="bg-gray-700/50 border-gray-600 text-white text-xs mt-1"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isUploading}
            className="flex-1 bg-[#D0FF59] text-black hover:bg-[#b8e04d]"
          >
            Add Story
          </Button>
        </div>
      </form>
    </div>
  );
}
