/**
 * Web Speech API recognition types. TypeScript's lib.dom ships the result-list types
 * but not the recognizer itself, so we declare self-named shapes (never redeclaring lib
 * names) and add the optional vendor constructors to Window.
 */
export {};

declare global {
  interface SousRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SousRecognitionErrorEvent extends Event {
    /** "no-speech" | "aborted" | "audio-capture" | "network" | "not-allowed" | "service-not-allowed" | ... */
    readonly error: string;
    readonly message: string;
  }

  interface SousRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onstart: ((this: SousRecognition, ev: Event) => void) | null;
    onresult: ((this: SousRecognition, ev: SousRecognitionEvent) => void) | null;
    onerror: ((this: SousRecognition, ev: SousRecognitionErrorEvent) => void) | null;
    onend: ((this: SousRecognition, ev: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface SousRecognitionConstructor {
    new (): SousRecognition;
  }

  interface Window {
    SpeechRecognition?: SousRecognitionConstructor;
    webkitSpeechRecognition?: SousRecognitionConstructor;
  }
}
