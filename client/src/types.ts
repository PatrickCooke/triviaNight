export type QuestionType = 'multi_part' | 'multiple_choice' | 'matching' | 'sequencing';

export interface Question {
  id: number;
  type: QuestionType;
  category: string;
  title: string;
  prompt: string;
  content: any;
  media_url?: string;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  location: string;
  game_code?: string;
  current_slide_index?: number;
  game_mode?: 'pub' | 'speed';
  digital_input?: boolean;
}

export interface Set {
  id: number;
  name: string;
  category?: string;
  description?: string;
}

export interface Team {
  id: number;
  name: string;
  event_id?: number;
  score?: number;
}

export interface Answer {
  id: number;
  team_id: number;
  question_id: number;
  answer_index: number;
  is_correct: boolean;
  timestamp: string;
}

export interface Slide {
  type: 'event_title' | 'set_title' | 'question' | 'question_results' | 'intermission' | 'event_end';
  title?: string;
  data?: any;
  roundNumber?: number;
  questionNumber?: number;
}
