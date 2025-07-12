import { TranscodeHWAccel, TranscodeTarget, VideoCodec } from 'src/enum';
import { ThumbnailConfig } from 'src/utils/media';
import { VideoStreamInfo, VideoFormat } from 'src/types';

describe('ThumbnailConfig', () => {
  const mockVideoStream: VideoStreamInfo = {
    index: 0,
    height: 1080,
    width: 1920,
    rotation: 0,
    codecName: 'h264',
    frameCount: 100,
    isHDR: false,
    bitrate: 1000000,
    pixelFormat: 'yuv420p',
  };

  const mockConfig = {
    crf: 23,
    threads: 0,
    preset: 'ultrafast',
    targetVideoCodec: VideoCodec.H264,
    acceptedVideoCodecs: [VideoCodec.H264],
    targetAudioCodec: 'aac' as any,
    acceptedAudioCodecs: ['aac'] as any,
    acceptedContainers: ['mov'] as any,
    targetResolution: '720',
    maxBitrate: '0',
    bframes: -1,
    refs: 0,
    gopSize: 0,
    temporalAQ: false,
    cqMode: 'auto' as any,
    twoPass: false,
    preferredHwDevice: 'auto',
    transcode: 'required' as any,
    accel: TranscodeHWAccel.DISABLED,
    accelDecode: false,
    tonemap: 'hable' as any,
    customVideoPreview: false,
    previewTimeOffset: 0.1,
    previewBufferSeconds: 20,
    previewScenes: 10,
    previewSceneLength: 2,
  };

  describe('generateVideoPreviewClips', () => {
    it('should return empty array when custom video preview is disabled', () => {
      const config = ThumbnailConfig.create(mockConfig) as ThumbnailConfig;

      const clips = config.generateVideoPreviewClips(100);

      expect(clips).toEqual([]);
    });

    it('should generate clips with time shift logic when enabled', () => {
      const configWithPreview = { ...mockConfig, customVideoPreview: true };
      const config = ThumbnailConfig.create(configWithPreview) as ThumbnailConfig;

      const clips = config.generateVideoPreviewClips(100); // 100 second video

      expect(clips).toHaveLength(10); // default previewScenes
      expect(clips[0].startTime).toBe(10); // 10% of 100 seconds
      expect(clips[0].length).toBe(2); // default previewSceneLength

      // Check that clips are spaced correctly
      const expectedInterval = Math.floor((100 - 20 - 10) / 9); // (duration - buffer - offset) / (scenes - 1)
      expect(clips[1].startTime).toBe(10 + expectedInterval);
    });

    it('should respect buffer seconds', () => {
      const configWithPreview = {
        ...mockConfig,
        customVideoPreview: true,
        previewBufferSeconds: 30
      };
      const config = ThumbnailConfig.create(configWithPreview) as ThumbnailConfig;

      const clips = config.generateVideoPreviewClips(100);

      // No clip should start after (duration - buffer - sceneLength)
      const maxStartTime = 100 - 30 - 2;
      clips.forEach((clip: { startTime: number; length: number }) => {
        expect(clip.startTime).toBeLessThanOrEqual(maxStartTime);
      });
    });

    it('should handle short videos correctly', () => {
      const configWithPreview = {
        ...mockConfig,
        customVideoPreview: true,
        previewScenes: 5,
        previewSceneLength: 1,
        previewBufferSeconds: 5
      };
      const config = ThumbnailConfig.create(configWithPreview) as ThumbnailConfig;

      const clips = config.generateVideoPreviewClips(15); // 15 second video

      expect(clips.length).toBeLessThanOrEqual(5);
      clips.forEach((clip: { startTime: number; length: number }) => {
        expect(clip.startTime).toBeGreaterThanOrEqual(0);
        expect(clip.startTime + clip.length).toBeLessThanOrEqual(15);
        expect(clip.length).toBe(1);
      });
    });

    it('should use custom scene configuration', () => {
      const configWithPreview = {
        ...mockConfig,
        customVideoPreview: true,
        previewScenes: 5,
        previewSceneLength: 3,
        previewTimeOffset: 0.2
      };
      const config = ThumbnailConfig.create(configWithPreview) as ThumbnailConfig;

      const clips = config.generateVideoPreviewClips(100);

      expect(clips).toHaveLength(5);
      expect(clips[0].startTime).toBe(20); // 20% of 100 seconds
      clips.forEach((clip: { startTime: number; length: number }) => {
        expect(clip.length).toBe(3);
      });
    });
  });

  describe('getFilterOptions', () => {
    it('should use scene detection when custom thumbnail time is disabled', () => {
      const config = ThumbnailConfig.create(mockConfig);
      
      const filters = config.getFilterOptions(mockVideoStream);
      
      expect(filters).toContain('fps=12:eof_action=pass:round=down');
      expect(filters).toContain('thumbnail=12');
      expect(filters).toContain('select=gt(scene\\,0.1)-eq(prev_selected_n\\,n)+isnan(prev_selected_n)+gt(n\\,20)');
      expect(filters).toContain('trim=end_frame=2');
      expect(filters).toContain('reverse');
    });

    it('should use simple thumbnail when custom thumbnail time is enabled', () => {
      const configWithCustomTime = { ...mockConfig, customThumbnailTime: true };
      const config = ThumbnailConfig.create(configWithCustomTime);
      
      const filters = config.getFilterOptions(mockVideoStream);
      
      expect(filters).toContain('thumbnail');
      expect(filters).not.toContain('fps=12:eof_action=pass:round=down');
      expect(filters).not.toContain('select=gt(scene');
      expect(filters).not.toContain('trim=end_frame=2');
      expect(filters).not.toContain('reverse');
    });
  });
});
