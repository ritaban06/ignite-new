class GoogleAuthService {
  constructor() {
    this.isInitialized = false;
  }

  // Initialize Google OAuth
  initialize(clientId) {
    if (this.isInitialized) return;
    
    try {
      // Google OAuth will be initialized through GoogleOAuthProvider in App component
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error);
      throw new Error('Google authentication initialization failed');
    }
  }

  // Decode JWT token to get user info
  decodeJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      throw new Error('Invalid token format');
    }
  }

  // Extract user information from Google credential response
  extractUserInfo(credentialResponse) {
    try {
      const userInfo = this.decodeJWT(credentialResponse.credential);
      
      return {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        googleId: userInfo.sub,
        emailVerified: userInfo.email_verified
      };
    } catch (error) {
      console.error('Error extracting user info:', error);
      throw new Error('Failed to extract user information from Google response');
    }
  }

  // Validate that email is verified
  validateGoogleUser(userInfo) {
    if (!userInfo.emailVerified) {
      throw new Error('Please verify your email address with Google before signing in');
    }
    
    if (!userInfo.email || !userInfo.name) {
      throw new Error('Incomplete user information from Google');
    }
    
    return true;
  }
}

export default new GoogleAuthService();
