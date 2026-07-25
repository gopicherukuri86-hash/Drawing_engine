export type Medium = 'watercolour' | 'soft pastel' | 'pen and wash' | 'mixed';

export type DrawingLayer = 'construction' | 'outline' | 'detail';

export interface DrawingStep {
  step_number: number;
  instruction: string;
  svg_code: string;
  layer?: DrawingLayer;
}

export interface LayoutOption {
  thumbnail_svg: string;
  label: string;
  note: string;
}

export interface CompositionGuide {
  layouts: LayoutOption[];
  focal_point: string;
  eye_path: string;
  rationale: string;
}

export interface SceneVariant {
  id: string;
  title: string;
  pitch: string;
  framing: string;
  light: string;
  mood: string;
  difficulty: 'approachable' | 'a stretch' | 'ambitious';
  thumbnail_svg: string;
}

export interface ValuePlan {
  thumbnails: {
    three_values: string;
    five_values: string;
    light_source_structure: string;
  };
  eye_focus_note: string;
}

export interface PaletteSwatch {
  hex: string;
  pigment_name: string;
  role: string;
  depth_plane: 'background' | 'midground' | 'foreground';
}

export interface TextureNote {
  material: string;
  instruction: string;
}

export interface WatchPoint {
  stage: string;
  risk: string;
  prevention: string;
}

export interface SceneBrief {
  id: string;
  variant: SceneVariant;
  medium: Medium;
  composition_guide: CompositionGuide;
  value_plan: ValuePlan;
  palette: {
    swatches: PaletteSwatch[];
    rationale: string;
  };
  technique_notes: string[];
  texture_notes: TextureNote[];
  watch_points: WatchPoint[];
  createdAt: string;
  stuck_exchanges?: StuckExchange[];
}

export interface StuckExchange {
  id: string;
  timestamp: string;
  problem: string;
  category?: string;
  wipImage?: string;
  diagnosis: string;
  recoverable: 'yes' | 'partly' | 'no';
  recovery: string[];
  next_time: string;
  keep_going: string;
}

export interface ScenePreset {
  id: string;
  title: string;
  category: string;
  prompt: string;
  iconName: string;
  description: string;
}

// Legacy compatibility shim
export interface DrawingTutorial {
  id: string;
  title: string;
  subject: string;
  steps: DrawingStep[];
  createdAt: string;
  sourceType: 'text' | 'image' | 'preset';
  originalImage?: string;
}
