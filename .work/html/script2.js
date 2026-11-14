/* ===========================================================
   Companion config: edit THIS file to rename or restyle the mascot.
   Change `name` to any key of `companions` (Nova, Pico, Luna, Orbi)
   or add your own entry. Users can also switch in Settings.
   =========================================================== */
window.NOVA_CONFIG = {
  name: 'Nova',                 // default companion name
  userTitle: 'Commander',       // what the companion calls the user by default
  companions: {
    //        body colour   trim colour   extra shape: 'none' | 'ears' | 'ring'
    Nova: { body: '#e9f0fa', trim: '#6aa9ff', extra: 'none', blurb: 'small round astronaut-helper robot' },
    Pico: { body: '#ffeccf', trim: '#ff9f43', extra: 'ears', blurb: 'tiny round helper with ears' },
    Luna: { body: '#ece8ff', trim: '#a78bfa', extra: 'none', blurb: 'calm moon-pale helper' },
    Orbi: { body: '#dff7f1', trim: '#2fd0a4', extra: 'ring', blurb: 'helper with an orbit ring' }
  },
  voice: { rate: 1.0, pitch: 1.12, lang: 'en-US' },   // text-to-speech
  sttLang: 'en-US',                                    // speech-to-text language
  glow: { nominal: '#29d3ff', elevated: '#ffb224', emergency: '#ff5d4d' },
  shelterFactor: 0.2,           // ASSUMED dose-rate reduction when sheltering (illustrative, not measured)
  sleepRepay: 1.0,              // ASSUMED: 1 h of extra sleep repays 1 h of sleep debt
  defaultEndpoint: 'http://localhost:11434/v1/chat/completions',  // Enhanced mode default (Ollama)
  defaultModel: 'llama3.2'
};
