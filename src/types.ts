export interface DrawingStep {
  step_number: number;
  instruction: string;
  svg_code: string;
}

export interface DrawingTutorial {
  id: string;
  title: string;
  subject: string;
  steps: DrawingStep[];
  createdAt: string;
  sourceType: 'text' | 'image' | 'preset';
  originalImage?: string;
}

export interface DrawingPreset {
  id: string;
  title: string;
  category: string;
  prompt: string;
  iconName: string;
  description: string;
  sampleSteps?: DrawingStep[];
}

export interface GenerationRequest {
  prompt?: string;
  imageBase64?: string;
  mimeType?: string;
  complexity?: 'easy' | 'standard' | 'detailed';
}
