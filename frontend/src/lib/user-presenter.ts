export function getUserDisplayName(user: {
  display_name?: string | null;
  email?: string | null;
  author_display_name?: string | null;
  author_email?: string | null;
}) {
  const displayName = user.display_name ?? user.author_display_name ?? null;
  if (displayName && displayName.trim()) {
    return displayName.trim();
  }

  const email = user.email ?? user.author_email ?? '';
  if (!email) return 'Creator';

  const [localPart] = email.split('@');
  return localPart || email;
}

export function getUserAvatarUrl(user: {
  avatar_url?: string | null;
  author_avatar_url?: string | null;
}) {
  return user.avatar_url ?? user.author_avatar_url ?? null;
}

export function getUserInitials(user: {
  display_name?: string | null;
  email?: string | null;
  author_display_name?: string | null;
  author_email?: string | null;
}) {
  const displayName = getUserDisplayName(user).trim();
  if (!displayName) return 'G';

  const parts = displayName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
