
import { Github, Linkedin, Instagram } from 'lucide-react';

// Define a type for your social links for better type safety
export interface SocialLink {
  name: string;
  url: string;
  icon: React.ReactNode;
}

// Create the main configuration object
export const siteConfig = {
  name: "CREDIX",
  url: "https://ninad00.github.io/CredixSolana/",
  email: "Credix@gmail.com",
  github: "https://github.com/ninad00/CredixSolana",
};

// Create an array of social links for easy mapping in components
export const socialLinks: SocialLink[] = [
  {
    name: "GitHub",
    url: siteConfig.github,
    icon: <Github />,
  },
  {
    name: "Instagram",
    url: siteConfig.instagram,
    icon: <Instagram />,
  },
];