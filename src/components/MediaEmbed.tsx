'use client';

import { RecordMedia } from '@/types/platform';

interface MediaEmbedProps {
  media: RecordMedia;
  className?: string;
}

export default function MediaEmbed({ media, className = '' }: MediaEmbedProps) {
  const { media_type, url, embed_url, title, description, provider } = media;

  // Image
  if (media_type === 'image') {
    return (
      <figure className={`${className} space-y-2`}>
        <img 
          src={embed_url || url} 
          alt={title || 'Image'} 
          className="w-full rounded-lg shadow-md"
        />
        {title && <figcaption className="text-sm font-medium text-gray-700">{title}</figcaption>}
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </figure>
    );
  }

  // Video - YouTube, Vimeo, or direct
  if (media_type === 'video') {
    if (provider === 'youtube' || provider === 'vimeo') {
      return (
        <figure className={`${className} space-y-2`}>
          <div className="relative w-full pb-[56.25%]"> {/* 16:9 aspect ratio */}
            <iframe
              src={embed_url || url}
              className="absolute top-0 left-0 w-full h-full rounded-lg shadow-md"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {title && <figcaption className="text-sm font-medium text-gray-700">{title}</figcaption>}
          {description && <p className="text-sm text-gray-600">{description}</p>}
        </figure>
      );
    }
    
    // Direct video file
    return (
      <figure className={`${className} space-y-2`}>
        <video 
          src={embed_url || url} 
          controls 
          className="w-full rounded-lg shadow-md"
        >
          Your browser does not support the video tag.
        </video>
        {title && <figcaption className="text-sm font-medium text-gray-700">{title}</figcaption>}
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </figure>
    );
  }

  // Audio
  if (media_type === 'audio') {
    return (
      <figure className={`${className} space-y-2`}>
        {title && <figcaption className="text-sm font-medium text-gray-700">{title}</figcaption>}
        <audio 
          src={embed_url || url} 
          controls 
          className="w-full"
        >
          Your browser does not support the audio tag.
        </audio>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </figure>
    );
  }

  // Embed (Twitter, etc.)
  if (media_type === 'embed') {
    if (provider === 'twitter') {
      return (
        <div className={`${className} border rounded-lg p-4 bg-gray-50`}>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View on Twitter/X →
          </a>
          {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
        </div>
      );
    }
    
    // Generic embed
    return (
      <figure className={`${className} space-y-2`}>
        <div className="relative w-full pb-[56.25%]">
          <iframe
            src={embed_url || url}
            className="absolute top-0 left-0 w-full h-full rounded-lg shadow-md border"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
        {title && <figcaption className="text-sm font-medium text-gray-700">{title}</figcaption>}
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </figure>
    );
  }

  // Document/other - just show link
  return (
    <div className={`${className} border rounded-lg p-4 bg-gray-50`}>
      {title && <p className="font-medium text-gray-900 mb-1">{title}</p>}
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline text-sm"
      >
        View {media_type} →
      </a>
      {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
    </div>
  );
}
