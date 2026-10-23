const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v)(?:\?.*)?$/i;

export function getVideoPoster(src: string): string {
  const path = src.split('?')[0];
  if (!path.startsWith('/examples/') || !VIDEO_EXTENSION.test(path)) {
    return '/examples/video-placeholder.svg';
  }

  const slashIndex = path.lastIndexOf('/');
  const filename = path.slice(slashIndex + 1);
  const extensionIndex = filename.lastIndexOf('.');
  const posterFilename = `${filename.slice(0, extensionIndex)}-poster.jpg`;
  return `${path.slice(0, slashIndex + 1)}${posterFilename}`;
}
