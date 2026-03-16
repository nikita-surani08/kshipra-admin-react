import { collection, getDocs, doc, getDoc, query, orderBy, limit, startAfter, getCountFromServer } from "firebase/firestore";
import { db } from "../config/firebase.config";

const formatAmount = (amount: number | undefined, currency = "INR") => {
  const value = amount ? amount / 100 : 0; // assume amount is in paise
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).format(value);
  } catch (e) {
    return `${currency} ${value}`;
  }
};

const computeDuration = (start?: any, end?: any) => {
  if (!start || !end) return "-";
  try {
    const toMinutes = (val: any) => {
      if (!val && val !== 0) return null;
      // Date-like ISO string
      if (typeof val === "string") {
        // ISO datetime
        if (val.includes("T")) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
        }

        // time like HH:MM or H:MM AM/PM
        const ampmMatch = val.match(/(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/);
        if (ampmMatch) {
          let h = parseInt(ampmMatch[1], 10);
          const m = parseInt(ampmMatch[2], 10);
          const ampm = ampmMatch[3];
          if (ampm) {
            const isPm = /p/i.test(ampm);
            if (isPm && h < 12) h += 12;
            if (!isPm && h === 12) h = 0;
          }
          return h * 60 + m;
        }

        // numeric string
        if (!isNaN(Number(val))) {
          const n = Number(val);
          // seconds vs milliseconds
          if (n > 1e12) {
            const d = new Date(n);
            return d.getHours() * 60 + d.getMinutes();
          }
          if (n > 1e9) {
            const d = new Date(n); // likely ms
            return d.getHours() * 60 + d.getMinutes();
          }
          // seconds
          const d = new Date(n * 1000);
          return d.getHours() * 60 + d.getMinutes();
        }
      }

      // Date object
      if (val instanceof Date) return val.getHours() * 60 + val.getMinutes();

      // Firestore Timestamp-like
      if (typeof val === "object" && typeof val.toDate === "function") {
        const d: Date = val.toDate();
        return d.getHours() * 60 + d.getMinutes();
      }

      return null;
    };

    const sMin = toMinutes(start);
    const eMin = toMinutes(end);
    if (sMin === null || eMin === null) return "-";
    let startMin = sMin;
    let endMin = eMin;
    if (endMin < startMin) endMin += 24 * 60; // wrap over midnight
    const diff = endMin - startMin;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
    if (hours > 0) return `${hours} hr`;
    return `${mins} min`;
  } catch (e) {
    return "-";
  }
};

const normalizeStringField = (obj: any, keys: string[]) => {
  for (const k of keys) {
    if (!obj) continue;
    const v = obj[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "string") return v;
    // Firestore Timestamp
    if (typeof v === "object" && typeof v.toDate === "function") {
      const d: Date = v.toDate();
      return d.toISOString();
    }
    // number -> try to convert
    if (typeof v === "number") return v.toString();
  }
  return undefined;
};

const formatSessionDate = (val: any) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && typeof val.toDate === "function") {
    const d: Date = val.toDate();
    return d.toISOString().slice(0, 10);
  }
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val);
};

const formatBookingDate = (val: any) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && typeof val.toDate === "function") {
    const d: Date = val.toDate();
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
  if (val instanceof Date) return val.toISOString().slice(0, 16).replace('T', ' ');
  return String(val);
};

export const getBookings = async (
  page: number = 1,
  pageSize: number = 10,
  lastVisible: any = null
) => {
  try {
    const ordersRef = collection(db, "userOrders");
    
    // Get total count for pagination
    const countQuery = query(ordersRef);
    const totalSnap = await getCountFromServer(countQuery);
    const total = totalSnap.data().count;

    // Build paginated query
    let q;
    if (page === 1 || !lastVisible) {
      q = query(
        ordersRef,
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
    } else {
      q = query(
        ordersRef,
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(pageSize)
      );
    }

    const snap = await getDocs(q);
    const results: any[] = [];
    const lastVisibleDoc = snap.docs[snap.docs.length - 1];

    for (const docSnap of snap.docs) {
      const data: any = docSnap.data();
      const orderNotes = data?.paymentDetails?.order?.notes || data?.paymentDetails?.notes || {};

      // fetch mentor name
      let mentorName = data.mentorId || "-";
      if (data.mentorId) {
        try {
          const mentorDoc = await getDoc(doc(db, "mentors", data.mentorId));
          if (mentorDoc.exists()) {
            const m = mentorDoc.data();
            mentorName = m?.name || mentorName;
          }
        } catch (e) {
          // ignore
        }
      }

      // fetch student name and email
      let studentName = data.userId || "-";
      let studentEmail = "-";
      if (data.userId) {
        try {
          const userDoc = await getDoc(doc(db, "users", data.userId));
          if (userDoc.exists()) {
            const u = userDoc.data();
            studentName = u?.name || u?.displayName || u?.email || studentName;
            studentEmail = u?.email || studentEmail;
          }
        } catch (e) {
          // ignore
        }
      }

      const amount = data.amount ?? data.paymentDetails?.amount ?? 0;
      const currency = data.currency ?? data.paymentDetails?.currency ?? "INR";

      const paymentStatusRaw = (data.status || data.paymentDetails?.status || "").toString().toLowerCase();
      let paymentStatus = "Pending";
      if (paymentStatusRaw === "paid" || paymentStatusRaw === "captured") paymentStatus = "Paid";
      else if (paymentStatusRaw === "refunded" || data.refund_status) paymentStatus = "Refund";

      const mentorStatusRaw = (data.mentorStatus || "").toString().toLowerCase();
      let bookingStatus = "Accepted";
      if (mentorStatusRaw === "rejected") bookingStatus = "Rejected";
      else if (mentorStatusRaw === "pending") bookingStatus = "Pending";

      // Normalize start/end time and session date from various possible shapes
      const startTime = normalizeStringField(data, [
        "startTime",
        "start_time",
        "start",
        "slotStart",
        "slot_start",
      ]) || normalizeStringField(orderNotes, ["startTime", "start_time"]) || normalizeStringField(data?.paymentDetails, ["startTime", "start_time"]);

      const endTime = normalizeStringField(data, [
        "endTime",
        "end_time",
        "end",
        "slotEnd",
        "slot_end",
      ]) || normalizeStringField(orderNotes, ["endTime", "end_time"]) || normalizeStringField(data?.paymentDetails, ["endTime", "end_time"]);

      const sessionDateRaw =
        orderNotes?.sessionDate ??
        orderNotes?.session_date ??
        data.sessionDate ??
        data.session_date ??
        data.date ??
        data.bookingDate ??
        data.createdAt;
      const sessionDate = formatSessionDate(sessionDateRaw);

      const timeSlot = startTime && endTime
        ? `${startTime} - ${endTime}`
        : startTime || endTime || "-";

      const durationVal = computeDuration(startTime, endTime);
      // debug log to help trace parsing issues
      try {
        // eslint-disable-next-line no-console
        console.debug("booking-debug", { id: docSnap.id, startTime, endTime, sessionDate, durationVal, raw: { ...(data || {}) } });
      } catch (e) {
        // ignore
      }

      results.push({
        id: docSnap.id,
        studentName,
        studentEmail,
        mentorName,
        timeSlot,
        duration: durationVal,
        amount: formatAmount(amount, currency),
        bookingStatus,
        paymentStatus,
        bookingDate: formatBookingDate(data.createdAt),
        raw: data,
      });
    }

    return {
      data: results,
      lastVisible: lastVisibleDoc,
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Error fetching bookings:", error);
    throw new Error("Failed to fetch bookings");
  }
};

export default { getBookings };
