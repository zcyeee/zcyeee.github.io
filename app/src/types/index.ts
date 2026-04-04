export interface PersonalInfo {
  name: string;
  motto: string;
  bio: string;
  email: string;
  github?: string;
  linkedin?: string;
  googleScholar?: string;
  location: string;
  avatar?: string;
}

export interface Education {
  school: string;
  degree: string;
  field: string;
  department?: string;
  startDate: string;
  endDate: string;
}

export interface Experience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  intro?: string;
  description: string[];
  location?: string;
  logo?: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  github?: string;
  image?: string;
  date?: string;
  stars?: number;
}

export interface Award {
  title: string;
  organization: string;
  date: string;
  description?: string;
}

export interface Research {
  title: string;
  authors: string;
  venue: string;
  year: string;
  link?: string;
  tags: string[];
}
