// Web Speech API wrapper for Kid Art Teacher voice narration

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakInstruction(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cleanText = text.replace(/<[^>]*>?/gm, ''); // Strip any HTML tags
  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Find a friendly English voice if available
  const voices = window.speechSynthesis.getVoices();
  const friendlyVoice = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Karen'))
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (friendlyVoice) {
    utterance.voice = friendlyVoice;
  }

  // Pitch and rate adjusted for enthusiastic, warm teacher tone
  utterance.pitch = 1.25;
  utterance.rate = 0.95;

  if (onEnd) {
    utterance.onend = onEnd;
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
