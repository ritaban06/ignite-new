// Socket Service for real-time updates in the client app
 
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.eventHandlers = {};
  }

  connect() {
    if (this.socket) {
      return;
    }

    // Get base URL without API path for Socket.io connection
    // Socket.io should connect to the server root, not an API path
    const baseUrl = import.meta.env.VITE_BASE_URL || 
                   (import.meta.env.VITE_API_URL ? 
                     import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 
                     window.location.origin);
    
    // console.log('Connecting socket to:', baseUrl);
    
    // Create socket connection
    this.socket = io(baseUrl, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
      path: '/socket.io' // Explicit socket.io path
    });

    // Setup event listeners
    this.socket.on('connect', () => {
      this.connected = true;
      // console.log('Socket connected:', this.socket.id);
      // toast.success('Real-time updates connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, reconnect manually
        setTimeout(() => {
          this.socket.connect();
        }, 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Unable to connect for real-time updates');
    });

    // Listen for folder updates
    this.socket.on('folder:updated', (data) => {
      console.log('Folder updated event received:', data);
      
      // Notify user
      toast.success(`Folder "${data.name}" was updated`);
      
      // Trigger any registered event handlers
      if (this.eventHandlers['folder:updated']) {
        this.eventHandlers['folder:updated'].forEach(handler => handler(data));
      }
    });

    // Listen for access tag updates
    this.socket.on('accessTag:updated', (data) => {
      console.log('Access tag updated event received:', data);
      
      // Trigger any registered event handlers
      if (this.eventHandlers['accessTag:updated']) {
        this.eventHandlers['accessTag:updated'].forEach(handler => handler(data));
      }
    });

    // Listen for PDF updates
    this.socket.on('pdf:updated', (data) => {
      console.log('PDF updated event received:', data);
      
      // Notify user
      toast.success(`PDF "${data.title}" was updated`);
      
      // Trigger any registered event handlers
      if (this.eventHandlers['pdf:updated']) {
        this.eventHandlers['pdf:updated'].forEach(handler => handler(data));
      }
    });
  }

  // Register event handlers
  on(event, callback) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(callback);
  }

  // Remove event handlers
  off(event, callback) {
    if (!this.eventHandlers[event]) return;
    if (callback) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(cb => cb !== callback);
    } else {
      delete this.eventHandlers[event];
    }
  }

  // Disconnect the socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
