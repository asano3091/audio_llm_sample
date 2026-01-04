
export interface ExtractionResult {
  transcription: string;
  name: string;
  phoneNumber: string;
  gender: 'male' | 'female' | 'unknown';
  confidence: number;
  summary: string;
}

export interface AppState {
  file: File | null;
  isProcessing: boolean;
  result: ExtractionResult | null;
  error: string | null;
  csvHeaderTemplate: string;
  apiKey: string;
}
