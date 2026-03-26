"use client";

import Image from "next/image";
import { Work_Sans } from "next/font/google";
import type { MenuProps } from "antd";
import { Dropdown, Space } from "antd";
import { DownOutlined, PlusOutlined, DragOutlined, SaveOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import NotesList from "./NotesList";
import AddNoteModal from "./AddNoteModal";
import EditNoteModal from "./EditNoteModal";
import DeleteNoteModal from "./DeleteNoteModal";
import ReorderNotesModal from "./ReorderNotesModal";
import {
  addNote,
  deleteNote,
  getNotes,
  getNotesBySubjectId,
  getNotesByTopicId,
  updateNote,
  updateNoteOrders,
  Note,
} from "@/service/api/notes.api";
import { getSubjects, getTopics } from "@/service/api/config.api";
import { debounce } from "lodash";
import SuccessAlert from "@/components/alerts/SuccessAlert";
import ErrorAlert from "@/components/alerts/ErrorAlert";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

const ManageNotes = () => {
  const [subject, setSubject] = useState<any>([]);
  const [topic, setTopic] = useState<any>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  const [noteList, setNoteList] = useState<any>([]);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isReorderModalVisible, setIsReorderModalVisible] = useState(false);
  const [allNotes, setAllNotes] = useState<any>([]);
  const [currentNote, setCurrentNote] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [lastVisibleDocs, setLastVisibleDocs] = useState<
    Record<number, any | null>
  >({});

  const [loading, setLoading] = useState(false);

  const [isSuccessAlertOpen, setIsSuccessAlertOpen] = useState(false);
  const [isErrorAlertOpen, setIsErrorAlertOpen] = useState(false);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const debouncedSearch = useMemo(
    () =>
      debounce(async (value: string, page = 1, pageSize = 10) => {
        if (!selectedSubject) {
          return;
        }

        try {
          setLoading(true);
          let result;

          if (selectedTopic) {
            result = await getNotesByTopicId(
              selectedTopic,
              page,
              pageSize,
              {},
              value
            );
          } else {
            result = await getNotesBySubjectId(
              selectedSubject,
              page,
              pageSize,
              {},
              value
            );
          }

          setNoteList(result.data);
          setPagination({
            current: page,
            pageSize,
            total: result.total,
          });

          setLastVisibleDocs((prev) => ({
            ...prev,
            [page]: result.lastVisible,
          }));
        } catch (error) {
          console.error("Error searching notes:", error);
        } finally {
          setLoading(false);
        }
      }, 500),
    [selectedSubject, selectedTopic]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const fetchNotes = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    lastVisible = lastVisibleDocs
  ) => {
    try {
      setLoading(true);
      console.log("Fetching notes...");

      let result;

      if (selectedSubject && selectedTopic) {
        result = await getNotesByTopicId(
          selectedTopic,
          page,
          pageSize,
          lastVisible
        );
      } else if (selectedSubject) {
        result = await getNotesBySubjectId(
          selectedSubject,
          page,
          pageSize,
          lastVisible
        );
      } else {
        // Handle case when neither subject nor topic is selected
        setNoteList([]);
        return;
      }

      setNoteList(result.data);
      setPagination((prev) => ({
        ...prev,
        total: result.total,
        current: page,
        pageSize,
      }));

      setLastVisibleDocs((prev) => ({
        ...prev,
        [page]: result.lastVisible,
      }));
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const subjects = await getSubjects();
      setSubject(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchTopics = async () => {
    try {
      if (!selectedSubject) {
        console.log("No subject selected, skipping topics fetch");
        setTopic([]);
        return;
      }

      console.log("Fetching topics for subject:", selectedSubject);
      const topics = await getTopics(selectedSubject);

      console.log("Raw topics data:", topics);
      console.log(
        "Topics structure:",
        topics.map((t: any) => ({
          id: t.document_id,
          name: t.name,
          hasDocumentId: !!t.document_id,
        }))
      );
      setTopic(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      setTopic([]);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [selectedSubject]);

  useEffect(() => {
    fetchNotes();
  }, [selectedSubject, selectedTopic]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      ...(pageSize && { pageSize }),
    }));
    fetchNotes(page, pageSize);
  };

  // Handle subject change
  const handleSubjectChange = (subjectId: string) => {
    setPagination({
      current: 1,
      pageSize: 10,
      total: 0,
    });

    setLastVisibleDocs({});

    setSelectedSubject(subjectId);
    setSelectedTopic(null);
    fetchTopics();
  };

  const handleAddNote = async (values: any) => {
    // Mapping the form values to the exact keys expected by notes.api.ts
    console.log("Values received in handleAddNote:", values);
    const newNote = {
      subject_id: values.subject_id,
      topic_id: values.topic_id,
      title: values.title,
      pdf_url: values.pdf_url,
      html_url: values.html_url,
    };

    try {
      setLoading(true);
      // Now result will receive subject_id correctly
      await addNote(newNote);

      setSuccessMessage("Note added successfully.");
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsErrorAlertOpen(false);
      setIsAddModalVisible(false);
      await fetchNotes(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error("Error adding note:", error);
      const message =
        error instanceof Error ? error.message : "Failed to add note.";
      setErrorMessage(message);
      setSuccessMessage(null);
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = async (values: any) => {
    const updatedNote = {
      subject_id: values.subject_id,
      topic_id: values.topic_id,
      title: values.title,
      pdf_url: values.pdf_url,
      html_url: values.html_url,
    };

    try {
      setLoading(true);
      const result = await updateNote(currentNote?.document_id, {
        ...updatedNote,
      });

      setSuccessMessage("Note updated successfully.");
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsErrorAlertOpen(false);
      setIsEditModalVisible(false);
    } catch (error) {
      console.error("Error updating note:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update note.";
      setErrorMessage(message);
      setSuccessMessage(null);
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
    } finally {
      setLoading(false);
    }

    fetchNotes(pagination.current, pagination.pageSize);
    setCurrentNote(null);
  };

  const handleDeleteNote = async () => {
    try {
      setLoading(true);
      const result = await deleteNote(currentNote?.document_id);
      setSuccessMessage("Note deleted successfully.");
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsErrorAlertOpen(false);
      setIsDeleteModalVisible(false);
    } catch (error) {
      console.error("Error deleting note:", error);
      const message =
        error instanceof Error ? error.message : "Failed to delete note.";
      setErrorMessage(message);
      setSuccessMessage(null);
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
    } finally {
      setLoading(false);
    }

    fetchNotes(pagination.current, pagination.pageSize);

    setCurrentNote(null);
  };

  const fetchAllNotes = async () => {
    try {
      let result;

      if (selectedSubject && selectedTopic) {
        result = await getNotesByTopicId(
          selectedTopic,
          1,
          1000 // Large number to get all notes
        );
      } else if (selectedSubject) {
        result = await getNotesBySubjectId(
          selectedSubject,
          1,
          1000 // Large number to get all notes
        );
      } else {
        return;
      }

      setAllNotes(result.data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
    } catch (error) {
      console.error("Error fetching all notes:", error);
    }
  };

  const handleReorderClick = async () => {
    console.log("Reorder clicked, selectedSubject:", selectedSubject);

    if (!selectedSubject) {
      console.log("No subject selected, showing error message");
      setErrorMessage("Please select a subject first to reorder its notes.");
      setIsErrorAlertOpen(true);
      return;
    }

    console.log("Subject selected, opening reorder modal");
    await fetchAllNotes();
    setIsReorderModalVisible(true);
  };

  const handleSaveOrder = async (reorderedNotes: Note[]) => {
    try {
      setLoading(true);
      const noteOrders = reorderedNotes.map((note, index) => ({
        noteId: note.document_id,
        order: index + 1,
      }));
      
      await updateNoteOrders(noteOrders);
      setSuccessMessage("Note order updated successfully.");
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsReorderModalVisible(false);
      fetchNotes(pagination.current, pagination.pageSize);
    } catch (error) {
      console.error("Error updating note order:", error);
      const message = error instanceof Error ? error.message : "Failed to update note order.";
      setErrorMessage(message);
      setIsErrorAlertOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReorder = () => {
    setIsReorderModalVisible(false);
  };

  const handleEditClick = (note: any) => {
    setCurrentNote(note);
    setIsEditModalVisible(true);
  };

  const handleDeleteClick = (note: any) => {
    setCurrentNote(note);
    setIsDeleteModalVisible(true);
  };

  const handleViewClick = (note: any) => {
    // In a real app, this would open the note in a viewer
    console.log("Viewing note:", note);
  };

  console.log(currentNote, "currentNote");

  const handleSuccessAlertClose = (
    event?: SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") return;
    setIsSuccessAlertOpen(false);
    setSuccessMessage(null);
  };

  const handleErrorAlertClose = (
    event?: SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") return;
    setIsErrorAlertOpen(false);
    setErrorMessage(null);
  };

  return (
    <div className="flex flex-col px-6 py-4 bg-[#F5F6F7] h-full">
      {successMessage && (
        <SuccessAlert
          message={successMessage}
          open={isSuccessAlertOpen}
          onClose={handleSuccessAlertClose}
        />
      )}
      {errorMessage && (
        <ErrorAlert
          message={errorMessage}
          open={isErrorAlertOpen}
          onClose={handleErrorAlertClose}
        />
      )}
      <div className="h-[12%] w-full items-center justify-center flex ">
        <div className="flex justify-between items-center w-full py-4">
          <div
            className={`text-[#1E4640] ${worksans.className} font-medium text-2xl`}
          >
            Notes Management
          </div>
          <div className="relative rounded-xl shadow-[0px_0px_4px_0px_#1E464040]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Image
                src="/images/search.svg"
                width={16}
                height={16}
                alt="search"
              />
            </div>
            <input
              type="text"
              className="pl-12 p-3 rounded-xl w-[350px] text-black"
              placeholder="Search For Notes"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                debouncedSearch(e.target.value);
              }}
            />
          </div>
        </div>
      </div>
      <div className="h-[88%] w-full flex flex-col bg-white rounded-3xl overflow-hidden">
        <div className="h-[14%] w-full flex-shrink-0 px-5 py-4">
          <div className="h-full w-full flex justify-between items-center">
            <div className="flex gap-2">
              <Dropdown
                menu={{
                  items: subject.map((item: any) => ({
                    key: item.document_id,
                    label: item.name,
                  })),
                  selectable: true,
                  onSelect: (e) => handleSubjectChange(e.key),
                  style: {
                    maxHeight: 550, 
                    overflowY: "auto", 
                  },
                }}
                trigger={["click"]}
                overlayClassName="w-[200px]"
              >
                <div className="flex items-center justify-between w-[230px] border border-gray-300 rounded-xl py-3 px-4 text-[#1E4640] bg-white cursor-pointer hover:border-[#1E4640] transition-colors">
                  <span>
                    {selectedSubject
                      ? subject.find(
                          (s: any) => s.document_id === selectedSubject
                        )?.name || "Select Subject"
                      : "Select Subject"}
                  </span>
                  <DownOutlined className="text-xs" />
                </div>
              </Dropdown>
              <Dropdown
                menu={{
                  items: topic.map((item: any) => ({
                    key: item.document_id,
                    label: item.title || item.name || "Untitled Topic",
                  })),
                  selectable: true,
                  disabled: !selectedSubject,
                  onSelect: (e) => {
                    setPagination({
                      current: 1,
                      pageSize: 10,
                      total: 0,
                    });

                    setLastVisibleDocs({});
                    setSelectedTopic(e.key);
                  },
                  style: {
                    maxHeight: 550,
                    overflowY: "auto",
                  },
                }}
                trigger={["click"]}
                overlayClassName="w-[200px]"
              >
                <div
                  className={`flex items-center justify-between w-[230px] border ${
                    !selectedSubject
                      ? "border-gray-200"
                      : "border-gray-300 hover:border-[#1E4640]"
                  } rounded-xl py-3 px-4 ${
                    !selectedSubject ? "text-gray-400" : "text-[#1E4640]"
                  } bg-white cursor-pointer transition-colors`}
                >
                  <span>
                    {selectedTopic
                      ? topic.find((t: any) => t.document_id === selectedTopic)
                          ?.title || topic.find((t: any) => t.document_id === selectedTopic)?.name || "Select Topic"
                      : "Select Topic"}
                  </span>
                  <DownOutlined className="text-xs" />
                </div>
              </Dropdown>
            </div>
            <div className="relative h-[50px] flex gap-4">
              <div className="shadow-[0px_0px_4px_0px_#1E464040] hover:shadow-[0px_2px_8px_0px_#1E464060] px-4 gap-2 cursor-pointer rounded-xl items-center justify-center flex bg-white transition-all duration-300 hover:-translate-y-0.2">
                <Image src="/images/plus.svg" width={20} height={20} alt="plus" />
                <button
                  className="text-[#1E4640] font-medium"
                  onClick={() => setIsAddModalVisible(true)}
                >
                  Add Notes
                </button>
              </div>
              
              <div className="shadow-[0px_0px_4px_0px_#1E464040] hover:shadow-[0px_2px_8px_0px_#1E464060] px-4 gap-2 cursor-pointer rounded-xl items-center justify-center flex bg-white transition-all duration-300 hover:-translate-y-0.2">
                <DragOutlined className="text-[#1E4640]" />
                <button
                  className="text-[#1E4640] font-medium cursor-pointer"
                  onClick={handleReorderClick}
                >
                  Reorder
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="h-full flex-1 w-full flex bg-white px-4">
          {selectedSubject === null && (
            <div className="flex flex-col items-center justify-center gap-4 w-full">
              <Image
                src="/images/no_content.svg"
                width={100}
                height={100}
                alt="No content available"
                priority
              />
              <div className="text-[#1E4640] font-bold text-2xl text-center">
                No Subject Selected!
              </div>
              <div className="text-[#758382] text-center w-[35%]">
                Select a Subject from the Dropdown above to view its associated
                topics and notes
              </div>
            </div>
          )}

          {selectedSubject !== null &&
            (noteList.length > 0 ? (
              <div className="w-full mt-4">
                <NotesList
                  notes={noteList}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  onView={handleViewClick}
                  loading={loading}
                  total={pagination.total}
                  currentPage={pagination.current}
                  pageSize={pagination.pageSize}
                  onPageChange={handlePageChange}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 w-full">
                <Image
                  src="/images/no_content.svg"
                  width={100}
                  height={100}
                  alt="No content available"
                  priority
                />
                <div className="text-[#1E4640] font-bold text-2xl text-center">
                  No Notes Found!
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add Note Modal */}
      <AddNoteModal
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onSave={handleAddNote}
        loading={loading}
        subject={subject}
      />

      {/* Edit Note Modal */}
      {currentNote && (
        <EditNoteModal
          visible={isEditModalVisible}
          onCancel={() => {
            setIsEditModalVisible(false);
            setCurrentNote(null);
          }}
          onSave={handleEditNote}
          note={currentNote}
          subjects={subject}
          loading={loading}
        />
      )}

      {currentNote && (
        <DeleteNoteModal
          visible={isDeleteModalVisible}
          onCancel={() => {
            setIsDeleteModalVisible(false);
            setCurrentNote(null);
          }}
          onConfirm={handleDeleteNote}
          loading={loading}
        />
      )}

      <ReorderNotesModal
        visible={isReorderModalVisible}
        notes={allNotes}
        onCancel={handleCancelReorder}
        onSave={handleSaveOrder}
        loading={loading}
        subjectName={subject.find((s: any) => s.document_id === selectedSubject)?.name}
        topicName={topic.find((t: any) => t.document_id === selectedTopic)?.title || topic.find((t: any) => t.document_id === selectedTopic)?.name}
      />
    </div>
  );
};

export default ManageNotes;
