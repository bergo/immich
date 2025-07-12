# Custom Video Preview Generation

This feature implements custom video preview generation for videos, inspired by the video-overview-cli project's time shift logic.

## Overview

Instead of using scene detection to generate a single thumbnail frame, this feature creates a **video preview** that concatenates multiple short clips from different time positions in the original video. This provides a dynamic preview that shows highlights from the entire video, similar to movie trailers or video summaries.

## Configuration

The feature is controlled by five new configuration options in the FFmpeg settings:

### `customVideoPreview` (boolean)
- **Default**: `false`
- **Description**: Enables custom video preview generation instead of single frame thumbnails
- When `false`: Uses the default scene detection for single frame thumbnails
- When `true`: Generates a video preview with multiple clips from different time positions

### `previewTimeOffset` (number, 0-1)
- **Default**: `0.1` (10%)
- **Description**: Percentage of video duration where the first clip starts
- **Range**: 0.0 to 1.0
- **Example**:
  - `0.1` = First clip starts at 10% of video duration
  - `0.2` = First clip starts at 20% of video duration

### `previewBufferSeconds` (integer)
- **Default**: `20`
- **Description**: Buffer time in seconds from the end of the video to prevent clips too close to the end
- **Purpose**: Ensures clips don't include credits or fade-out sections

### `previewScenes` (integer, 1-20)
- **Default**: `10`
- **Description**: Number of clips to extract from the video
- **Range**: 1 to 20 clips

### `previewSceneLength` (integer, 1-10)
- **Default**: `2`
- **Description**: Length of each clip in seconds
- **Range**: 1 to 10 seconds per clip

## Time Calculation Logic

The video preview clips are extracted using the following algorithm (inspired by video-overview-cli):

```
availableDuration = videoDuration - previewBufferSeconds
interval = (availableDuration - (previewTimeOffset * videoDuration)) / (previewScenes - 1)

for each clip i (0 to previewScenes-1):
    startTime = previewTimeOffset * videoDuration + (i * interval)
    clipLength = previewSceneLength
```

### Examples

**Example 1: 100-second video with default settings**
- `previewTimeOffset = 0.1` (10%)
- `previewBufferSeconds = 20`
- `previewScenes = 10`
- `previewSceneLength = 2`
- Available duration: `100 - 20 = 80 seconds`
- First clip starts at: `0.1 * 100 = 10 seconds`
- Interval between clips: `(80 - 10) / 9 = ~7.8 seconds`
- Clips start at: 10s, 17.8s, 25.6s, 33.4s, 41.2s, 49s, 56.8s, 64.6s, 72.4s, 80.2s
- Each clip is 2 seconds long

**Example 2: 60-second video with custom settings**
- `previewTimeOffset = 0.2` (20%)
- `previewBufferSeconds = 10`
- `previewScenes = 5`
- `previewSceneLength = 3`
- Available duration: `60 - 10 = 50 seconds`
- First clip starts at: `0.2 * 60 = 12 seconds`
- Interval between clips: `(50 - 12) / 4 = 9.5 seconds`
- Clips start at: 12s, 21.5s, 31s, 40.5s, 50s
- Each clip is 3 seconds long

## Benefits

1. **Dynamic Previews**: Shows multiple scenes from the video instead of a single frame
2. **Predictable Results**: Clips are extracted from consistent time positions
3. **Better Content Overview**: Provides a comprehensive preview of the entire video
4. **Customizable**: Allows fine-tuning of clip count, length, and timing
5. **Engaging**: More engaging than static thumbnails for users browsing videos

## When to Use

- **Recommended for**: Long videos, educational content, presentations, movies, documentaries
- **Consider single frame thumbnails for**: Very short videos, simple content, performance-critical scenarios

## How It Works

1. **Clip Generation**: Multiple short clips are extracted from different time positions
2. **Concatenation**: Clips are joined together to create a preview video
3. **Thumbnail Creation**: A single frame thumbnail is generated from the middle of the preview video
4. **Cleanup**: Temporary clip files are automatically removed

## Configuration via Admin Panel

1. Navigate to Administration → Settings → Video Transcoding
2. Enable "Custom Video Preview"
3. Adjust "Preview Time Offset" (0.1 = 10%, 0.2 = 20%, etc.)
4. Set "Preview Buffer Seconds" to avoid end-of-video content
5. Configure "Preview Scenes" (number of clips)
6. Set "Preview Scene Length" (duration of each clip)
7. Save settings

## Configuration via API

```json
{
  "ffmpeg": {
    "customVideoPreview": true,
    "previewTimeOffset": 0.1,
    "previewBufferSeconds": 20,
    "previewScenes": 10,
    "previewSceneLength": 2
  }
}
```

## Technical Implementation

The feature modifies the media service to:
1. Generate multiple video clips using time shift logic from video-overview-cli
2. Use FFmpeg to extract clips at calculated time positions
3. Concatenate clips into a single preview video
4. Generate a thumbnail from the middle of the preview video
5. Clean up temporary files automatically

### FFmpeg Commands Used

1. **Clip Extraction**: `ffmpeg -ss {startTime} -i input.mp4 -t {length} -c:v libx264 -preset fast -crf 28 clip.mp4`
2. **Concatenation**: `ffmpeg -f concat -safe 0 -i filelist.txt -c copy preview.mp4`
3. **Thumbnail**: `ffmpeg -ss {middleTime} -i preview.mp4 -frames:v 1 thumbnail.jpg`

## Backward Compatibility

This feature is fully backward compatible:
- Default behavior remains unchanged when `customVideoPreview` is `false`
- Existing thumbnails are not affected
- Can be enabled/disabled without data migration
- Falls back to default thumbnail generation if preview creation fails
