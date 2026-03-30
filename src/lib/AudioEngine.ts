import { ReverbSettings, EchoSettings, EQSettings } from '../types';

export class AudioEngine {
  private context: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  
  // Nodes
  private gainNode: GainNode;
  private eqBass: BiquadFilterNode;
  private eqMid: BiquadFilterNode;
  private eqTreble: BiquadFilterNode;
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayWet: GainNode;
  private reverbNode: ConvolverNode;
  private reverbWet: GainNode;
  private dryNode: GainNode;
  private masterGain: GainNode;
  private analyser: AnalyserNode;

  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Initialize nodes
    this.gainNode = this.context.createGain();
    this.masterGain = this.context.createGain();
    
    // Analyser
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    
    // EQ
    this.eqBass = this.context.createBiquadFilter();
    this.eqBass.type = 'lowshelf';
    this.eqBass.frequency.value = 200;

    this.eqMid = this.context.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 1;

    this.eqTreble = this.context.createBiquadFilter();
    this.eqTreble.type = 'highshelf';
    this.eqTreble.frequency.value = 3000;

    // Delay/Echo
    this.delayNode = this.context.createDelay(2.0);
    this.delayFeedback = this.context.createGain();
    this.delayWet = this.context.createGain();
    
    // Reverb (Simplified algorithmic reverb using a generated impulse)
    this.reverbNode = this.context.createConvolver();
    this.reverbWet = this.context.createGain();
    this.dryNode = this.context.createGain();

    // Routing
    // Source -> EQ -> Split (Dry / Delay / Reverb) -> Master -> Destination
    this.gainNode.connect(this.eqBass);
    this.eqBass.connect(this.eqMid);
    this.eqMid.connect(this.eqTreble);

    // Dry path
    this.eqTreble.connect(this.dryNode);
    this.dryNode.connect(this.masterGain);

    // Delay path
    this.eqTreble.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayWet);
    this.delayWet.connect(this.masterGain);

    // Reverb path
    this.eqTreble.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbWet);
    this.reverbWet.connect(this.masterGain);

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    // Default settings
    this.updateReverb({ wet: 0.3, roomSize: 0.5, decay: 1.5, delay: 0.02 });
    this.updateEcho({ wet: 0, feedback: 0.4, delayTime: 0.3 });
    this.updateEQ({ bass: 0, mid: 0, treble: 0 });
  }

  private async resumeContext() {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  async loadAudio(url: string): Promise<AudioBuffer> {
    await this.resumeContext();
    
    // Detect YouTube URLs and use the specialized extraction endpoint
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    const endpoint = isYouTube ? "/api/youtube" : "/api/proxy";
    const proxyUrl = `${endpoint}?url=${encodeURIComponent(url)}`;
    
    let response;
    try {
      response = await fetch(proxyUrl);
    } catch (e) {
      throw new Error(`Network error: Could not reach the proxy server.`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to load audio from URL: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error("The retrieved audio file is empty.");
    }

    try {
      this.buffer = await this.context.decodeAudioData(arrayBuffer);
      return this.buffer;
    } catch (e) {
      console.error("Decoding error:", e);
      throw new Error("Unable to decode audio data. The file format might be unsupported or the file is corrupted.");
    }
  }

  async loadFile(file: File): Promise<AudioBuffer> {
    await this.resumeContext();
    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error("The selected file is empty.");
    }

    try {
      this.buffer = await this.context.decodeAudioData(arrayBuffer);
      return this.buffer;
    } catch (e) {
      console.error("Decoding error:", e);
      throw new Error("Unable to decode audio data. The file format might be unsupported or the file is corrupted.");
    }
  }

  async play(offset: number = 0) {
    if (!this.buffer) return;
    await this.resumeContext();
    this.stop();
    
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.gainNode);
    
    this.startTime = this.context.currentTime - offset;
    this.source.start(0, offset);
    this.isPlaying = true;
  }

  stop() {
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
  }

  pause() {
    if (this.isPlaying) {
      this.pauseTime = this.context.currentTime - this.startTime;
      this.stop();
    }
  }

  async resume() {
    if (!this.isPlaying && this.buffer) {
      await this.play(this.pauseTime);
    }
  }

  async seek(time: number) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.pauseTime = time;
    if (wasPlaying) {
      await this.play(time);
    }
  }

  updateVolume(value: number) {
    this.masterGain.gain.setTargetAtTime(value, this.context.currentTime, 0.02);
  }

  updateEQ(settings: EQSettings) {
    this.eqBass.gain.setTargetAtTime(settings.bass, this.context.currentTime, 0.02);
    this.eqMid.gain.setTargetAtTime(settings.mid, this.context.currentTime, 0.02);
    this.eqTreble.gain.setTargetAtTime(settings.treble, this.context.currentTime, 0.02);
  }

  updateEcho(settings: EchoSettings) {
    this.delayNode.delayTime.setTargetAtTime(settings.delayTime, this.context.currentTime, 0.02);
    this.delayFeedback.gain.setTargetAtTime(settings.feedback, this.context.currentTime, 0.02);
    this.delayWet.gain.setTargetAtTime(settings.wet, this.context.currentTime, 0.02);
  }

  updateReverb(settings: ReverbSettings) {
    this.reverbWet.gain.setTargetAtTime(settings.wet, this.context.currentTime, 0.02);
    this.dryNode.gain.setTargetAtTime(1 - settings.wet, this.context.currentTime, 0.02);
    
    // Generate new impulse response if room size or decay changed significantly
    // For a real-time app, we might want to pre-generate or use a more efficient method
    // but for this demo, we'll generate a simple noise-based impulse.
    this.reverbNode.buffer = this.generateImpulseResponse(settings.decay, settings.roomSize);
  }

  private generateImpulseResponse(duration: number, decay: number): AudioBuffer {
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponentially decaying white noise
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay * 10);
      }
    }
    return impulse;
  }

  getCurrentTime(): number {
    if (this.isPlaying) {
      return this.context.currentTime - this.startTime;
    }
    return this.pauseTime;
  }

  getDuration(): number {
    return this.buffer ? this.buffer.duration : 0;
  }

  getContext() {
    return this.context;
  }

  getAnalyser() {
    return this.analyser;
  }

  getBuffer() {
    return this.buffer;
  }

  async export(settings: { reverb: ReverbSettings, echo: EchoSettings, eq: EQSettings }): Promise<Blob> {
    if (!this.buffer) throw new Error("No audio loaded");
    await this.resumeContext();

    const offlineCtx = new OfflineAudioContext(
      this.buffer.numberOfChannels,
      this.buffer.length,
      this.buffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = this.buffer;

    // Recreate effect chain in offline context
    const eqBass = offlineCtx.createBiquadFilter();
    eqBass.type = 'lowshelf';
    eqBass.frequency.value = 200;
    eqBass.gain.value = settings.eq.bass;

    const eqMid = offlineCtx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1000;
    eqMid.gain.value = settings.eq.mid;

    const eqTreble = offlineCtx.createBiquadFilter();
    eqTreble.type = 'highshelf';
    eqTreble.frequency.value = 3000;
    eqTreble.gain.value = settings.eq.treble;

    const delay = offlineCtx.createDelay(2.0);
    delay.delayTime.value = settings.echo.delayTime;
    const feedback = offlineCtx.createGain();
    feedback.gain.value = settings.echo.feedback;
    const delayWet = offlineCtx.createGain();
    delayWet.gain.value = settings.echo.wet;

    const reverb = offlineCtx.createConvolver();
    reverb.buffer = this.generateImpulseResponse(settings.reverb.decay, settings.reverb.roomSize);
    const reverbWet = offlineCtx.createGain();
    reverbWet.gain.value = settings.reverb.wet;

    const dry = offlineCtx.createGain();
    dry.gain.value = 1 - settings.reverb.wet;

    const master = offlineCtx.createGain();

    // Connect
    source.connect(eqBass);
    eqBass.connect(eqMid);
    eqMid.connect(eqTreble);

    eqTreble.connect(dry);
    dry.connect(master);

    eqTreble.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(master);

    eqTreble.connect(reverb);
    reverb.connect(reverbWet);
    reverbWet.connect(master);

    master.connect(offlineCtx.destination);

    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();

    // Convert AudioBuffer to WAV
    return this.bufferToWav(renderedBuffer);
  }

  private bufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++)
      channels.push(buffer.getChannelData(i));

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7fff) | 0; // scale to 16-bit signed int
        view.setInt16(pos, sample, true); // write 16-bit sample
        pos += 2;
      }
      offset++; // next sample chunk
    }

    return new Blob([bufferArr], { type: "audio/wav" });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  }
}
