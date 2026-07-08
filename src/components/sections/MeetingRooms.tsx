import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Monitor, Wifi } from "lucide-react";
import Button from "../ui/Button";
import { SectionTag } from "../ui/SectionTag";
import BookingModal from "../booking/BookingModal";
import { meetingRooms as fallbackRooms, timeSlots } from "../../data/meetingRooms";
import { getMeetingRooms } from "../../services/booking";
import type { MeetingRoom } from "../../data/meetingRooms";
import { formatBhd } from "../../utils/pricing";
import { addDaysLocal, formatLocalDate, toLocalDateString } from "../../utils/dates";

const tabs = ["Today", "Tomorrow", "This Week"] as const;
type Tab = (typeof tabs)[number];

function formatDate(date: Date): string {
  return toLocalDateString(date);
}

function addDays(date: Date, days: number): Date {
  return addDaysLocal(date, days);
}

function getDateForTab(tab: Tab, customDate: string): string {
  const today = new Date();
  if (tab === "Today") return formatDate(today);
  if (tab === "Tomorrow") return formatDate(addDays(today, 1));
  return customDate || formatDate(addDays(today, 2));
}

export default function MeetingRooms() {
  const [activeTab, setActiveTab] = useState<Tab>("Today");
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [customDate, setCustomDate] = useState(() => formatDate(addDays(new Date(), 2)));
  const [modalOpen, setModalOpen] = useState(false);
  const [preselectedRoom, setPreselectedRoom] = useState<string | null>(null);
  const [rooms, setRooms] = useState<MeetingRoom[]>(fallbackRooms);
  const [odooConnected, setOdooConnected] = useState(false);

  useEffect(() => {
    getMeetingRooms().then(({ rooms: loaded, fromOdoo }) => {
      setRooms(loaded);
      setOdooConnected(fromOdoo);
    });
  }, []);

  const selectedDate = useMemo(
    () => getDateForTab(activeTab, customDate),
    [activeTab, customDate]
  );

  const minDate = formatDate(new Date());
  const maxDate = formatDate(addDays(new Date(), 7));

  const openBooking = (roomId?: string) => {
    setPreselectedRoom(roomId ?? null);
    setModalOpen(true);
  };

  return (
    <section id="meeting-rooms" className="bg-spire-light py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-2xl"
        >
          <SectionTag>Meeting Rooms</SectionTag>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Spaces that inspire progress.
          </h2>
          <p className="mt-4 text-spire-gray">
            Book a room in seconds — no account needed. Choose your space, pick a
            time, and you&apos;re set.
          </p>
          {!odooConnected && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Odoo not connected — showing sample rooms. Add your API key to{" "}
              <code className="rounded bg-amber-100 px-1">.env</code> and restart{" "}
              <code className="rounded bg-amber-100 px-1">npm run dev</code>.
            </p>
          )}
          {odooConnected && (
            <p className="mt-3 text-sm font-medium text-green-700">
              Live rooms from spire-test1.odoo.com
            </p>
          )}
        </motion.div>

        {/* Room cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {rooms.map((room, i) => (
            <motion.article
              key={room.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -6 }}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="relative overflow-hidden">
                <img
                  src={room.image}
                  alt={room.name}
                  className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-spire-navy backdrop-blur-sm">
                  <Users className="h-3 w-3" />
                  {room.capacity}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-semibold text-spire-navy">{room.name}</h3>
                <p className="mt-1 text-xs font-semibold text-spire-navy">
                  {formatBhd(room.hourlyRate ?? 5.5)}/hr
                  <span className="font-normal text-spire-gray"> · VAT incl.</span>
                </p>
                <p className="mt-0.5 text-xs text-spire-gray">
                  Up to {room.capacity} pax
                  {room.isWorkshop ? " · 3 layout options" : ""}
                </p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-spire-gray">
                  {room.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {room.amenities.slice(0, 2).map((a) => (
                    <span
                      key={a}
                      className="rounded-md bg-spire-light px-2 py-0.5 text-[10px] font-medium text-spire-navy"
                    >
                      {a}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => openBooking(room.id)}
                  className="mt-4 w-full rounded-lg border border-spire-navy py-2 text-sm font-semibold text-spire-navy transition-colors hover:bg-spire-navy hover:text-white"
                >
                  Book this room
                </button>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Quick booking widget */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative mt-16 overflow-hidden rounded-2xl shadow-xl"
        >
          <img
            src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&h=500&fit=crop"
            alt="Spire Hub boardroom"
            className="h-64 w-full object-cover lg:h-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-spire-navy/80 to-transparent" />

          <div className="absolute inset-0 flex items-center">
            <div className="hidden max-w-md px-8 text-white lg:block">
              <h3 className="text-2xl font-bold">Need a room fast?</h3>
              <p className="mt-2 text-sm text-blue-100">
                Check availability and book in under a minute.
              </p>
              <div className="mt-4 flex gap-4 text-xs text-blue-100">
                <span className="flex items-center gap-1">
                  <Monitor className="h-4 w-4" /> AV equipped
                </span>
                <span className="flex items-center gap-1">
                  <Wifi className="h-4 w-4" /> High-speed WiFi
                </span>
              </div>
            </div>

            <div className="ml-auto w-full max-w-sm p-4 lg:mr-8 lg:p-0">
              <div className="rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-spire-navy">Quick Book</h3>

                <div className="mt-4 flex rounded-lg bg-gray-100 p-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                        activeTab === tab
                          ? "bg-white text-spire-navy shadow-sm"
                          : "text-spire-gray hover:text-spire-navy"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-spire-gray">Date</label>
                    {activeTab === "This Week" ? (
                      <input
                        type="date"
                        min={minDate}
                        max={maxDate}
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-spire-blue"
                      />
                    ) : (
                      <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-spire-navy">
                        {formatLocalDate(selectedDate, {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-spire-gray">Time</label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-spire-blue"
                    >
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  className="mt-4 w-full"
                  showArrow={false}
                  onClick={() => openBooking()}
                >
                  Check Availability
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <BookingModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPreselectedRoom(null);
        }}
        initialDate={selectedDate}
        initialTime={selectedTime}
        preselectedRoomId={preselectedRoom}
      />
    </section>
  );
}
