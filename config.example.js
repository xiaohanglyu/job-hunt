// Copy this file to config.js and fill in your keys.
// config.js is in .gitignore — safe to store keys here.
//
// Groq: free at https://console.groq.com
// Azure TTS: free 500k chars/month at https://azure.microsoft.com/en-us/products/ai-services/text-to-speech

const CONFIG = {
  groqKey: 'gsk_your_key_here',

  // TTS provider: 'azure' | 'webspeech'
  ttsProvider: 'azure',

  // Azure TTS (used when ttsProvider = 'azure')
  azureKey: 'your_azure_key_here',
  azureRegion: 'canadacentral',
  azureVoice: 'en-CA-LiamNeural', // or 'en-CA-ClaraNeural'
};
