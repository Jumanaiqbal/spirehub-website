import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Star, Users } from "lucide-react";
import BookingModal from "../booking/BookingModal";
import { meetingRooms as fallbackRooms, timeSlots } from "../../data/meetingRooms";
import { getMeetingRooms } from "../../services/booking";
import type { MeetingRoom } from "../../data/meetingRooms";
import { formatBhd } from "../../utils/pricing";
import { toLocalDateString } from "../../utils/dates";

const HERO_IMAGE = "/rooms/workshop-meeting-table.png";
const POPULAR_IMAGE = "/rooms/workshop-classroom.jpeg";

/**
 * Marketing copy shown when the room has no real description/amenities in
 * Odoo yet (the API returns generic defaults in that case).
 */
const GENERIC_DESCRIPTION = "Meeting room at Spire Hub.";
const WORKSHOP_FALLBACK_DESCRIPTION =
  "A flexible training space that reconfigures for classrooms, workshops or boardroom sessions — with flip chart and podium.";
const WORKSHOP_FALLBACK_AMENITIES = ["WiFi", "Display", "Flip chart", "Podium", "A/C"];

interface MeetingRoomsProps {
  onOpenJoinForm?: () => void;
}

function useManamaClock(): string {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bahrain",
  });
}

export default function MeetingRooms({ onOpenJoinForm }: MeetingRoomsProps) {
  // Open immediately (during render, before child effects run) when AFS
  // redirects back from the card payment page.
  const [modalOpen, setModalOpen] = useState(
    () => new URLSearchParams(window.location.search).get("afsPayment") === "1"
  );
  const [preselectedRoom, setPreselectedRoom] = useState<string | null>(null);
  const [rooms, setRooms] = useState<MeetingRoom[]>(fallbackRooms);
  const [searchRoomId, setSearchRoomId] = useState("");
  const [searchTime, setSearchTime] = useState("10:00");
  const [showLayouts, setShowLayouts] = useState(false);
  const clock = useManamaClock();

  useEffect(() => {
    getMeetingRooms().then(({ rooms: loaded }) => {
      setRooms(loaded);
      setSearchRoomId((prev) => prev || loaded[0]?.id || "");
    });
  }, []);

  const workshopRoom = useMemo(() => rooms.find((r) => r.isWorkshop), [rooms]);
  const standardRooms = useMemo(
    () =>
      rooms
        .filter((r) => !r.isWorkshop)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [rooms]
  );
  const [featuredRoom, ...otherRooms] = standardRooms;

  const stats = useMemo(() => {
    const capacities = rooms.map((r) => r.capacity);
    const rates = rooms.map((r) => r.hourlyRate ?? 5.5);
    return {
      roomCount: rooms.length,
      maxCapacity: capacities.length ? Math.max(...capacities) : 0,
      fromRate: rates.length ? Math.min(...rates) : 5.5,
    };
  }, [rooms]);

  const openBooking = (roomId?: string) => {
    setPreselectedRoom(roomId ?? null);
    setModalOpen(true);
  };

  return (
    <section id="meeting-rooms" className="bg-spire-light py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Hero */}
        <div className="grid gap-10 lg:grid-cols-2 lg:items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col"
          >
            <p className="text-sm font-semibold text-gray-900">
              {clock}
            </p>

            <h2 className="mt-4 text-4xl font-bold tracking-tight text-spire-navy md:text-5xl">
              Spaces that inspire progress.
            </h2>

            <div className="mt-4 flex items-center gap-4">
              <p className="shrink-0 text-sm font-medium text-gray-900">
                Let&apos;s get you a room
              </p>
              <div className="h-px flex-1 bg-gray-300" />
            </div>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <p className="max-w-xs text-sm leading-relaxed text-spire-gray">
                Book a room in seconds — no account needed. Pick your space,
                choose a time, and you&apos;re set.
              </p>
              <button
                type="button"
                onClick={() => openBooking()}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-spire-navy px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-spire-navy-dark"
              >
                Book a room
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 flex divide-x divide-gray-300">
              <div className="pr-6">
                <p className="text-3xl font-bold text-gray-900">{stats.roomCount}</p>
                <p className="mt-1 text-xs text-spire-gray">Rooms available</p>
              </div>
              <div className="px-6">
                <p className="text-3xl font-bold text-gray-900">{stats.maxCapacity}</p>
                <p className="mt-1 text-xs text-spire-gray">Max capacity</p>
              </div>
              <div className="pl-6">
                <p className="text-3xl font-bold text-gray-900">
                  BD {stats.fromRate}
                </p>
                <p className="mt-1 text-xs text-spire-gray">From / hour</p>
              </div>
            </div>

            <div className="relative mt-8 flex-1 overflow-hidden rounded-2xl min-h-[180px]">
              <img
                src={POPULAR_IMAGE}
                alt="Popular room at Spire Hub"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute bottom-3 left-3">
                <span className="rounded-full bg-spire-navy px-3 py-1 text-xs font-semibold text-white">
                  Popular
                </span>
                <div className="mt-1.5 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative min-h-[420px] overflow-hidden rounded-3xl"
          >
            <img
              src={HERO_IMAGE}
              alt="Spire Hub meeting room"
              className="absolute inset-0 h-full w-full object-cover"
            />

            {onOpenJoinForm && (
              <button
                type="button"
                onClick={onOpenJoinForm}
                className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-spire-navy shadow-md transition-colors hover:bg-spire-navy hover:text-white"
              >
                Contact us
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-spire-navy text-white">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </button>
            )}

            <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2 rounded-2xl bg-white/95 p-2 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center">
              <select
                value={searchRoomId}
                onChange={(e) => setSearchRoomId(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-spire-navy outline-none focus:border-spire-blue"
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
              <select
                value={searchTime}
                onChange={(e) => setSearchTime(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-spire-navy outline-none focus:border-spire-blue"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openBooking(searchRoomId || undefined)}
                className="rounded-xl bg-spire-navy px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-spire-navy-dark"
              >
                Search
              </button>
            </div>
          </motion.div>
        </div>

        {/* Flagship workshop room */}
        {workshopRoom && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-12 grid overflow-hidden rounded-3xl bg-white shadow-sm md:grid-cols-2"
          >
            <div className="relative min-h-[260px]">
              <img
                src={workshopRoom.image}
                alt={workshopRoom.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-spire-navy backdrop-blur-sm">
                <Users className="h-3.5 w-3.5" />
                {workshopRoom.capacity}
              </span>
              {workshopRoom.layouts && (
                <button
                  type="button"
                  onMouseEnter={() => setShowLayouts(true)}
                  onClick={() => setShowLayouts((v) => !v)}
                  className="absolute right-4 top-4 cursor-pointer rounded-full bg-spire-navy px-3 py-1 text-xs font-semibold text-white transition-transform hover:scale-105"
                >
                  {workshopRoom.layouts.length} layouts
                </button>
              )}

              <AnimatePresence>
                {showLayouts && workshopRoom.layouts && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onMouseLeave={() => setShowLayouts(false)}
                    onClick={() => setShowLayouts(false)}
                    className="absolute inset-0 flex items-center bg-spire-navy/75 p-4 backdrop-blur-sm"
                  >
                    <div className="grid w-full grid-cols-3 gap-3">
                      {workshopRoom.layouts.map((layout, i) => (
                        <motion.div
                          key={layout.id}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 18 }}
                          transition={{ delay: i * 0.08, duration: 0.3 }}
                          className="overflow-hidden rounded-xl bg-white shadow-lg"
                        >
                          {layout.image && (
                            <img
                              src={layout.image}
                              alt={layout.label}
                              className="h-20 w-full object-cover sm:h-24"
                            />
                          )}
                          <div className="p-2.5">
                            <p className="text-xs font-semibold text-spire-navy">
                              {layout.label}
                            </p>
                            <p className="mt-0.5 text-[10px] text-spire-gray">
                              Up to {layout.capacity} pax
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col justify-center p-8 lg:p-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-spire-blue">
                Flagship · Training Space
              </p>
              <h3 className="mt-2 text-2xl font-bold text-spire-navy md:text-3xl">
                {workshopRoom.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-spire-gray">
                {workshopRoom.description && workshopRoom.description !== GENERIC_DESCRIPTION
                  ? workshopRoom.description
                  : WORKSHOP_FALLBACK_DESCRIPTION}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(workshopRoom.amenities.length > 2
                  ? workshopRoom.amenities
                  : WORKSHOP_FALLBACK_AMENITIES
                ).map((a) => (
                  <span
                    key={a}
                    className="rounded-md bg-spire-light px-2.5 py-1 text-xs font-medium text-spire-navy"
                  >
                    {a}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-spire-navy">
                    {formatBhd(workshopRoom.hourlyRate ?? 11)}
                    <span className="text-sm font-normal text-spire-gray"> /hr · VAT incl.</span>
                  </p>
                  <p className="mt-0.5 text-xs text-spire-gray">
                    Up to {workshopRoom.capacity} pax · reconfigurable
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openBooking(workshopRoom.id)}
                  className="rounded-xl bg-spire-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-spire-navy-dark"
                >
                  Book this room
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Meeting rooms grid */}
        <div className="mt-14">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className="text-2xl font-bold tracking-tight text-spire-navy md:text-3xl">
              Spire Hub meeting rooms
            </h3>
          </div>

          <div
            className={`grid gap-6 ${
              otherRooms.length >= 2 ? "lg:grid-cols-4" : "lg:grid-cols-3"
            }`}
          >
            {featuredRoom && (
              <motion.article
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="group relative min-h-[380px] cursor-pointer overflow-hidden rounded-3xl lg:col-span-2"
                onClick={() => openBooking(featuredRoom.id)}
              >
                <img
                  src={featuredRoom.image}
                  alt={featuredRoom.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  {[
                    { label: "Capacity", value: `Up to ${featuredRoom.capacity} pax` },
                    { label: "Rate", value: `${formatBhd(featuredRoom.hourlyRate ?? 5.5)}/hr` },
                    ...(featuredRoom.amenities[0]
                      ? [{ label: "Feature", value: featuredRoom.amenities[0] }]
                      : []),
                  ].map((chip) => (
                    <span
                      key={chip.label}
                      className="rounded-lg bg-black/50 px-3 py-1.5 text-left backdrop-blur-sm"
                    >
                      <span className="block text-[9px] font-medium uppercase tracking-wider text-gray-300">
                        {chip.label}
                      </span>
                      <span className="block text-xs font-semibold text-white">{chip.value}</span>
                    </span>
                  ))}
                </div>

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h4 className="text-2xl font-bold uppercase tracking-wide text-white">
                    {featuredRoom.name}
                  </h4>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-200">
                    {featuredRoom.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-spire-navy transition-colors group-hover:bg-spire-navy group-hover:text-white">
                    Book this room
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </motion.article>
            )}

            {otherRooms.map((room, i) => (
              <motion.article
                key={room.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i + 1) * 0.1, duration: 0.5 }}
                className="group relative min-h-[380px] cursor-pointer overflow-hidden rounded-3xl"
                onClick={() => openBooking(room.id)}
              >
                <img
                  src={room.image}
                  alt={room.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

                <span className="absolute left-4 top-4 rounded-lg bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                  <span className="block text-[9px] font-medium uppercase tracking-wider text-gray-300">
                    Capacity
                  </span>
                  <span className="block text-xs font-semibold text-white">
                    Up to {room.capacity} pax
                  </span>
                </span>

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h4 className="text-xl font-bold uppercase tracking-wide text-white">
                    {room.name}
                  </h4>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Book this room
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-spire-gray">
          Spire Hub · Manama, Bahrain · Prices shown are per hour, VAT included
        </p>
      </div>

      <BookingModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPreselectedRoom(null);
        }}
        initialDate={toLocalDateString(new Date())}
        initialTime={searchTime}
        preselectedRoomId={preselectedRoom}
      />
    </section>
  );
}
