# Custom Sound Configuration

EpiCheck allows you to customize the success and error sounds that play when marking student presence.

## Features

- 🔊 **Custom Success Sound** - Plays when presence is successfully marked
- ❌ **Custom Error Sound** - Plays when marking presence fails
- 🔄 **Easy Reset** - Return to default sounds anytime
- 🧪 **Test Sounds** - Preview sounds before using them
- 💾 **Persistent** - Custom sounds are saved locally

## Accessing Settings

1. Log in to the app
2. On the **Activities** screen, tap **⚙️ Settings** in the top-right corner
3. You'll see the **Sound Settings** section

## Importing Custom Sounds

### Success Sound

1. Tap **📁 Import Sound** under "Success Sound"
2. Choose an audio file from your device
3. Supported formats: MP3, WAV, M4A, AAC
4. Tap **🔊 Test** to preview the sound

### Error Sound

1. Tap **📁 Import Sound** under "Error Sound"
2. Choose an audio file from your device
3. Supported formats: MP3, WAV, M4A, AAC
4. Tap **🔊 Test** to preview the sound

## Resetting to Defaults

If you want to go back to the original sounds:

1. Tap **↺ Reset** next to the custom sound
2. Confirm the reset
3. The default metal pipe clang sound will be restored

## Sound Requirements

- **Format**: MP3, WAV, M4A, AAC
- **Duration**: Keep it short (1-2 seconds recommended)
- **Size**: Smaller files work better (< 500KB)
- **Volume**: Make sure the sound is audible but not too loud

## Default Sounds

The app comes with a default metal pipe clang sound for both success and error events. This sound:
- Works in silent mode (iOS)
- Doesn't require permissions
- Is optimized for quick playback
- Located at: `assets/sounds/metal-pipe-clang.mp3`

## Technical Details

### Storage Location

Custom sounds are stored in:
```
{AppDocumentDirectory}/sounds/
  - success.mp3 (custom success sound)
  - error.mp3 (custom error sound)
```

### How It Works

1. **Import**: When you import a sound, the app copies it to the local storage
2. **Playback**: The app checks for custom sounds first, falls back to defaults
3. **Priority**: Custom sound > Default sound
4. **Memory**: Sounds are loaded and unloaded automatically to save memory

### Sound Service API

For developers, the sound service exposes these methods:

```typescript
// Play sounds
soundService.playSuccessSound()  // Success or default
soundService.playErrorSound()     // Error or default

// Import custom sounds
soundService.importSuccessSound(uri: string)
soundService.importErrorSound(uri: string)

// Reset to defaults
soundService.resetSuccessSound()
soundService.resetErrorSound()

// Check status
soundService.hasCustomSuccessSound()  // boolean
soundService.hasCustomErrorSound()    // boolean
```

## Troubleshooting

### Sound Not Playing

1. Check device volume
2. Ensure the app has permission to play audio
3. Try resetting to default sound
4. Make sure file format is supported

### Import Failed

1. Check that the file is an audio file
2. Try a different audio format (MP3 is most reliable)
3. Ensure file size is reasonable (< 5MB)
4. Make sure the file is accessible to the app

### Sound Playback Issues

1. **Too Quiet**: Choose a louder audio file
2. **Too Long**: Edit the audio to be shorter (1-2 seconds)
3. **Doesn't Work in Silent Mode**: This is iOS behavior for custom sounds from documents

## Best Practices

1. **Test First**: Always test the sound before using it in production
2. **Keep It Short**: 1-2 second sounds work best for quick feedback
3. **Clear Audio**: Choose sounds with clear, distinct tones
4. **Appropriate Volume**: Not too loud, not too quiet
5. **Professional Context**: Remember this is for classroom use

## Example Sound Sources

Good places to find appropriate sounds:
- **Freesound.org** - Free sound effects
- **Zapsplat.com** - Free sound effects library
- **Create Your Own** - Record or generate custom sounds
- **System Sounds** - Use existing notification sounds from your device

## Recommended Sounds

### Success
- Short bell chime
- Positive beep
- Quick "ding" sound
- Gentle notification tone

### Error  
- Lower-pitched beep
- Buzzer sound
- "Boop" or rejection sound
- Alert tone

## Privacy & Storage

- Custom sounds are stored locally on your device only
- No sounds are uploaded to any server
- Sounds persist across app launches
- Uninstalling the app removes custom sounds
- Total storage used is minimal (typically < 1MB)
