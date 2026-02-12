import Peer, { DataConnection } from 'peerjs';
import { PeerData } from '../types';

export class PeerService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onDataCallback: ((data: PeerData) => void) | null = null;

  constructor() {}

  init(onOpen: (id: string) => void) {
    // Generate a short ID for easier typing if possible, but PeerJS usually gives long UUIDs unless specified.
    // We'll let PeerJS generate it to avoid collisions.
    this.peer = new Peer();

    this.peer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      onOpen(id);
    });

    this.peer.on('connection', (conn) => {
      this.handleConnection(conn);
    });
  }

  connect(hostId: string, onConnected: (conn: DataConnection) => void) {
    if (!this.peer) return;
    const conn = this.peer.connect(hostId);
    
    conn.on('open', () => {
      this.handleConnection(conn);
      onConnected(conn);
    });
  }

  private handleConnection(conn: DataConnection) {
    this.conn = conn;
    
    this.conn.on('data', (data) => {
      if (this.onDataCallback) {
        this.onDataCallback(data as PeerData);
      }
    });

    this.conn.on('close', () => {
      console.log('Connection closed');
      this.conn = null;
    });

    this.conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }

  onConnection(callback: (conn: DataConnection) => void) {
    if (this.peer) {
      this.peer.on('connection', callback);
    }
  }

  onData(callback: (data: PeerData) => void) {
    this.onDataCallback = callback;
  }

  sendData(data: PeerData) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    }
  }

  destroy() {
    if (this.conn) {
      this.conn.close();
    }
    if (this.peer) {
      this.peer.destroy();
    }
  }
}
