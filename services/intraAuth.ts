/**
 * File Name: intraAuth.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: This is the intraAuth.ts
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

import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const INTRA_URL = 'https://intra.epitech.eu';
const INTRA_COOKIE_KEY = 'intra_user_cookie';

// Storage wrapper for cross-platform compatibility
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

/**
 * Intranet Authentication Service
 * Handles authentication with Epitech Intranet using WebView-based OAuth
 * and manages the session cookie for API access
 */
class IntraAuthService {
  private intraCookie: string | null = null;

  /**
   * Authenticate with Intranet using WebView OAuth flow
   * This should be called from a WebView component that handles the OAuth flow
   * and extracts the cookie. See IntraWebViewAuth.tsx
   */
  async authenticateWithIntranet(): Promise<string> {
    // This method is now just a placeholder
    // The actual authentication happens in IntraWebViewAuth screen
    // which will call setIntraCookie() directly after extracting the cookie
    throw new Error(
      'Direct authentication not supported. Use IntraWebViewAuth screen instead.'
    );
  }

  /**
   * Check if user has valid Intranet session
   */
  async checkIntranetSession(): Promise<boolean> {
    try {
      const response = await axios.get(`${INTRA_URL}/?format=json`, {
        withCredentials: true,
        validateStatus: (status) => status < 500, // Don't throw on 401/403
      });

      // If we get 401 or 403, user needs to authenticate
      if (response.status === 401 || response.status === 403) {
        return false;
      }

      // If we get 200, check if we can get user info
      if (response.status === 200) {
        // Try to get the cookie from the response
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          const userCookie = this.extractUserCookie(cookies);
          if (userCookie) {
            await this.setIntraCookie(userCookie);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Session check error:', error);
      return false;
    }
  }

  /**
   * Fetch Intranet cookie after successful OAuth
   */
  private async fetchIntranetCookie(): Promise<string | null> {
    try {
      // Make a request to Intranet to get the session cookie
      const response = await axios.get(`${INTRA_URL}/user/?format=json`, {
        withCredentials: true,
      });

      // Extract cookie from response headers
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        return this.extractUserCookie(cookies);
      }

      return null;
    } catch (error) {
      console.error('Fetch cookie error:', error);
      return null;
    }
  }

  /**
   * Extract the 'user' cookie value from Set-Cookie headers
   */
  private extractUserCookie(cookies: string | string[]): string | null {
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];

    for (const cookie of cookieArray) {
      // Look for 'user=' cookie
      const match = cookie.match(/user=([^;]+)/);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get stored Intranet cookie
   */
  async getIntraCookie(): Promise<string | null> {
    if (!this.intraCookie) {
      this.intraCookie = await storage.getItem(INTRA_COOKIE_KEY);
    }
    return this.intraCookie;
  }

  /**
   * Set Intranet cookie
   */
  async setIntraCookie(cookie: string): Promise<void> {
    this.intraCookie = cookie;
    await storage.setItem(INTRA_COOKIE_KEY, cookie);
  }

  /**
   * Clear Intranet cookie
   */
  async clearIntraCookie(): Promise<void> {
    this.intraCookie = null;
    await storage.removeItem(INTRA_COOKIE_KEY);
  }

  /**
   * Make authenticated request to Intranet API
   * This mimics the old project's fetchAPI function
   */
  async fetchIntranetAPI(url: string, options: RequestInit = {}): Promise<Response> {
    const cookie = await this.getIntraCookie();

    if (!cookie) {
      throw new Error('Not authenticated with Intranet');
    }

    // Add Authorization header with cookie as Bearer token
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${cookie}`,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * Get current Intranet user info
   */
  async getIntranetUser(): Promise<any> {
    try {
      const response = await this.fetchIntranetAPI(`${INTRA_URL}/user/?format=json`);
      return await response.json();
    } catch (error: any) {
      console.error('Get intranet user error:', error);
      throw new Error('Failed to get Intranet user info');
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const cookie = await this.getIntraCookie();
    if (!cookie) {
      return false;
    }

    // Verify cookie is still valid
    try {
      await this.getIntranetUser();
      return true;
    } catch (error) {
      // Cookie is invalid, clear it
      await this.clearIntraCookie();
      return false;
    }
  }

  /**
   * Logout from Intranet
   */
  async logout(): Promise<void> {
    await this.clearIntraCookie();
  }

  /**
   * TESTING ONLY: Manually set an Intranet cookie
   * Use this for testing when you have a valid cookie from your browser
   * 
   * To get your cookie:
   * 1. Login to https://intra.epitech.eu in your browser
   * 2. Open DevTools → Application → Cookies
   * 3. Copy the 'user' cookie value
   * 4. Call this method: intraAuth.setTestCookie('YOUR_COOKIE_VALUE')
   */
  async setTestCookie(cookie: string): Promise<void> {
    console.log('Setting test cookie...');
    await this.setIntraCookie(cookie);
    console.log('Test cookie set successfully');
  }
}

export default new IntraAuthService();
