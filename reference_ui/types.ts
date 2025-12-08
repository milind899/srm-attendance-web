export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  gridArea?: string; // For bento grid layout hints
}

export interface Testimonial {
  id: string;
  author: string;
  role: string;
  institution: string;
  quote: string;
  avatarUrl: string;
}

export interface NavigationItem {
  label: string;
  href: string;
}

export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  GHOST = 'ghost',
}
