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
  setDoc,
} from "firebase/firestore";
import { db } from "../config/firebase.config";

const normalizeSearchTerm = (value: string = "") => value.trim().toLowerCase();

const matchesSearch = (text: string = "", queryText: string = "") => {
  const normalizedQuery = normalizeSearchTerm(queryText);
  if (!normalizedQuery) return true;
  return String(text || "").toLowerCase().includes(normalizedQuery);
};

const normalizeNoteTitle = (value: string = "") => value.trim().toLowerCase();

const ensureUniqueNoteTitle = async (
  subjectId: string,
  topicId: string,
  title: string,
  excludeNoteId?: string
) => {
  const normalizedTitle = normalizeNoteTitle(title);
  if (!normalizedTitle) return;

  const notesRef = collection(db, "notes");
  const duplicateQuery = query(
    notesRef,
    where("topic_id", "==", topicId)
  );

  const duplicateSnapshot = await getDocs(duplicateQuery);
  const duplicateExists = duplicateSnapshot.docs.some((docSnap) => {
    if (excludeNoteId && docSnap.id === excludeNoteId) return false;
    const noteData = docSnap.data() as Note;
    return (
      noteData.is_active === true &&
      noteData.subject_id === subjectId &&
      noteData.topic_id === topicId &&
      normalizeNoteTitle(noteData.title) === normalizedTitle
    );
  });

  if (duplicateExists) {
    throw new Error("A note with this title already exists for the selected subject and topic.");
  }
};

const updateTopicNotesCount = async (topicId: string, increment: number = 1) => {
  if (typeof topicId !== "string" || !topicId.trim() || topicId === "unknown_topic") {
    return;
  }

  try {
    const topicRef = doc(db, "topics", topicId);
    await updateDoc(topicRef, {
      total_notes: increment,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating topic notes count:", error);
  }
};

export interface Note {
  id?: string;
  created_at: string;
  document_id: string;
  is_active: boolean;
  order: number;
  pdf_url: string;
  html_url?: string;
  subject_id: string;
  title: string;
  topic_id: string;
  total_flashcards: number;
  updated_at: string;
}

// Add a new note
export const addNote = async (noteData: any) => {
  try {
    const nowIso = new Date().toISOString();
    const docRef = doc(collection(db, "notes"));
    const subjectId = noteData.subject_id ?? "unknown_subject";
    const topicId = noteData.topic_id ?? "unknown_topic";
    const title = noteData.title ?? "Untitled";

    await ensureUniqueNoteTitle(subjectId, topicId, title);

    const dataToSave = {
      subject_id: subjectId,
      topic_id: topicId,
      title,
      pdf_url: noteData.pdf_url ?? null, // Firebase accepts null, but not undefined
      html_url: noteData.html_url ?? null, // Firebase accepts null, but not undefined
      order: noteData.order || 1,
      is_active: true,
      total_flashcards: 0,
      created_at: nowIso,
      updated_at: nowIso,
      document_id: docRef.id,
    };

    console.log("Final data being sent to Firestore:", dataToSave);

    await setDoc(docRef, dataToSave);

    // Get current topic to increment total_notes
    if (noteData.topic_id && noteData.topic_id !== "unknown_topic") {
      try {
        const topicRef = doc(db, "topics", noteData.topic_id);
        const topicSnap = await getDoc(topicRef);
        
        if (topicSnap.exists()) {
          const topicData = topicSnap.data();
          const currentTotalNotes = topicData.total_notes || 0;
          await updateDoc(topicRef, {
            total_notes: currentTotalNotes + 1,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("Error updating topic notes count:", error);
      }
    }

    return {
      id: docRef.id,
      subject_id: noteData.subject_id,
      topic_id: noteData.topic_id,
      title: noteData.title,
      pdf_url: noteData.pdf_url,
      html_url: noteData.html_url,
      document_id: docRef.id,
      created_at: nowIso,
      updated_at: nowIso,
    };
  } catch (error) {
    console.error("Error adding note:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to add note");
  }
};

// Update a note
export const updateNote = async (noteId: string, updateData: any) => {
  try {
    const noteRef = doc(db, "notes", noteId);

    await ensureUniqueNoteTitle(
      updateData.subject_id,
      updateData.topic_id,
      updateData.title,
      noteId
    );

    console.log(updateData, "this is update data");
    await updateDoc(noteRef, {
      subject_id: updateData.subject_id,
      topic_id: updateData.topic_id,
      title: updateData.title,
      pdf_url: updateData.pdf_url,
      html_url: updateData.html_url,
      updated_at: new Date().toISOString(),
    });

    return { id: noteId, ...updateData };
  } catch (error) {
    console.error("Error updating note:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to update note");
  }
};

// Soft delete a note
export const deleteNote = async (noteId: string) => {
  try {
    const noteRef = doc(db, "notes", noteId);
    
    // Get note data before deletion to update topic count
    const noteSnap = await getDoc(noteRef);
    if (noteSnap.exists()) {
      const noteData = noteSnap.data();
      
      // Update topic's total_notes count
      if (noteData.topic_id && noteData.topic_id !== "unknown_topic") {
        try {
          const topicRef = doc(db, "topics", noteData.topic_id);
          const topicSnap = await getDoc(topicRef);
          
          if (topicSnap.exists()) {
            const topicData = topicSnap.data();
            const currentTotalNotes = topicData.total_notes || 0;
            const newTotalNotes = Math.max(0, currentTotalNotes - 1); // Prevent negative values
            
            await updateDoc(topicRef, {
              total_notes: newTotalNotes,
              updated_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Error updating topic notes count on deletion:", error);
        }
      }
    }
    
    await updateDoc(noteRef, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);
    throw new Error("Failed to delete note");
  }
};

// Bulk update note orders
export const updateNoteOrders = async (noteOrders: { noteId: string; order: number }[]) => {
  try {
    const batch = noteOrders.map(({ noteId, order }) => {
      const noteRef = doc(db, "notes", noteId);
      return updateDoc(noteRef, {
        order: order,
        updated_at: new Date().toISOString(),
      });
    });
    
    await Promise.all(batch);
    return { success: true };
  } catch (error) {
    console.error("Error updating note orders:", error);
    throw new Error("Failed to update note orders");
  }
};

// Get notes with pagination
export const getNotes = async (
  page: number = 1,
  pageSize: number = 10,
  lastVisible: any = null
) => {
  try {
    const notesRef = collection(db, "notes");
    let q = query(
      notesRef,
      where("is_active", "==", true),
      orderBy("created_at", "desc"),
      limit(pageSize)
    );

    if (lastVisible) {
      q = query(
        notesRef,
        where("is_active", "==", true),
        orderBy("created_at", "desc"),
        startAfter(lastVisible),
        limit(pageSize)
      );
    }

    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Note[];

    const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === pageSize;

    return {
      data: notes,
      lastVisible: lastVisibleDoc,
      hasMore,
      total: notes.length,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Error fetching notes:", error);
    throw new Error("Failed to fetch notes");
  }
};

// Get a single note by ID
export const getNoteById = async (noteId: string) => {
  try {
    const noteRef = doc(db, "notes", noteId);
    const noteSnap = await getDoc(noteRef);

    if (noteSnap.exists()) {
      return { id: noteSnap.id, ...noteSnap.data() } as Note;
    } else {
      throw new Error("Note not found");
    }
  } catch (error) {
    console.error("Error getting note:", error);
    throw new Error("Failed to get note");
  }
};

// Get notes by subject ID

export const getNotesBySubjectId = async (
  subjectId: string,
  page: number = 1,
  pageSize: number = 10,
  lastVisibleDocs: Record<number, any | null> = {},
  searchQuery: string = ""
) => {
  try {
    const notesRef = collection(db, "notes");
    const baseQuery = query(
      notesRef,
      where("subject_id", "==", subjectId),
      where("is_active", "==", true),
      orderBy("order", "asc")
    );
    const querySnapshot = await getDocs(baseQuery);
    const filteredDocs = querySnapshot.docs.filter((doc) =>
      matchesSearch((doc.data() as Note).title, searchQuery)
    );

    const total = filteredDocs.length;
    const startIndex = Math.max(0, (page - 1) * pageSize);
    const pageDocs = filteredDocs.slice(startIndex, startIndex + pageSize);
    const notes = pageDocs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as Note[];
    const lastVisibleDoc = pageDocs[pageDocs.length - 1] || null;

    return {
      data: notes,
      lastVisible: lastVisibleDoc,
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Error fetching notes by subject:", error);
    throw new Error("Failed to fetch notes by subject");
  }
};

// Get notes by topic ID
export const getNotesByTopicId = async (
  topicId: string,
  page: number = 1,
  pageSize: number = 10,
  lastVisibleDocs: Record<number, any | null> = {},
  searchQuery: string = ""
) => {
  try {
    const notesRef = collection(db, "notes");
    const baseQuery = query(
      notesRef,
      where("topic_id", "==", topicId),
      where("is_active", "==", true),
      orderBy("order", "asc")
    );
    const querySnapshot = await getDocs(baseQuery);
    const filteredDocs = querySnapshot.docs.filter((doc) =>
      matchesSearch((doc.data() as Note).title, searchQuery)
    );

    const total = filteredDocs.length;
    const startIndex = Math.max(0, (page - 1) * pageSize);
    const pageDocs = filteredDocs.slice(startIndex, startIndex + pageSize);
    const notes = pageDocs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as Note[];
    const lastVisibleDoc = pageDocs[pageDocs.length - 1] || null;

    return {
      data: notes,
      lastVisible: lastVisibleDoc,
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Error fetching notes by topic:", error);
    throw new Error("Failed to fetch notes by topic");
  }
};
