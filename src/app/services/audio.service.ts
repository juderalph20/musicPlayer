import { Injectable } from '@angular/core';
import { Howl } from 'howler';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private sound: Howl | null = null;

  playAudio(url: string) {
    if (this.sound) {
      this.sound.unload();
    }

    this.sound = new Howl({
      src: [url],
      html5: true
    });

    this.sound.play();
  }

  pauseAudio() {
    this.sound?.pause();
  }

  stopAudio() {
    this.sound?.stop();
  }

  getCurrentTime(): number {
    return this.sound ? this.sound.seek() as number : 0;
  }

  getDuration(): number {
    return this.sound ? this.sound.duration() : 0;
  }

  seekTo(seconds: number) {
    if (this.sound) {
      this.sound.seek(seconds);
    }
  }
}