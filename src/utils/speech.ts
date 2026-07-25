// Web Speech API wrapper for Kid Art Teacher voice narration

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentUtteranceId = 0;
let cachedVoice: SpeechSynthesisVoice | null = null;

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Female') ||
              v.name.includes('Samantha') ||
              v.name.includes('Karen'))
        ) || voices.find((v) => v.lang.startsWith('en')) || null;
    }
  };

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

export function speakInstruction(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  // Increment utterance ID so previous canceled utterances' callbacks are ignored
  currentUtteranceId++;
  const thisUtteranceId = currentUtteranceId;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cleanText = text.replace(/<[^>]*>?/gm, ''); // Strip any HTML tags
  const utterance = new SpeechSynthesisUtterance(cleanText);

  const voices = window.speechSynthesis.getVoices();
  if (!cachedVoice && voices.length > 0) {
    cachedVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Female') ||
            v.name.includes('Samantha') ||
            v.name.includes('Karen'))
      ) || voices.find((v) => v.lang.startsWith('en')) || null;
  }

  if (cachedVoice) {
    utterance.voice = cachedVoice;
  }

  // Pitch and rate adjusted for enthusiastic, warm teacher tone
  utterance.pitch = 1.25;
  utterance.rate = 0.95;

  utterance.onend = () => {
    // Only invoke callback if this utterance was not canceled by a subsequent speech call
    if (thisUtteranceId === currentUtteranceId) {
      if (onEnd) {
        onEnd();
      }
    }
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    currentUtteranceId++; // Invalidate current utterance onEnd
    window.speechSynthesis.cancel();
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
