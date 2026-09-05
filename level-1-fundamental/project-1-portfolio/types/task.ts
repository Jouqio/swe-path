export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type TaskFilter = "ALL" | "ACTIVE" | "COMPLETED";

export interface Task {
  readonly id: string;
  title: string;
  category: string;
  priority: Priority;
  isCompleted: boolean;
  createdAt: string;
}

export interface DeveloperProfile {
  name: string;
  headline: string;
  bio: string;
  skills: string[];
  githubUrl: string;
  featuredProjects: {
    id: string;
    title: string;
    description: string;
    techStack: string[];
    liveUrl: string;
  }[];
}
