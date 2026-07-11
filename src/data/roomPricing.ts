/** Official Spire Hub room rates (BHD, VAT included). */

export interface WorkshopLayout {
  id: string;
  label: string;
  capacity: number;
  description: string;
  image?: string;
}

export interface RoomPricing {
  odooRoomIds: number[];
  nameMatchers: string[];
  hourlyRate: number;
  capacity: number;
  vatIncluded: boolean;
  isWorkshop: boolean;
  layouts?: WorkshopLayout[];
}

export const roomPricingCatalog: RoomPricing[] = [
  {
    odooRoomIds: [1],
    nameMatchers: ["meeting room 1"],
    hourlyRate: 5.5,
    capacity: 6,
    vatIncluded: true,
    isWorkshop: false,
  },
  {
    odooRoomIds: [3],
    nameMatchers: ["meeting room 2", "big window"],
    hourlyRate: 5.5,
    capacity: 6,
    vatIncluded: true,
    isWorkshop: false,
  },
  {
    odooRoomIds: [2],
    nameMatchers: ["workshop"],
    hourlyRate: 11,
    capacity: 26,
    vatIncluded: true,
    isWorkshop: true,
    layouts: [
      {
        id: "classroom",
        label: "Classroom setup",
        capacity: 26,
        description: "Rows of tables — ideal for training sessions",
        image: "/rooms/workshop-classroom.jpeg",
      },
      {
        id: "u-shape",
        label: "U-shape setup",
        capacity: 20,
        description: "Open centre — ideal for workshops & discussions",
        image: "/rooms/workshop-u-shape.jpeg",
      },
      {
        id: "meeting-table",
        label: "Meeting table",
        capacity: 12,
        description: "Boardroom style — ideal for 10–12 people",
        image: "/rooms/workshop-meeting-table.png",
      },
    ],
  },
];

export function findRoomPricing(
  odooId?: number,
  roomName?: string
): RoomPricing | undefined {
  if (odooId) {
    const byId = roomPricingCatalog.find((p) => p.odooRoomIds.includes(odooId));
    if (byId) return byId;
  }

  if (roomName) {
    const lower = roomName.toLowerCase();
    return roomPricingCatalog.find((p) =>
      p.nameMatchers.some((m) => lower.includes(m))
    );
  }

  return undefined;
}
