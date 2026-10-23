import {
  Brush,
  Clapperboard,
  Palette,
  RefreshCcw,
  Scissors,
  Search,
} from 'lucide-react';

export type EffectToolDefinition = {
  id: 'upscale' | 'remove_bg' | 'colorize' | 'cartoonize' | 'restore' | 'motion_control';
  icon: typeof Search;
  href: string;
  settingKey: string;
  defaultCost: number;
  glow: string;
  orb: string;
  accent: string;
  image: string;
  exampleBefore?: string;
  exampleAfter?: string;
};

const localExample = (path: string) => encodeURI(path);

export const EFFECT_TOOLS: EffectToolDefinition[] = [
  {
    id: 'motion_control',
    icon: Clapperboard,
    href: '/video?model=kling-3%2Fmotion-control',
    settingKey: 'cost_effect_motion_control',
    defaultCost: 20,
    glow: 'from-cyan-500/30 via-sky-400/18 to-transparent',
    orb: 'from-cyan-400 to-sky-300',
    accent: 'text-cyan-300',
    image: localExample('/examples/kling-3motion-control/after.mp4'),
    exampleBefore: localExample('/examples/kling-3motion-control/before.mp4'),
    exampleAfter: localExample('/examples/kling-3motion-control/after.mp4'),
  },
  {
    id: 'upscale',
    icon: Search,
    href: '/tool/upscale',
    settingKey: 'cost_effect_upscale',
    defaultCost: 2,
    glow: 'from-sky-500/30 via-cyan-400/18 to-transparent',
    orb: 'from-sky-400 to-cyan-300',
    accent: 'text-sky-300',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200',
  },
  {
    id: 'remove_bg',
    icon: Scissors,
    href: '/tool/remove_bg',
    settingKey: 'cost_effect_remove_bg',
    defaultCost: 3,
    glow: 'from-violet-500/30 via-fuchsia-400/18 to-transparent',
    orb: 'from-violet-400 to-fuchsia-300',
    accent: 'text-violet-300',
    image: localExample('/examples/removebg/after.png'),
    exampleBefore: localExample('/examples/removebg/before.jpg'),
    exampleAfter: localExample('/examples/removebg/after.png'),
  },
  {
    id: 'colorize',
    icon: Palette,
    href: '/tool/colorize',
    settingKey: 'cost_effect_colorize',
    defaultCost: 3,
    glow: 'from-amber-500/30 via-orange-400/18 to-transparent',
    orb: 'from-amber-400 to-orange-300',
    accent: 'text-amber-300',
    image: localExample('/examples/Колоризация/after.jpg'),
    exampleBefore: localExample('/examples/Колоризация/before.jpg'),
    exampleAfter: localExample('/examples/Колоризация/after.jpg'),
  },
  {
    id: 'cartoonize',
    icon: Brush,
    href: '/tool/cartoonize',
    settingKey: 'cost_effect_cartoonize',
    defaultCost: 3,
    glow: 'from-emerald-500/30 via-teal-400/18 to-transparent',
    orb: 'from-emerald-400 to-teal-300',
    accent: 'text-emerald-300',
    image: localExample('/examples/Мультяшный стиль/after.jpg'),
    exampleBefore: localExample('/examples/Мультяшный стиль/before.jpg'),
    exampleAfter: localExample('/examples/Мультяшный стиль/after.jpg'),
  },
  {
    id: 'restore',
    icon: RefreshCcw,
    href: '/tool/restore',
    settingKey: 'cost_effect_restore',
    defaultCost: 3,
    glow: 'from-yellow-500/28 via-amber-400/16 to-transparent',
    orb: 'from-yellow-300 to-amber-300',
    accent: 'text-yellow-200',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200',
  },
];

export const EFFECT_HERO_PREVIEW_IDS = ['motion_control', 'upscale', 'colorize'] as const;
