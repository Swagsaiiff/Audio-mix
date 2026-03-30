export interface ReverbSettings {
  wet: number;
  roomSize: number;
  decay: number;
  delay: number;
}

export interface EchoSettings {
  feedback: number;
  delayTime: number;
  wet: number;
}

export interface EQSettings {
  bass: number;
  mid: number;
  treble: number;
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoaded: boolean;
  fileName: string;
}
