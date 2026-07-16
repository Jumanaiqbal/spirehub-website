import type { WorkshopLayout } from "./roomPricing";

export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  floor: string;
  amenities: string[];
  image: string;
  description: string;
  odooId?: number;
  bookingUrl?: string;
  hourlyRate?: number;
  vatIncluded?: boolean;
  isWorkshop?: boolean;
  layouts?: WorkshopLayout[];
}


export const meetingRooms: MeetingRoom[] = [
  {
    id: "boardroom-a",
    name: "Boardroom A",
    capacity: 12,
    floor: "Ground Floor",
    amenities: ["4K Display", "Video Conferencing", "Whiteboard"],
    image:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=500&fit=crop",
    description: "Executive boardroom with city views — ideal for investor pitches.",
  },


  
  {
    id: "focus-room-b",
    name: "Focus Room B",
    capacity: 6,
    floor: "Level 1",
    amenities: ["TV Screen", "Whiteboard", "Natural Light"],
    image:
      "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&h=500&fit=crop",
    description: "Intimate space for team standups and client meetings.",
  },
  {
    id: "studio-c",
    name: "Studio C",
    capacity: 20,
    floor: "Level 1",
    amenities: ["Projector", "PA System", "Stage Area"],
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=500&fit=crop",
    description: "Large presentation room for workshops and demo days.",
  },
  {
    id: "huddle-d",
    name: "Huddle D",
    capacity: 4,
    floor: "Ground Floor",
    amenities: ["Monitor", "Acoustic Panels"],
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=500&fit=crop",
    description: "Quick huddle room for 1:1s and small team syncs.",
  },
];





export const timeSlots = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export const durationOptions = [
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "3 hours", value: 180 },
  { label: "4 hours", value: 240 },
  { label: "5 hours", value: 300 },
];
