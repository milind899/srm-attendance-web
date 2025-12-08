import { Feature, Testimonial } from '../types';

// Mock data - replace this with actual backend calls in a real scenario
const FEATURES_DATA: Feature[] = [
  {
    id: '1',
    title: 'Grant Tracking',
    description: 'Visualize deadlines, funding cycles, and application statuses in a unified timeline view.',
    icon: 'target',
    gridArea: 'lg:col-span-2'
  },
  {
    id: '2',
    title: 'Citation Graph',
    description: 'Automated dependency tracking for your literature review. Never miss a seminal paper.',
    icon: 'share-2',
    gridArea: 'lg:col-span-1'
  },
  {
    id: '3',
    title: 'Lab Notebooks',
    description: 'Version-controlled experimental logs that integrate directly with your raw data pipelines.',
    icon: 'book',
    gridArea: 'lg:col-span-1'
  },
  {
    id: '4',
    title: 'Real-time Collaboration',
    description: 'Co-author manuscripts with LaTeX support and real-time conflict resolution.',
    icon: 'users',
    gridArea: 'lg:col-span-2'
  },
  {
    id: '5',
    title: 'Automated Ethics',
    description: 'Built-in compliance checklists for IRB and data privacy regulations.',
    icon: 'shield-check',
    gridArea: 'lg:col-span-3'
  }
];

const TESTIMONIALS_DATA: Testimonial[] = [
  {
    id: 't1',
    author: 'Dr. Sarah Chen',
    role: 'Principal Investigator',
    institution: 'MIT Media Lab',
    quote: "Academia transformed how our lab handles data ingress. It feels like it was designed by researchers, for researchers.",
    avatarUrl: 'https://picsum.photos/100/100?random=1'
  },
  {
    id: 't2',
    author: 'James Wilson',
    role: 'PhD Candidate',
    institution: 'Stanford University',
    quote: "The citation tracking alone is worth the switch. It's the cleanest piece of software I've used in my academic career.",
    avatarUrl: 'https://picsum.photos/100/100?random=2'
  },
  {
    id: 't3',
    author: 'Prof. Alistair Cook',
    role: 'Dept. Head',
    institution: 'Oxford',
    quote: "Finally, a tool that respects the complexity of grant management without looking like a spreadsheet from 1999.",
    avatarUrl: 'https://picsum.photos/100/100?random=3'
  }
];

export const fetchFeatures = async (): Promise<Feature[]> => {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => resolve(FEATURES_DATA), 500);
  });
};

export const fetchTestimonials = async (): Promise<Testimonial[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(TESTIMONIALS_DATA), 600);
  });
};
