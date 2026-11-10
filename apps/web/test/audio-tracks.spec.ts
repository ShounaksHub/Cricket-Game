import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SOUNDTRACK_PLAYLIST } from '../context/AudioContext';

describe('Soundtrack Audio Files Integrity', () => {
  it('has all 8 soundtrack playlist files existing in public/audio and non-empty', () => {
    expect(SOUNDTRACK_PLAYLIST).toHaveLength(8);

    const publicAudioDir = path.resolve(__dirname, '../public/audio');

    for (const track of SOUNDTRACK_PLAYLIST) {
      const fileName = path.basename(track.src);
      const filePath = path.join(publicAudioDir, fileName);

      expect(fs.existsSync(filePath), `Audio file ${fileName} must exist in public/audio`).toBe(true);

      const stat = fs.statSync(filePath);
      expect(stat.size, `Audio file ${fileName} must be a valid non-empty MP3`).toBeGreaterThan(100000); // > 100KB
    }
  });

  it('includes the 4 verified IPL team anthem tracks with proper paths', () => {
    const iplTrackIds = ['csk-anthem', 'rcb-anthem', 'mi-anthem', 'kkr-anthem'];

    for (const id of iplTrackIds) {
      const track = SOUNDTRACK_PLAYLIST.find((t) => t.id === id);
      expect(track, `Track ${id} must be defined in playlist`).toBeDefined();
      expect(track?.src).toBe(`/audio/${id}.mp3`);
    }
  });
});
