/** Default scene palette ("dusk orchard"). Apps can override any of these via CSS variables. */
export const treeTheme = {
  skyTop: '#0B1F1B',
  skyBottom: '#183A30',
  glow: '#3E6B4C',
  barkDark: '#3A2618',
  barkLight: '#8A5A36',
  leaves: [
    ['#5E9C5A', '#2F6A3E'],
    ['#7DB065', '#3F7A42'],
    ['#4F8F6A', '#24573F'],
    ['#93B86A', '#4E7D3B'],
  ],
  sprout: ['#E9F5B8', '#B8D86A'],
  withered: ['#D9C39A', '#A8875A'],
  ink: '#F4EFE2',
  inkOnLeaf: '#FFFFFF',
  badge: 'rgba(14, 33, 28, 0.72)',
  gold: '#E3C27A',
} as const;
