/**
 * File Name: soundService.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: Sound Service
 *              Manages audio playback for app feedback
 *              Supports custom user sounds with fallback to defaults
 * Copyright (c) 2025 Epitech
 * Version: 1.0.0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// Default sounds
const DEFAULT_SUCCESS_SOUND = require('../assets/sounds/metal-pipe-clang.mp3');
const DEFAULT_ERROR_SOUND = require('../assets/sounds/metal-pipe-clang.mp3'); // Using same for now

// Custom sound paths (stored in app's document directory)
const CUSTOM_SOUNDS_DIR = `${FileSystem.documentDirectory}sounds/`;
const CUSTOM_SUCCESS_PATH = `${CUSTOM_SOUNDS_DIR}success.mp3`;
const CUSTOM_ERROR_PATH = `${CUSTOM_SOUNDS_DIR}error.mp3`;

class SoundService {
    private sound: Audio.Sound | null = null;
    private customSuccessSound: string | null = null;
    private customErrorSound: string | null = null;

    async initialize() {
        try {
            // Set audio mode for better playback
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            // Ensure sounds directory exists
            const dirInfo = await FileSystem.getInfoAsync(CUSTOM_SOUNDS_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(CUSTOM_SOUNDS_DIR, { intermediates: true });
            }

            // Check if custom sounds exist
            await this.loadCustomSounds();
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }

    /**
     * Load custom sounds if they exist
     */
    private async loadCustomSounds() {
        try {
            const successInfo = await FileSystem.getInfoAsync(CUSTOM_SUCCESS_PATH);
            if (successInfo.exists) {
                this.customSuccessSound = CUSTOM_SUCCESS_PATH;
                console.log('✓ Custom success sound loaded');
            }

            const errorInfo = await FileSystem.getInfoAsync(CUSTOM_ERROR_PATH);
            if (errorInfo.exists) {
                this.customErrorSound = CUSTOM_ERROR_PATH;
                console.log('✓ Custom error sound loaded');
            }
        } catch (error) {
            console.error('Failed to load custom sounds:', error);
        }
    }

    /**
     * Import a custom success sound
     * @param sourceUri - URI of the sound file to import (from file picker, download, etc.)
     */
    async importSuccessSound(sourceUri: string): Promise<void> {
        try {
            // Copy the file to our sounds directory
            await FileSystem.copyAsync({
                from: sourceUri,
                to: CUSTOM_SUCCESS_PATH,
            });

            this.customSuccessSound = CUSTOM_SUCCESS_PATH;
            console.log('✓ Custom success sound imported');
        } catch (error) {
            console.error('Failed to import success sound:', error);
            throw new Error('Failed to import success sound');
        }
    }

    /**
     * Import a custom error sound
     * @param sourceUri - URI of the sound file to import
     */
    async importErrorSound(sourceUri: string): Promise<void> {
        try {
            // Copy the file to our sounds directory
            await FileSystem.copyAsync({
                from: sourceUri,
                to: CUSTOM_ERROR_PATH,
            });

            this.customErrorSound = CUSTOM_ERROR_PATH;
            console.log('✓ Custom error sound imported');
        } catch (error) {
            console.error('Failed to import error sound:', error);
            throw new Error('Failed to import error sound');
        }
    }

    /**
     * Reset success sound to default
     */
    async resetSuccessSound(): Promise<void> {
        try {
            const fileInfo = await FileSystem.getInfoAsync(CUSTOM_SUCCESS_PATH);
            if (fileInfo.exists) {
                await FileSystem.deleteAsync(CUSTOM_SUCCESS_PATH);
            }
            this.customSuccessSound = null;
            console.log('✓ Success sound reset to default');
        } catch (error) {
            console.error('Failed to reset success sound:', error);
        }
    }

    /**
     * Reset error sound to default
     */
    async resetErrorSound(): Promise<void> {
        try {
            const fileInfo = await FileSystem.getInfoAsync(CUSTOM_ERROR_PATH);
            if (fileInfo.exists) {
                await FileSystem.deleteAsync(CUSTOM_ERROR_PATH);
            }
            this.customErrorSound = null;
            console.log('✓ Error sound reset to default');
        } catch (error) {
            console.error('Failed to reset error sound:', error);
        }
    }

    /**
     * Check if custom sounds are being used
     */
    hasCustomSuccessSound(): boolean {
        return this.customSuccessSound !== null;
    }

    hasCustomErrorSound(): boolean {
        return this.customErrorSound !== null;
    }

    /**
     * Play success sound (custom or default)
     */
    async playSuccessSound() {
        await this.playSound(this.customSuccessSound, DEFAULT_SUCCESS_SOUND);
    }

    /**
     * Play error sound (custom or default)
     */
    async playErrorSound() {
        await this.playSound(this.customErrorSound, DEFAULT_ERROR_SOUND);
    }

    /**
     * Internal method to play a sound with fallback
     */
    private async playSound(customPath: string | null, defaultSound: any) {
        try {
            // Unload previous sound if exists
            if (this.sound) {
                await this.sound.unloadAsync();
            }

            // Determine which sound to play
            const soundSource = customPath 
                ? { uri: customPath }
                : defaultSound;

            // Load and play the sound
            const { sound } = await Audio.Sound.createAsync(
                soundSource,
                { shouldPlay: true }
            );

            this.sound = sound;

            // Unload when finished to free memory
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (error) {
            console.error('Failed to play sound:', error);
        }
    }

    async cleanup() {
        try {
            if (this.sound) {
                await this.sound.unloadAsync();
                this.sound = null;
            }
        } catch (error) {
            console.error('Failed to cleanup sound:', error);
        }
    }
}

export default new SoundService();
