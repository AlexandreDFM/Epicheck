import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = 'https://my.epitech.eu/api';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface UserInfo {
  email: string;
  login: string;
  title: string;
  picture: string;
}

export interface PresenceData {
  studentEmail: string;
  timestamp: string;
  location?: string;
}

class EpitechApiService {
  private api: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Authenticate user with Epitech credentials (Legacy - kept for backwards compatibility)
   */
  async login(credentials: AuthCredentials): Promise<UserInfo> {
    try {
      const response = await this.api.post('/auth/login', credentials);

      if (response.data.token) {
        this.authToken = response.data.token; 
      }

      return response.data.user;
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Authentication failed');
    }
  }

  /**
   * Set Office 365 access token for authentication
   * Use this after Office 365 login
   */
  setOffice365Token(accessToken: string): void {
    this.authToken = accessToken;
  }  /**
   * Get current user information
   */
  async getUserInfo(): Promise<UserInfo> {
    try {
      const response = await this.api.get('/user');
      return response.data;
    } catch (error: any) {
      console.error('Get user info error:', error.response?.data || error.message);
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Mark student presence
   */
  async markPresence(studentEmail: string): Promise<any> {
    try {
      const presenceData: PresenceData = {
        studentEmail,
        timestamp: new Date().toISOString(),
      };

      const response = await this.api.post('/presence', presenceData);
      return response.data;
    } catch (error: any) {
      console.error('Mark presence error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to mark presence');
    }
  }

  /**
   * Get student information by email
   */
  async getStudentByEmail(email: string): Promise<any> {
    try {
      const response = await this.api.get(`/students/${encodeURIComponent(email)}`);
      return response.data;
    } catch (error: any) {
      console.error('Get student error:', error.response?.data || error.message);
      throw new Error('Student not found');
    }
  }

  /**
   * Get presence list
   */
  async getPresenceList(): Promise<any[]> {
    try {
      const response = await this.api.get('/presence');
      return response.data;
    } catch (error: any) {
      console.error('Get presence list error:', error.response?.data || error.message);
      throw new Error('Failed to fetch presence list');
    }
  }

  /**
   * Logout and clear authentication
   */
  logout(): void {
    this.authToken = null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authToken !== null;
  }

  /**
   * Set authentication token manually
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get current auth token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }
}

export default new EpitechApiService();
