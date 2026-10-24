/** 16-bit PCM WAV file from one Float32Array per channel (same length). */
export function encodeWav(channels: readonly Float32Array[], sampleRate: number): ArrayBuffer {
  const channelCount = channels.length;
  const frames = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const dataSize = frames * channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true); // byte rate
  view.setUint16(32, channelCount * bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[frame] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }
  return buffer;
}

/**
 * Drops the silence at the end (after a process has finished), keeping `tail`
 * seconds after the last sound so notes can ring out.
 */
export function trimTrailingSilence(
  channels: readonly Float32Array[],
  sampleRate: number,
  { threshold = 1e-4, tail = 1 } = {},
): Float32Array[] {
  const frames = channels[0]?.length ?? 0;
  let last = -1;
  for (const channel of channels) {
    for (let i = frames - 1; i > last; i--) {
      if (Math.abs(channel[i]!) > threshold) {
        last = i;
        break;
      }
    }
  }
  const end = Math.min(frames, last + 1 + Math.round(tail * sampleRate));
  return channels.map((channel) => channel.slice(0, Math.max(0, end)));
}
