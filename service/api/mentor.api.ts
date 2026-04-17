import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  getDoc,
  serverTimestamp,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../config/firebase.config";
import { Session } from "inspector/promises";

const normalizeSearchTerm = (value: string = "") => value.trim().toLowerCase();

const mentorIsActive = (mentor: any) => {
  if (typeof mentor?.isActive === "boolean") {
    return mentor.isActive;
  }

  if (typeof mentor?.is_active === "boolean") {
    return mentor.is_active;
  }

  // Treat legacy records with no active flag as active so they still appear.
  return true;
};

const getMentorOrderValue = (mentor: any) => {
  const numericOrder = Number(mentor?.order);
  return Number.isFinite(numericOrder) ? numericOrder : Number.MAX_SAFE_INTEGER;
};

const mentorMatchesSearch = (mentor: any, searchQuery: string = "") => {
  const queryText = normalizeSearchTerm(searchQuery);
  if (!queryText) return true;

  const candidates = [
    mentor?.name,
    mentor?.emailId,
    mentor?.speciality,
    ...(Array.isArray(mentor?.expertise) ? mentor.expertise : []),
    ...(Array.isArray(mentor?.rank) ? mentor.rank : []),
  ];

  return candidates.some((value) =>
    String(value ?? "").toLowerCase().includes(queryText)
  );
};

export interface SessionCard {
  duration: string;
  fees: number;
  requiredSlots: number;
  currency: string;
}

export interface Schedule {
  day: string;
  timeSlots: string[];
}

export interface Mentor {
  id?: string;
  name: string;
  image: string;
  emailId: string;
  shortBio: string;
  rank: string[];
  speciality: string;
  expertise: string[];
  sessionCard: SessionCard[];
  schedule: Schedule[];
  isActive: boolean;
  order: number;
  createdAt: any;
  updatedAt: any;
}

export const addMentor = async (mentorData: any) => {
  try {

    // Check for unique email
    const mentorsRef = collection(db, "mentors");
    const q = query(
      mentorsRef,
      where("emailId", "==", mentorData.emailId),
      where("isActive", "==", true)
    );
    const existingMentors = await getDocs(q);

    if (!existingMentors.empty) {
      throw new Error("A mentor with this email ID already exists.");
    }

    // Calculate the next order number
    const allMentorsQuery = query(
      mentorsRef,
      where("isActive", "==", true),
      orderBy("order", "desc"),
      limit(1)
    );
    const allMentorsSnapshot = await getDocs(allMentorsQuery);
    
    let nextOrder = 1;
    if (!allMentorsSnapshot.empty) {
      const highestOrderMentor = allMentorsSnapshot.docs[0].data();
      nextOrder = (highestOrderMentor.order || 0) + 1;
    }

    // Step 1: Create the document
    const docRef = await addDoc(collection(db, "mentors"), {
      name: mentorData.name,
      image: mentorData.image,
      emailId: mentorData.emailId,
      shortBio: mentorData.shortBio,
      rank: mentorData.rank,
      speciality: mentorData.speciality,
      expertise: mentorData.expertise,
      sessionCard: mentorData.sessionCard,
      schedule: mentorData.schedule || [],
      isActive: true,
      order: mentorData.order || nextOrder, // Use provided order or calculated next order
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Step 2: Immediately update the new document with document_id
    await updateDoc(docRef, {
      document_id: docRef.id,
    });

    return {
      id: docRef.id,
      name: mentorData.name,
      image: mentorData.image,
      emailId: mentorData.emailId,
      shortBio: mentorData.shortBio,
      rank: mentorData.rank,
      speciality: mentorData.speciality,
      expertise: mentorData.expertise,
      sessionCard: mentorData.sessionCard,
      schedule: mentorData.schedule,
      document_id: docRef.id,
      createdAt: new Date().toISOString,
      updatedAt: new Date().toISOString,
    };
  } catch (error) {
    console.error("Error adding mentor:", error);
    throw error instanceof Error ? error : new Error("Failed to add mentor");
  }
};

export const getMentors = async (searchQuery: string = "") => {
  try {
    const mentorsRef = collection(db, "mentors");
    const querySnapshot = await getDocs(mentorsRef);
    const mentors = querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .map((mentor) => mentor as Mentor & Record<string, any>)
      .filter((mentor) => mentorIsActive(mentor))
      .sort((mentorA, mentorB) => {
        const orderDifference =
          getMentorOrderValue(mentorA) - getMentorOrderValue(mentorB);

        if (orderDifference !== 0) {
          return orderDifference;
        }

        const createdAtA = String(mentorA?.createdAt ?? "");
        const createdAtB = String(mentorB?.createdAt ?? "");
        return createdAtB.localeCompare(createdAtA);
      });

    return {
      data: mentors.filter((mentor) => mentorMatchesSearch(mentor, searchQuery)),
    };
  } catch (error) {
    console.error("Error fetching mentors:", error);
    throw new Error("Failed to fetch mentors");
  }
};

export const updateMentor = async (mentorId: string, updateData: any) => {
  try {
    const noteRef = doc(db, "mentors", mentorId);

    console.log(updateData, "this is update data");
    await updateDoc(noteRef, {
      name: updateData.name,
      image: updateData.image,
      emailId: updateData.emailId,
      shortBio: updateData.shortBio,
      rank: updateData.rank,
      speciality: updateData.speciality,
      expertise: updateData.expertise,
      sessionCard: updateData.sessionCard,
      schedule: updateData.schedule,
      updatedAt: new Date().toISOString(),
    });
    return { id: mentorId, ...updateData };
  } catch (error) {
    console.error("Error updating mentor:", error);
    throw new Error("Failed to update mentor");
  }
};

export const updateMentorSchedule = async (
  mentorId: string,
  schedule: Schedule[] = []
) => {
  try {
    const mentorRef = doc(db, "mentors", mentorId);
    await updateDoc(mentorRef, {
      schedule,
      updatedAt: new Date().toISOString(),
    });
    return { id: mentorId, schedule };
  } catch (error) {
    console.error("Error updating mentor schedule:", error);
    throw new Error("Failed to update mentor schedule");
  }
};

// Soft delete a note and reorder remaining mentors
export const deleteMentor = async (mentorId: string) => {
  try {
    // Get the mentor being deleted to know its order
    const mentorRef = doc(db, "mentors", mentorId);
    const mentorDoc = await getDoc(mentorRef);
    
    if (!mentorDoc.exists()) {
      throw new Error("Mentor not found");
    }
    
    const deletedMentor = mentorDoc.data();
    const deletedOrder = deletedMentor.order;
    
    // Step 1: Soft delete the mentor
    await updateDoc(mentorRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
    
    // Step 2: Get all active mentors with order > deletedOrder
    const mentorsRef = collection(db, "mentors");
    const q = query(
      mentorsRef,
      where("isActive", "==", true),
      where("order", ">", deletedOrder),
      orderBy("order", "asc")
    );
    const querySnapshot = await getDocs(q);
    
    // Step 3: Update all mentors with order > deletedOrder to decrement their order by 1
    const updatePromises = querySnapshot.docs.map((doc) => {
      const mentorRef = doc.ref;
      const currentOrder = doc.data().order;
      return updateDoc(mentorRef, {
        order: currentOrder - 1,
        updatedAt: new Date().toISOString(),
      });
    });
    
    await Promise.all(updatePromises);
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting mentor:", error);
    throw new Error("Failed to delete mentor");
  }
};

// Update mentor order
export const updateMentorOrder = async (mentorId: string, order: number) => {
  try {
    const mentorRef = doc(db, "mentors", mentorId);
    await updateDoc(mentorRef, {
      order: order,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating mentor order:", error);
    throw new Error("Failed to update mentor order");
  }
};

// Bulk update mentor orders
export const updateMentorOrders = async (mentorOrders: { mentorId: string; order: number }[]) => {
  try {
    const batch = mentorOrders.map(({ mentorId, order }) => {
      const mentorRef = doc(db, "mentors", mentorId);
      return updateDoc(mentorRef, {
        order: order,
        updatedAt: new Date().toISOString(),
      });
    });
    
    await Promise.all(batch);
    return { success: true };
  } catch (error) {
    console.error("Error updating mentor orders:", error);
    throw new Error("Failed to update mentor orders");
  }
};
