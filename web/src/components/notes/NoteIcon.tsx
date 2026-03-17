'use client';

import {
  FileText, File, Folder, FolderOpen, Star, Heart, Bookmark,
  Lightbulb, Zap, Target, Rocket, Code, Terminal, Database,
  MessageSquare, Mail, Bell, Calendar, Users, User, Globe, Home,
  Pencil, BookOpen, Newspaper, Megaphone, Mic, Camera, Palette,
  Music, Film, Image, Map, Building, Coffee, Clock, CheckCircle,
  AlertCircle, Lock, Key, Link, Send, Archive, Layers, Grid,
  Hash, AtSign, Cpu, Wifi, Shield, Bug, Flame, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const ICON_MAP: Record<string, LucideIcon> = {
  'file-text': FileText,
  'file': File,
  'folder': Folder,
  'folder-open': FolderOpen,
  'star': Star,
  'heart': Heart,
  'bookmark': Bookmark,
  'lightbulb': Lightbulb,
  'zap': Zap,
  'target': Target,
  'rocket': Rocket,
  'code': Code,
  'terminal': Terminal,
  'database': Database,
  'message': MessageSquare,
  'mail': Mail,
  'bell': Bell,
  'calendar': Calendar,
  'users': Users,
  'user': User,
  'globe': Globe,
  'home': Home,
  'pencil': Pencil,
  'book': BookOpen,
  'newspaper': Newspaper,
  'megaphone': Megaphone,
  'mic': Mic,
  'camera': Camera,
  'palette': Palette,
  'music': Music,
  'film': Film,
  'image': Image,
  'map': Map,
  'building': Building,
  'coffee': Coffee,
  'clock': Clock,
  'check': CheckCircle,
  'alert': AlertCircle,
  'lock': Lock,
  'key': Key,
  'link': Link,
  'send': Send,
  'archive': Archive,
  'layers': Layers,
  'grid': Grid,
  'hash': Hash,
  'at': AtSign,
  'cpu': Cpu,
  'wifi': Wifi,
  'shield': Shield,
  'bug': Bug,
  'flame': Flame,
  'sparkles': Sparkles,
};

export const ICON_NAMES = Object.keys(ICON_MAP);
export const DEFAULT_GROUP_ICON = 'folder';
export const DEFAULT_PAGE_ICON = 'file-text';

export function isIconName(value: string): boolean {
  return value in ICON_MAP;
}

interface NoteIconProps {
  name: string;
  size?: number;
  className?: string;
}

export default function NoteIcon({ name, size = 16, className }: NoteIconProps) {
  if (isIconName(name)) {
    const Icon = ICON_MAP[name];
    return <Icon size={size} className={cn('shrink-0', className)} strokeWidth={1.8} />;
  }
  // Fallback: render as emoji for legacy data
  return <span className={cn('shrink-0 leading-none', className)} style={{ fontSize: size }}>{name}</span>;
}
