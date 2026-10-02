import { db } from "../firebase-config.js";
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  limit,
  startAfter,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
export const ref = (kind, id) => doc(db, kind, id);
export async function read(kind, id) {
  const s = await getDoc(ref(kind, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
export async function list(kind, filters = [], pageSize = 150) {
  const result = [];
  let cursor = null;
  for (;;) {
    const q = query(
      collection(db, kind),
      ...filters.map(([field, value]) => where(field, "==", value)),
      limit(pageSize),
      ...(cursor ? [startAfter(cursor)] : []),
    );
    const s = await getDocs(q);
    result.push(...s.docs.map((d) => ({ id: d.id, ...d.data() })));
    if (s.docs.length < pageSize) return result;
    cursor = s.docs.at(-1);
  }
}
export const save = (kind, id, data) =>
  setDoc(ref(kind, id), data, { merge: true });
export const create = (kind, data) => addDoc(collection(db, kind), data);
export { serverTimestamp, Timestamp };
export async function reserve({ uid, slotId, guests, travelerName }) {
  const id = uid + "_" + slotId + "_" + crypto.randomUUID();
  await runTransaction(db, async (tx) => {
    const [slotSnap, existing] = await Promise.all([
      tx.get(ref("slots", slotId)),
      tx.get(ref("bookings", id)),
    ]);
    if (!slotSnap.exists()) throw new Error("slot-missing");
    const slot = slotSnap.data();
    if (existing.exists()) throw new Error("already-booked");
    if (!slot.open || slot.startAt.toMillis() <= Date.now())
      throw new Error("slot-closed");
    if (
      !Number.isInteger(guests) ||
      guests < 1 ||
      guests > 10 ||
      slot.booked + guests > slot.capacity
    )
      throw new Error("slot-full");
    const totalCents = slot.priceCents * guests,
      communityCents = Math.floor((totalCents * slot.communityBps) / 10000);
    tx.set(ref("bookings", id), {
      uid,
      hostUid: slot.hostUid,
      experienceId: slot.experienceId,
      slotId,
      travelerName,
      guests,
      totalCents,
      communityCents,
      hostCents: totalCents - communityCents,
      status: "confirmed",
      paymentMethod: "cash",
      hostPaid: false,
      travelerPaid: false,
      startAt: slot.startAt,
      endAt: slot.endAt,
      titleAr: slot.titleAr,
      titleEn: slot.titleEn,
      regionId: slot.regionId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(ref("slots", slotId), {
      booked: slot.booked + guests,
      lastBookingId: id,
    });
  });
  return id;
}
export async function cancelBooking(id, actor) {
  await runTransaction(db, async (tx) => {
    const b = await tx.get(ref("bookings", id));
    if (!b.exists()) throw new Error("booking-missing");
    const booking = b.data();
    const s = await tx.get(ref("slots", booking.slotId));
    if (!s.exists()) throw new Error("slot-missing");
    if (booking.status !== "confirmed") throw new Error("cannot-cancel");
    if (
      actor !== booking.hostUid &&
      booking.startAt.toMillis() - Date.now() < 48 * 3600000
    )
      throw new Error("cancel-deadline");
    tx.update(b.ref, {
      status: "cancelled",
      cancelledBy: actor,
      updatedAt: serverTimestamp(),
    });
    tx.update(s.ref, {
      booked: s.data().booked - booking.guests,
      lastBookingId: id,
    });
  });
}
export async function confirmCash(id, isHost) {
  await updateDoc(ref("bookings", id), {
    [isHost ? "hostPaid" : "travelerPaid"]: true,
    updatedAt: serverTimestamp(),
  });
}
export async function reviewBooking(id, booking, { rating, text }) {
  return setDoc(ref("reviews", id), {
    uid: booking.uid,
    hostUid: booking.hostUid,
    experienceId: booking.experienceId,
    bookingId: id,
    rating,
    text,
    createdAt: serverTimestamp(),
  });
}
export async function publishSlots(experience, dates, time, capacity) {
  for (const date of dates) {
    const start = new Date(`${date}T${time}:00+03:00`);
    if (start <= new Date()) throw new Error("past-date");
    const id = experience.id + "_" + date + "_" + time.replace(":", "");
    await runTransaction(db, async (tx) => {
      const r = ref("slots", id);
      if ((await tx.get(r)).exists()) throw new Error("slot-exists");
      tx.set(r, {
        experienceId: experience.id,
        hostUid: experience.hostUid,
        regionId: experience.regionId,
        titleAr: experience.titleAr,
        titleEn: experience.titleEn,
        capacity,
        booked: 0,
        priceCents: experience.priceCents,
        communityBps: experience.communityBps,
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromMillis(
          start.getTime() + experience.duration * 60000,
        ),
        open: true,
        lastBookingId: "",
      });
    });
  }
}
