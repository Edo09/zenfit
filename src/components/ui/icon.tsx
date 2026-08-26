import {
  Activity,
  Apple,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Bed,
  Bell,
  Calendar,
  CalendarDays,
  Camera,
  ChartColumn,
  ChartLine,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleAlert,
  Coffee,
  CircleCheck,
  CirclePlay,
  CircleX,
  Clock,
  Droplet,
  Dumbbell,
  Egg,
  Eye,
  EyeOff,
  Flag,
  Flame,
  Gauge,
  Globe,
  Heart,
  Home,
  Image,
  Inbox,
  Info,
  KeyRound,
  Languages,
  ListChecks,
  Lock,
  LogOut,
  Mail,
  Medal,
  MessageCircle,
  Minus,
  Monitor,
  Moon,
  MoreVertical,
  Pause,
  Pencil,
  Percent,
  Pill,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Ruler,
  Salad,
  Scale,
  Search,
  Settings,
  SlidersHorizontal,
  Smartphone,
  Soup,
  Sparkles,
  Square,
  SquareCheckBig,
  Star,
  Sun,
  Sunrise,
  Target,
  Timer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Utensils,
  WifiOff,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import React from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { useColors } from "@/src/theme/colors";

/**
 * Single icon surface for the app. lucide-react-native only: rounded caps and
 * joins, 1.9 stroke, `currentColor`-style tinting via the `color` prop.
 * Keeping a name→component registry (rather than importing lucide directly at
 * every call site) means one place enforces the stroke weight and one list to
 * audit when the icon language changes.
 */
const ICONS = {
  // Navigation / structure
  home: Home,
  dumbbell: Dumbbell,
  utensils: Utensils,
  chart: ChartColumn,
  "chart-line": ChartLine,
  user: User,
  settings: Settings,
  sliders: SlidersHorizontal,
  "log-out": LogOut,
  // Actions
  plus: Plus,
  minus: Minus,
  x: X,
  check: Check,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  "more-vertical": MoreVertical,
  pencil: Pencil,
  trash: Trash2,
  search: Search,
  camera: Camera,
  image: Image,
  play: Play,
  "play-circle": CirclePlay,
  pause: Pause,
  refresh: RefreshCw,
  square: Square,
  "square-check": SquareCheckBig,
  circle: Circle,
  // Training / progress semantics
  flame: Flame,
  sparkles: Sparkles,
  target: Target,
  clock: Clock,
  timer: Timer,
  calendar: Calendar,
  "calendar-days": CalendarDays,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  scale: Scale,
  ruler: Ruler,
  activity: Activity,
  award: Award,
  trophy: Trophy,
  medal: Medal,
  star: Star,
  heart: Heart,
  droplet: Droplet,
  zap: Zap,
  repeat: Repeat,
  percent: Percent,
  gauge: Gauge,
  bed: Bed,
  flag: Flag,
  "list-checks": ListChecks,
  // Nutrition
  salad: Salad,
  apple: Apple,
  soup: Soup,
  egg: Egg,
  coffee: Coffee,
  // System / feedback
  "alert-circle": CircleAlert,
  info: Info,
  "check-circle": CircleCheck,
  "x-circle": CircleX,
  "wifi-off": WifiOff,
  inbox: Inbox,
  moon: Moon,
  sun: Sun,
  sunrise: Sunrise,
  pill: Pill,
  monitor: Monitor,
  smartphone: Smartphone,
  bell: Bell,
  lock: Lock,
  key: KeyRound,
  mail: Mail,
  eye: Eye,
  "eye-off": EyeOff,
  globe: Globe,
  languages: Languages,
  "message-circle": MessageCircle,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  /** Defaults to content-primary. */
  color?: string;
  /** Spec default 1.9; drop to ~1.6 for very large glyphs. */
  strokeWidth?: number;
  /** Only `play` is ever filled. */
  fill?: string;
  style?: StyleProp<ViewStyle>;
};

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 1.9,
  fill = "none",
  style,
}: IconProps) {
  const colors = useColors();
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      color={color ?? colors.contentPrimary}
      strokeWidth={strokeWidth}
      fill={fill}
      style={style}
    />
  );
}
