export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Room {
  id: string;
  name: string;
  ownerId: number;
  isPrivate: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Participant {
  id: number;
  userId: number | null;
  displayName: string;
  role: "owner" | "editor" | "viewer";
}

export interface Point {
  x: number;
  y: number;
}

export interface StrokeElement {
  id: string;
  tool: "draw" | "eraser";
  color: string;
  width: number;
  points: Point[];
}

export interface RoomSnapshot {
  id: number;
  roomId: string;
  elements: StrokeElement[];
  appState: Record<string, unknown> | null;
  updatedBy: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomStateResponse {
  room: Room;
  snapshot: RoomSnapshot | null;
  participants: Participant[];
}
