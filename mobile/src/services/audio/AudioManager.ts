/**
 * AudioManager — global singleton managing three independent audio channels.
 *
 * Channels:
 *   1. Music  — background ambient loops, crossfades between zones
 *   2. Voice  — Zoey's ElevenLabs speech (auto-ducks music while playing)
 *   3. SFX    — sound effects with a pool of 4 concurrent instances
 *
 * Rules:
 *   - Voice and SFX never interrupt each other
 *   - Music volume ducks to 20% when Voice is active, fades back when done
 *   - SFX pool recycles the oldest instance when all 4 are busy
 *
 * Usage:
 *   import { audioManager } from "@/services/audio/AudioManager";
 *   await audioManager.playVoice(ttsUrl);
 *   await audioManager.playSFX(require("../../assets/sounds/correct.mp3"));
 */
import { Audio, type AVPlaybackSource } from "expo-av";

const MUSIC_VOLUME = 0.4;
const MUSIC_DUCK_VOLUME = 0.1;
const VOICE_VOLUME = 1.0;
const SFX_VOLUME = 0.8;
const SFX_POOL_SIZE = 4;
const CROSSFADE_MS = 800;

class AudioManager {
  private musicSound: Audio.Sound | null = null;
  private voiceSound: Audio.Sound | null = null;
  private sfxPool: (Audio.Sound | null)[] = new Array(SFX_POOL_SIZE).fill(null);
  private sfxIndex = 0;
  private musicVolume = MUSIC_VOLUME;
  private initialized = false;

  // ── Init ────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.initialized) return;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
    this.initialized = true;
  }

  // ── Music channel ───────────────────────────────────────────────────────

  async playMusic(source: AVPlaybackSource, loop = true): Promise<void> {
    await this.init();

    // Crossfade: fade out old, then start new
    if (this.musicSound) {
      await this.fadeVolume(this.musicSound, 0, CROSSFADE_MS);
      await this.musicSound.unloadAsync().catch(() => {});
      this.musicSound = null;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
        isLooping: loop,
        volume: 0,
      });
      this.musicSound = sound;
      await this.fadeVolume(sound, this.musicVolume, CROSSFADE_MS);
    } catch {
      // Music is non-critical
    }
  }

  async stopMusic(): Promise<void> {
    if (!this.musicSound) return;
    await this.fadeVolume(this.musicSound, 0, CROSSFADE_MS);
    await this.musicSound.unloadAsync().catch(() => {});
    this.musicSound = null;
  }

  private async duckMusic(): Promise<void> {
    if (!this.musicSound) return;
    await this.fadeVolume(this.musicSound, MUSIC_DUCK_VOLUME, 300);
  }

  private async unduckMusic(): Promise<void> {
    if (!this.musicSound) return;
    await this.fadeVolume(this.musicSound, this.musicVolume, 500);
  }

  // ── Voice channel (Zoey TTS) ──────────────────────────────────────────

  async playVoice(uri: string): Promise<void> {
    await this.init();
    await this.stopVoice();
    await this.duckMusic();

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: VOICE_VOLUME },
      );
      this.voiceSound = sound;

      return new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            this.voiceSound = null;
            this.unduckMusic();
            resolve();
          }
        });
      });
    } catch {
      this.unduckMusic();
    }
  }

  async stopVoice(): Promise<void> {
    if (!this.voiceSound) return;
    await this.voiceSound.stopAsync().catch(() => {});
    await this.voiceSound.unloadAsync().catch(() => {});
    this.voiceSound = null;
  }

  get isVoicePlaying(): boolean {
    return this.voiceSound !== null;
  }

  // ── SFX channel (pooled) ──────────────────────────────────────────────

  async playSFX(source: AVPlaybackSource): Promise<void> {
    await this.init();

    // Recycle oldest slot
    const idx = this.sfxIndex % SFX_POOL_SIZE;
    this.sfxIndex += 1;

    const existing = this.sfxPool[idx];
    if (existing) {
      existing.unloadAsync().catch(() => {});
    }

    try {
      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
        volume: SFX_VOLUME,
      });
      this.sfxPool[idx] = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (this.sfxPool[idx] === sound) {
            this.sfxPool[idx] = null;
          }
        }
      });
    } catch {
      // SFX failure is non-critical
    }
  }

  async stopAllSFX(): Promise<void> {
    await Promise.all(
      this.sfxPool.map(async (s, i) => {
        if (s) {
          await s.stopAsync().catch(() => {});
          await s.unloadAsync().catch(() => {});
          this.sfxPool[i] = null;
        }
      }),
    );
  }

  // ── Volume control ────────────────────────────────────────────────────

  setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this.musicSound?.setVolumeAsync(this.musicVolume).catch(() => {});
  }

  // ── Cleanup ───────────────────────────────────────────────────────────

  async dispose(): Promise<void> {
    await this.stopMusic();
    await this.stopVoice();
    await this.stopAllSFX();
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async fadeVolume(
    sound: Audio.Sound,
    targetVolume: number,
    durationMs: number,
  ): Promise<void> {
    const steps = 10;
    const stepMs = durationMs / steps;

    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      const startVol = status.volume ?? 0;
      const delta = (targetVolume - startVol) / steps;

      for (let i = 1; i <= steps; i++) {
        await new Promise((r) => setTimeout(r, stepMs));
        const vol = Math.max(0, Math.min(1, startVol + delta * i));
        await sound.setVolumeAsync(vol).catch(() => {});
      }
    } catch {
      // Best-effort fade
    }
  }
}

/** Global singleton — import this, don't construct new instances */
export const audioManager = new AudioManager();
