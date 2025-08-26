// Socket Service for real-time updates in the admin app

import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { API_URL } from '../api';

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

    // Create socket connection
    this.socket = io(API_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });

    // Setup event listeners
    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Admin socket connected:', this.socket.id);
      toast.success('Real-time updates connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('Admin socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Admin socket connection error:', error);
      toast.error('Unable to connect for real-time updates');
    });

    // Basic event handlers - admin listens for changes from other admins
    // as well as sees its own broadcasted changes
    this.socket.on('folder:updated', (data) => {
      console.log('Admin received folder update:', data);
      
      // Trigger any registered event handlers
      if (this.eventHandlers['folder:updated']) {
        this.eventHandlers['folder:updated'].forEach(handler => handler(data));
      }
    });

    this.socket.on('accessTag:updated', (data) => {
      console.log('Admin received access tag update:', data);
      
      // Trigger any registered event handlers
      if (this.eventHandlers['accessTag:updated']) {
        this.eventHandlers['accessTag:updated'].forEach(handler => handler(data));
      }
    });

    this.socket.on('pdf:updated', (data) => {
      console.log('Admin received PDF update:', data);
      
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

  // Send admin updates (these will be broadcasted to clients)
  emitFolderUpdate(folderData) {
    if (!this.socket || !this.connected) {
      console.warn('Socket not connected, cannot emit folder update');
      return;
    }
    
    this.socket.emit('admin:folder:update', folderData);
    console.log('Admin emitted folder update:', folderData);
  }

  emitAccessTagUpdate(tagData) {
    if (!this.socket || !this.connected) {
      console.warn('Socket not connected, cannot emit access tag update');
      return;
    }
    
    this.socket.emit('admin:accessTag:update', tagData);
    console.log('Admin emitted access tag update:', tagData);
  }

  emitPdfUpdate(pdfData) {
    if (!this.socket || !this.connected) {
      console.warn('Socket not connected, cannot emit PDF update');
      return;
    }
    
    this.socket.emit('admin:pdf:update', pdfData);
    console.log('Admin emitted PDF update:', pdfData);
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
