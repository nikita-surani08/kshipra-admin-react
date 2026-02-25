import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
  getDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase.config";

export interface PastSession {
    id?: string;
    user_id: string[];
    is_free: boolean;
    name: string;
    meeting_link: string;
    video_url?: string;
    banner_url?: string;
    date?: string;
    time?: string;
    duration?: string;
    isActive: boolean;
    createdAt: any;
    updatedAt: any;
    order?: number;
}

export const addSession = async (sessionData: PastSession) => {
  try {
    // Create the document in past_sessions collection
    const docRef = await addDoc(collection(db, "past_sessions"), {
      user_id: sessionData.user_id || [],
      is_free: sessionData.is_free,
      name: sessionData.name,
      meeting_link: sessionData.meeting_link,
      video_url: sessionData.video_url || "",
      banner_url: sessionData.banner_url || "",
      date: sessionData.date || "",
      time: sessionData.time || "",
      duration: sessionData.duration || "",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Return the created session data
    return {
      id: docRef.id,
      user_id: sessionData.user_id || [],
      is_free: sessionData.is_free,
      name: sessionData.name,
      meeting_link: sessionData.meeting_link,
      video_url: sessionData.video_url || "",
      banner_url: sessionData.banner_url || "",
      date: sessionData.date || "",
      time: sessionData.time || "",
      duration: sessionData.duration || "",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error adding session:", error);
    throw new Error("Failed to add session");
  }
};

export const updateSessionOrders = async (sessions: PastSession[]) => {
  try {
    // Update order field for all sessions
    const updatePromises = sessions.map(async (session, index) => {
      if (session.id) {
        const sessionRef = doc(db, "past_sessions", session.id);
        await updateDoc(sessionRef, { order: index + 1 });
        return { ...session, order: index + 1 };
      }
      return session;
    });

    const updatedSessions = await Promise.all(updatePromises);
    console.log("Session orders updated:", updatedSessions);
    return updatedSessions;
  } catch (error) {
    console.error("Error updating session orders:", error);
    throw new Error("Failed to update session orders");
  }
};

export const getSessions = async (searchQuery: string = "") => {
  try {
    const sessionsRef = collection(db, "past_sessions");
    let q;

    if (searchQuery && searchQuery.trim() !== "") {
      q = query(
        sessionsRef,
        where("isActive", "==", true),
        where("name", ">=", searchQuery),
        where("name", "<=", searchQuery + "\uf8ff"),
        orderBy("name")
      );
    } else {
      q = query(
        sessionsRef,
        where("isActive", "==", true),
        orderBy("createdAt", "desc")
      );
    }

    const querySnapshot = await getDocs(q);
    const sessions = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PastSession[];

    return {
      data: sessions,
    };
  } catch (error) {
    console.error("Error fetching sessions:", error);
    throw new Error("Failed to fetch sessions");
  }
};

export const updateSession = async (sessionId: string, updateData: any) => {
  try {
    const sessionRef = doc(db, "past_sessions", sessionId);

    await updateDoc(sessionRef, {
      user_id: updateData.user_id,
      is_free: updateData.is_free,
      name: updateData.name,
      meeting_link: updateData.meeting_link,
      video_url: updateData.video_url,
      banner_url: updateData.banner_url,
      date: updateData.date,
      time: updateData.time,
      duration: updateData.duration,
      updatedAt: new Date().toISOString(),
    });
    return { id: sessionId, ...updateData };
  } catch (error) {
    console.error("Error updating session:", error);
    throw new Error("Failed to update session");
  }
};

export const deleteSession = async (sessionId: string) => {
  try {
    const sessionRef = doc(db, "past_sessions", sessionId);
    await updateDoc(sessionRef, {
      isActive: false,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting session:", error);
    throw new Error("Failed to delete session");
  }
};