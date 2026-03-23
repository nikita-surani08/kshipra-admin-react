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
  runTransaction,
} from "firebase/firestore";
import { db } from "../config/firebase.config";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import * as XLSX from "xlsx";
import { addNote } from "./notes.api";

const normalizeSearchTerm = (value: string = "") => value.trim().toLowerCase();

const matchesSearch = (text: string = "", queryText: string = "") => {
  const normalizedQuery = normalizeSearchTerm(queryText);
  if (!normalizedQuery) return true;
  return String(text || "").toLowerCase().includes(normalizedQuery);
};

const buildNoteTitleMap = async (
  field: "subject_id" | "topic_id",
  id: string
): Promise<Map<string, string>> => {
  const notesSnap = await getDocs(
    query(
      collection(db, "notes"),
      where(field, "==", id),
      where("is_active", "==", true)
    )
  );

  const noteTitleMap = new Map<string, string>();
  notesSnap.docs.forEach((noteDoc) => {
    const noteData = noteDoc.data() as { title?: string; document_id?: string };
    noteTitleMap.set(noteDoc.id, noteData.title || "");
    if (noteData.document_id) {
      noteTitleMap.set(noteData.document_id, noteData.title || "");
    }
  });

  return noteTitleMap;
};

export interface Flashcard {
  id?: string;
  answer: string;
  answer_title?: string;
  created_at: string;
  document_id: string;
  is_active: boolean;
  note_id: string;
  order: number;
  question: string;
  question_title?: string;
  subject_id: string;
  topic_id: string;
  updated_at: string;
  tag?: string;
}

// Add a new flashcard
export const addFlashcard = async (
  flashcardData: Omit<
    Flashcard,
    "id" | "created_at" | "updated_at" | "document_id"
  >
) => {
  try {
    const nowIso = new Date().toISOString();
    const topicRef = doc(db, "topics", flashcardData.topic_id);

    // Use transaction to ensure atomicity
    let newFlashcardRef: any;

    await runTransaction(db, async (tx) => {
      // Get the current topic data
      const topicSnap = await tx.get(topicRef);
      if (!topicSnap.exists()) {
        throw new Error("Topic not found");
      }

      const topicData = topicSnap.data();
      const currentTotalFlashcards = topicData?.total_flashcards || 0;
      const newTotalFlashcards = currentTotalFlashcards + 1;

      // Get the current note data
      const noteRef = doc(db, "notes", flashcardData.note_id);
      const noteSnap = await tx.get(noteRef);
      if (!noteSnap.exists()) {
        throw new Error("Note not found");
      }

      const noteData = noteSnap.data();
      const currentNoteFlashcards = noteData?.total_flashcards || 0;
      const newNoteFlashcards = currentNoteFlashcards + 1;

      // Get the highest order number for flashcards in this topic
      const flashcardsQuery = query(
        collection(db, "flashcards"),
        where("topic_id", "==", flashcardData.topic_id),
        where("is_active", "==", true),
        orderBy("order", "desc"),
        limit(1)
      );
      
      const flashcardsSnap = await getDocs(flashcardsQuery);
      let nextOrder = 1;
      
      if (!flashcardsSnap.empty) {
        const highestOrderFlashcard = flashcardsSnap.docs[0].data();
        nextOrder = (highestOrderFlashcard.order || 0) + 1;
      }

      // Create the flashcard document
      newFlashcardRef = doc(collection(db, "flashcards"));
      
      tx.set(newFlashcardRef, {
        subject_id: flashcardData.subject_id,
        topic_id: flashcardData.topic_id,
        note_id: flashcardData.note_id,
        question_title: flashcardData.question_title,
        question: flashcardData.question,
        answer_title: flashcardData.answer_title,
        answer: flashcardData.answer,
        tag: flashcardData.tag || "",
        order: nextOrder,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
        document_id: newFlashcardRef.id,
      });

      // Update the topic's total_flashcards count
      tx.update(topicRef, {
        total_flashcards: newTotalFlashcards,
        updated_at: nowIso,
      });

      // Update the note's total_flashcards count
      tx.update(noteRef, {
        total_flashcards: newNoteFlashcards,
        updated_at: nowIso,
      });
    });

    return {
      id: newFlashcardRef.id,
      ...flashcardData,
      document_id: newFlashcardRef.id,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    };
  } catch (error) {
    console.error("Error adding flashcard:", error);
    throw new Error("Failed to add flashcard");
  }
};

const normalize = (value: unknown): string => String(value ?? "").trim();
const normalizeKey = (value: unknown): string => normalize(value).toLowerCase();

const REQUIRED_HEADERS = ["note title", "question", "answer"];

interface BulkUploadResult {
  totalCount: number;
  successCount: number;
  skippedCount: number;
  storagePath: string;
}

export const uploadFlashcardsFromExcel = async (
  file: File | Blob,
  options: { subjectId: string; topicId: string }
): Promise<BulkUploadResult> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const { subjectId, topicId } = options;

  if (!subjectId || !topicId) {
    throw new Error("Subject and topic must be selected before uploading.");
  }

  const storage = getStorage();
  const timestamp = Date.now();
  const originalName = (file as File).name ?? "flashcards.xlsx";
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageRef = ref(
    storage,
    `uploads/flashcards/${timestamp}-${sanitizedName}`
  );

  await uploadBytes(storageRef, file);

  const arrayBuffer =
    "arrayBuffer" in file
      ? await (file as File).arrayBuffer()
      : await new Response(file).arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    throw new Error("The uploaded Excel file does not contain any worksheets.");
  }

  const rows = XLSX.utils.sheet_to_json<(string | undefined)[]>(worksheet, {
    header: 1,
    blankrows: false,
  });

  if (rows.length === 0) {
    throw new Error("The uploaded Excel sheet is empty.");
  }

  const headerRow =
    (rows[0] as (string | undefined)[] | undefined)?.map(
      (cell: string | undefined) => normalize(cell).toLowerCase()
    ) ?? [];
  
  // Check if required headers are present (note title, question, answer)
  const hasNoteTitle = headerRow.includes("note title");
  const hasQuestion = headerRow.includes("question");
  const hasAnswer = headerRow.includes("answer");
  
  if (!hasNoteTitle || !hasQuestion || !hasAnswer) {
    throw new Error(
      "Invalid Excel template. Ensure the first row contains the columns: Note title, Question, Answer. Question title, Answer title, and Tag are optional."
    );
  }
  
  // Find column indices
  const noteTitleIndex = headerRow.indexOf("note title");
  const questionTitleIndex = headerRow.indexOf("question title");
  const questionIndex = headerRow.indexOf("question");
  const answerTitleIndex = headerRow.indexOf("answer title");
  const answerIndex = headerRow.indexOf("answer");
  const tagIndex = headerRow.indexOf("tag");

  const dataRows = rows
    .slice(1)
    .map((row: (string | undefined)[]) => row)
    .filter((row: (string | undefined)[]) =>
      row.some((cell: string | undefined) => normalize(cell).length > 0)
    );

  if (dataRows.length === 0) {
    throw new Error("No data rows found in the uploaded Excel sheet.");
  }

  const notesSnapshot = await getDocs(
    query(
      collection(db, "notes"),
      where("subject_id", "==", subjectId),
      where("topic_id", "==", topicId),
      where("is_active", "==", true)
    )
  );

  console.log("Fetching notes for subject:", subjectId, "topic:", topicId);
  console.log("Found notes count:", notesSnapshot.size);

  const noteMap = new Map<string, { id: string; title: string }>();
  notesSnapshot.forEach((noteDoc) => {
    const data = noteDoc.data() as { title?: string };
    const normalizedTitle = normalize(data.title);
    console.log("Note found:", {
      id: noteDoc.id,
      originalTitle: data.title,
      normalizedTitle: normalizedTitle,
      normalizedKey: normalizeKey(normalizedTitle)
    });
    noteMap.set(normalizeKey(normalizedTitle), {
      id: noteDoc.id,
      title: normalizedTitle,
    });
  });

  console.log("Note map keys:", Array.from(noteMap.keys()));

  let successCount = 0;
  const topicRef = doc(db, "topics", topicId);

  // Use transaction to update total_flashcards count atomically
  await runTransaction(db, async (tx) => {
    // Get current topic data
    const topicSnap = await tx.get(topicRef);
    if (!topicSnap.exists()) {
      throw new Error("Topic not found");
    }

    const topicData = topicSnap.data();
    const currentTotalFlashcards = topicData?.total_flashcards || 0;

    // Get the highest order number for existing flashcards in this topic
    const flashcardsQuery = query(
      collection(db, "flashcards"),
      where("topic_id", "==", topicId),
      where("is_active", "==", true),
      orderBy("order", "desc"),
      limit(1)
    );
    
    const flashcardsSnap = await getDocs(flashcardsQuery);
    let nextOrder = 1;
    
    if (!flashcardsSnap.empty) {
      const highestOrderFlashcard = flashcardsSnap.docs[0].data();
      nextOrder = (highestOrderFlashcard.order || 0) + 1;
    }

    for (const row of dataRows) {
      const noteTitle = normalize(row[noteTitleIndex]);
      const questionTitle = questionTitleIndex >= 0 ? normalize(row[questionTitleIndex]) : "";
      const question = normalize(row[questionIndex]);
      const answerTitle = answerTitleIndex >= 0 ? normalize(row[answerTitleIndex]) : "";
      const answer = normalize(row[answerIndex]);
      const tag = tagIndex >= 0 ? normalize(row[tagIndex]) : "";

      console.log("Processing row:", {
        originalRow: row,
        noteTitle,
        questionTitle,
        question,
        answerTitle,
        answer,
        tag,
      });

      if (!noteTitle || !question || !answer) {
        console.log("Skipping row - missing required fields:", {
          noteTitle: !!noteTitle,
          questionTitle: !!questionTitle,
          question: !!question,
          answerTitle: !!answerTitle,
          answer: !!answer
        });
        continue;
      }

      const note = noteMap.get(normalizeKey(noteTitle));
      console.log("Looking for note:", {
        searchTitle: noteTitle,
        searchKey: normalizeKey(noteTitle),
        found: note,
        availableKeys: Array.from(noteMap.keys())
      });
      
      let noteId: string;
      if (!note) {
        console.log("Creating new note:", noteTitle);
        try {
          const newNote = await addNote({
            subject_id: subjectId,
            topic_id: topicId,
            title: noteTitle,
            pdf_url: "",
          });
          noteId = newNote.document_id;
          console.log(`Note "${noteTitle}" created successfully`);
        } catch (err) {
          console.error("Error creating note:", err);
          continue;
        }
      } else {
        noteId = note.id;
      }

      try {
        const nowIso = new Date().toISOString();
        const docRef = doc(collection(db, "flashcards"));
        
        tx.set(docRef, {
          subject_id: subjectId,
          topic_id: topicId,
          note_id: noteId,
          question,
          question_title: questionTitle,
          answer_title: answerTitle,
          answer,
          tag,
          order: nextOrder,
          is_active: true,
          created_at: nowIso,
          updated_at: nowIso,
          document_id: docRef.id,
        });

        // Increment order for next flashcard
        nextOrder += 1;
        successCount += 1;
      } catch (error) {
        console.error("Failed to import flashcard row:", error);
      }
    }

    // Update the topic's total_flashcards count
    tx.update(topicRef, {
      total_flashcards: currentTotalFlashcards + successCount,
      updated_at: new Date().toISOString(),
    });
  });

  const totalCount = dataRows.length;
  const skippedCount = totalCount - successCount;

  return {
    totalCount,
    successCount,
    skippedCount,
    storagePath: storageRef.fullPath,
  };
};

// Update a flashcard
export const updateFlashcard = async (
  flashcardId: string,
  updateData: Partial<
    Omit<Flashcard, "id" | "created_at" | "updated_at" | "document_id">
  >
) => {
  try {
    const flashcardRef = doc(db, "flashcards", flashcardId);

    await updateDoc(flashcardRef, {
      ...updateData,
      updated_at: new Date().toISOString(),
    });

    return { id: flashcardId, ...updateData };
  } catch (error) {
    console.error("Error updating flashcard:", error);
    throw new Error("Failed to update flashcard");
  }
};

// Soft delete a flashcard
export const deleteFlashcard = async (flashcardId: string) => {
  try {
    const nowIso = new Date().toISOString();
    const flashcardRef = doc(db, "flashcards", flashcardId);

    // Use transaction to ensure atomicity
    await runTransaction(db, async (tx) => {
      // Get flashcard data first to find topicId and noteId
      const flashcardSnap = await tx.get(flashcardRef);
      if (!flashcardSnap.exists()) {
        throw new Error("Flashcard not found");
      }

      const flashcardData = flashcardSnap.data();
      const topicId = flashcardData.topic_id;
      const noteId = flashcardData.note_id;
      const topicRef = doc(db, "topics", topicId);
      const noteRef = doc(db, "notes", noteId);

      // Get current topic data
      const topicSnap = await tx.get(topicRef);
      if (!topicSnap.exists()) {
        throw new Error("Topic not found");
      }

      const topicData = topicSnap.data();
      const currentTotalFlashcards = topicData?.total_flashcards || 0;
      const newTotalFlashcards = Math.max(0, currentTotalFlashcards - 1); // Ensure we don't go below 0

      // Get current note data
      const noteSnap = await tx.get(noteRef);
      if (!noteSnap.exists()) {
        throw new Error("Note not found");
      }

      const noteData = noteSnap.data();
      const currentNoteFlashcards = noteData?.total_flashcards || 0;
      const newNoteFlashcards = Math.max(0, currentNoteFlashcards - 1); // Ensure we don't go below 0

      // Soft delete flashcard
      tx.update(flashcardRef, {
        is_active: false,
        updated_at: nowIso,
      });

      // Update the topic's total_flashcards count
      tx.update(topicRef, {
        total_flashcards: newTotalFlashcards,
        updated_at: nowIso,
      });

      // Update the note's total_flashcards count
      tx.update(noteRef, {
        total_flashcards: newNoteFlashcards,
        updated_at: nowIso,
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting flashcard:", error);
    throw new Error("Failed to delete flashcard");
  }
};

// Get a single flashcard by ID
export const getFlashcardById = async (flashcardId: string) => {
  try {
    const flashcardRef = doc(db, "flashcards", flashcardId);
    const flashcardSnap = await getDoc(flashcardRef);
    if (flashcardSnap.exists()) {
      return { id: flashcardSnap.id, ...flashcardSnap.data() } as Flashcard;
    } else {
      throw new Error("Flashcard not found");
    }
  } catch (error) {
    console.error("Error getting flashcard:", error);
    throw new Error("Failed to get flashcard");
  }
};

// Get flashcards by subject ID
export const getFlashcardsBySubjectId = async (
  subjectId: string,
  page: number = 1,
  pageSize: number = 10,
  lastVisibleDocs: Record<number, any | null> = {},
  searchQuery: string = ""
) => {
  try {
    const flashcardsRef = collection(db, "flashcards");
    const normalizedQuery = normalizeSearchTerm(searchQuery);
    const baseQuery = query(
      flashcardsRef,
      where("subject_id", "==", subjectId),
      where("is_active", "==", true),
      orderBy("created_at", "desc")
    );
    const querySnapshot = await getDocs(baseQuery);
    const noteTitleMap =
      normalizedQuery.length > 0
        ? await buildNoteTitleMap("subject_id", subjectId)
        : new Map<string, string>();
    const filteredDocs = querySnapshot.docs.filter((doc) =>
      matchesSearch((doc.data() as Flashcard).question, searchQuery) ||
      matchesSearch(noteTitleMap.get((doc.data() as Flashcard).note_id) || "", searchQuery)
    );
    const total = filteredDocs.length;
    const startIndex = Math.max(0, (page - 1) * pageSize);
    const pageDocs = filteredDocs.slice(startIndex, startIndex + pageSize);
    const flashcards = pageDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Flashcard[];
    const newLastVisible = pageDocs[pageDocs.length - 1] || null;

    return {
      data: flashcards,
      lastVisible: newLastVisible,
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Error fetching flashcards by subject ID:", error);
    throw new Error("Failed to fetch flashcards by subject ID");
  }
};

// Get flashcards by topic ID
// Get count of flashcards by noteId
export const getFlashcardCountByNoteId = async (
  noteId: string
): Promise<number> => {
  try {
    if (!noteId) return 0;

    const q = query(
      collection(db, "flashcards"),
      where("note_id", "==", noteId),
      where("is_active", "==", true)
    );

    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error counting flashcards:", error);
    return 0;
  }
};

export const getFlashcardsByTopicId = async (
  topicId: string,
  page: number = 1,
  pageSize: number = 10,
  lastVisibleDocs: Record<number, any | null> = {},
  searchQuery: string = ""
) => {
  try {
    const flashcardsRef = collection(db, "flashcards");
    const normalizedQuery = normalizeSearchTerm(searchQuery);
    const baseQuery = query(
      flashcardsRef,
      where("topic_id", "==", topicId),
      where("is_active", "==", true),
      orderBy("created_at", "desc")
    );
    const querySnapshot = await getDocs(baseQuery);
    const noteTitleMap =
      normalizedQuery.length > 0
        ? await buildNoteTitleMap("topic_id", topicId)
        : new Map<string, string>();
    const filteredDocs = querySnapshot.docs.filter((doc) =>
      matchesSearch((doc.data() as Flashcard).question, searchQuery) ||
      matchesSearch(noteTitleMap.get((doc.data() as Flashcard).note_id) || "", searchQuery)
    );
    const total = filteredDocs.length;
    const startIndex = Math.max(0, (page - 1) * pageSize);
    const pageDocs = filteredDocs.slice(startIndex, startIndex + pageSize);
    const flashcards = pageDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Flashcard[];
    const newLastVisible = pageDocs[pageDocs.length - 1] || null;

    return {
      data: flashcards,
      lastVisible: newLastVisible,
      total,
      page,
      pageSize,
    };
  } catch (error) {
    console.error("Error fetching flashcards by topic ID:", error);
    throw new Error("Failed to fetch flashcards by topic ID");
  }
};
