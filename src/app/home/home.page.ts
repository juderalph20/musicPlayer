import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AudioService } from '../services/audio.service';
import { Storage } from '@ionic/storage-angular';
import {
  trigger,
  transition,
  style,
  animate
} from '@angular/animations';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule],
  animations: [
    trigger('popupAnimation', [
      transition(':enter', [
        style({ transform: 'scale(0.8)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'scale(0.8)', opacity: 0 }))
      ])
    ])
  ]
})
export class HomePage {
  searchQuery = '';
  playlists: { name: string, tracks: any[] }[] = [];
  selectedPlaylistIndex: number = 0;
  currentTrack: string = '';
  isPlaying: boolean = false;

  currentTrackObj: any = null;
  currentTime = 0;
  duration = 0;
  progressInterval: any = null;

  showFileInput = true;
  newPlaylistName = '';

  showSearch = false;
  showAddPlaylist = false;
  showPlaylist = false;

  viewingPlaylist: boolean = false;

  topTracks: any[] = [];
  topArtists: any[] = [];
  topAlbums: any[] = [];

  constructor(
    private http: HttpClient,
    private audioService: AudioService,
    private storage: Storage
  ) {
    this.initStorage();
  }

  async initStorage() {
    await this.storage.create();
    await this.loadPlaylists();
    this.fetchDeezerCharts();
  }

  fetchDeezerCharts() {
    this.http.get<any>('https://deezerdevs-deezer.p.rapidapi.com/chart', {
      headers: {
        'X-RapidAPI-Key': '7a46b282c9msh6b331c5ec39f921p180138jsnb50529feaa59',
        'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com'
      }
    }).subscribe(res => {
      this.topTracks = res.tracks.data;
      this.topArtists = res.artists.data;
      this.topAlbums = res.albums.data;
    });
  }

  async savePlaylists() {
    await this.storage.set('playlists', this.playlists);
  }

  async loadPlaylists() {
    const saved = await this.storage.get('playlists');
    if (saved && saved.length) {
      this.playlists = saved;
    } else {
      this.playlists = [{ name: 'My Playlist', tracks: [] }];
    }
    this.selectedPlaylistIndex = 0;
  }

  get tracks() {
    return this.playlists[this.selectedPlaylistIndex]?.tracks || [];
  }

  addPlaylist() {
    if (!this.newPlaylistName.trim()) return;
    this.playlists.push({ name: this.newPlaylistName.trim(), tracks: [] });
    this.selectedPlaylistIndex = this.playlists.length - 1;
    this.newPlaylistName = '';
    this.savePlaylists();
    this.viewingPlaylist = true;
  }

  selectPlaylist(index: number) {
    this.selectedPlaylistIndex = index;
    this.viewingPlaylist = true;
  }

  deletePlaylist(index: number) {
    if (this.playlists.length <= 1) return;
    this.playlists.splice(index, 1);
    if (this.selectedPlaylistIndex >= this.playlists.length) {
      this.selectedPlaylistIndex = this.playlists.length - 1;
    }
    this.savePlaylists();
  }

  searchDeezer() {
    this.showFileInput = false;
    if (!this.searchQuery.trim()) {
      this.playlists[this.selectedPlaylistIndex].tracks = [];
      this.savePlaylists();
      return;
    }
    this.http.get<any>(
      `https://deezerdevs-deezer.p.rapidapi.com/search?q=${encodeURIComponent(this.searchQuery)}`,
      {
        headers: {
          'X-RapidAPI-Key': '7a46b282c9msh6b331c5ec39f921p180138jsnb50529feaa59',
          'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com'
        }
      }
    ).subscribe(
      res => {
        this.playlists[this.selectedPlaylistIndex].tracks = res.data;
        this.savePlaylists();
      },
      err => {
        this.playlists[this.selectedPlaylistIndex].tracks = [];
        alert('Failed to fetch tracks');
        this.savePlaylists();
      }
    );
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const newTracks = Array.from(input.files).map(file => ({
        title: file.name,
        artist: { name: 'Local File' },
        preview: URL.createObjectURL(file),
        picture: 'assets/default-cover.png'
      }));
      this.playlists[this.selectedPlaylistIndex].tracks = [
        ...this.playlists[this.selectedPlaylistIndex].tracks,
        ...newTracks
      ];
      await this.savePlaylists();
      if (newTracks.length > 0) {
        this.playTrack(newTracks[0].preview, newTracks[0]);
      }
    }
  }

  playTrack(url: string, trackObj?: any) {
    this.audioService.playAudio(url);
    this.currentTrack = url;
    this.isPlaying = true;
    this.currentTrackObj = trackObj || this.tracks.find(t => t.preview === url);
    this.startProgressTracking();
  }

  pauseTrack() {
    this.audioService.pauseAudio();
    this.isPlaying = false;
    this.stopProgressTracking();
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pauseTrack();
    } else {
      this.playTrack(this.currentTrack, this.currentTrackObj);
    }
  }

  startProgressTracking() {
    this.stopProgressTracking();
    this.progressInterval = setInterval(() => {
      this.currentTime = this.audioService.getCurrentTime ? this.audioService.getCurrentTime() : 0;
      this.duration = this.audioService.getDuration ? this.audioService.getDuration() : 0;
    }, 1000);
  }

  stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  seekTo(value: number) {
    if (this.audioService.seekTo) {
      this.audioService.seekTo(value);
      this.currentTime = value;
    }
  }

  getCurrentTrackTitle(): string {
    const track = this.tracks.find(t => t.preview === this.currentTrack);
    return track ? `${track.title} - ${track.artist.name}` : '';
  }

  nextTrack() {
    if (!this.tracks.length) return;
    const idx = this.tracks.findIndex(t => t.preview === this.currentTrack);
    const nextIdx = (idx + 1) % this.tracks.length;
    const nextTrack = this.tracks[nextIdx];
    this.playTrack(nextTrack.preview, nextTrack);
  }

  prevTrack() {
    if (!this.tracks.length) return;
    const idx = this.tracks.findIndex(t => t.preview === this.currentTrack);
    const prevIdx = (idx - 1 + this.tracks.length) % this.tracks.length;
    const prevTrack = this.tracks[prevIdx];
    this.playTrack(prevTrack.preview, prevTrack);
  }

  onSeek(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    this.seekTo(value);
  }

  goHome() {
    this.viewingPlaylist = false;
    this.showAddPlaylist = false;
    this.showPlaylist = false;
    this.fetchDeezerCharts();
  }
}
