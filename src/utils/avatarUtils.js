export const AVATAR_COLORS = [
  '#09d3d6', // light blue
  '#d14578', // red
  '#54c46f', // green
  '#b532f9', // purple
  '#f2d841', // yellow
  '#ff7f00'  // orange
];

export function getInitials(name) {
  if (!name) return '??';
  // Trim name and split by spaces
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().substring(0, 2);
}

export function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
