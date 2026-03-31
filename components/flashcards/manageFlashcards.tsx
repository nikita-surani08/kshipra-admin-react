"use client";

import Image from "next/image";
import { Work_Sans } from "next/font/google";
import { Dropdown, Space, Button } from "antd";
import { DownOutlined, PlusOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import FlashCardList from "./FlashCardList";
import AddFlashCardModal from "./AddFlashCardModal";
import EditFlashCardModal from "./EditFlashCardModal";
import DeleteFlashCardModal from "./DeleteFlashCardModal";
import { getSubjects, getTopics } from "@/service/api/config.api";
import "./flashcard.css";
import {
  addFlashcard,
  deleteFlashcard,
  getFlashcardsBySubjectId,
  getFlashcardsByTopicId,
  updateFlashcard,
  uploadFlashcardsFromExcel,
} from "@/service/api/flashcard.api";
import UploadFlashCardModal from "./UploadCardModal";
import { debounce } from "lodash";
import SuccessAlert from "@/components/alerts/SuccessAlert";
import ErrorAlert from "@/components/alerts/ErrorAlert";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

const ManageFlashcards = () => {
  const [subject, setSubject] = useState<any>([]);
  const [topic, setTopic] = useState<any>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  const [flashcardList, setFlashcardList] = useState<any>([]);

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [currentFlashcard, setCurrentFlashcard] = useState<any>(null);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessAlertOpen, setIsSuccessAlertOpen] = useState(false);
  const [isErrorAlertOpen, setIsErrorAlertOpen] = useState(false);

  const [lastVisibleDocs, setLastVisibleDocs] = useState<
    Record<number, any | null>
  >({});

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  const fetchSubjects = async () => {
    try {
      const subjects = await getSubjects();
      setSubject(subjects);

      // Select the first subject by default if there are subjects and none is selected
      if (subjects.length > 0 && !selectedSubject) {
        handleSubjectChange(subjects[0].document_id);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [selectedSubject]);

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
      console.log("Topics structure:", topics.map((t: any) => ({ id: t.document_id, name: t.name, hasDocumentId: !!t.document_id })));
      setTopic(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
      setTopic([]);
    }
  };

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
            result = await getFlashcardsByTopicId(
              selectedTopic,
              page,
              pageSize,
              lastVisibleDocs,
              value
            );
          } else {
            result = await getFlashcardsBySubjectId(
              selectedSubject,
              page,
              pageSize,
              lastVisibleDocs,
              value
            );
          }

          setFlashcardList(result.data);

          setPagination({
            page,
            pageSize,
            total: result.total,
          });

          setLastVisibleDocs((prev) => ({
            ...prev,
            [page]: result.lastVisible,
          }));
        } catch (error) {
          console.error("Error searching flashcards:", error);
        } finally {
          setLoading(false);
        }
      }, 500),
    [selectedSubject, selectedTopic, lastVisibleDocs, pagination.pageSize]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const fetchFlashcards = async (
    page = pagination.page,
    pageSize = pagination.pageSize,
    lastVisible = lastVisibleDocs
  ) => {
    try {
      setLoading(true);
      if (selectedSubject && selectedTopic) {
        const flashcards: any = await getFlashcardsByTopicId(
          selectedTopic,
          page,
          pageSize,
          lastVisible
        );
        setFlashcardList(flashcards.data);
        setPagination((prev) => ({
          ...prev,
          total: flashcards.total,
          page: flashcards.page,
          pageSize: flashcards.pageSize,
        }));
        setLastVisibleDocs((prev) => ({
          ...prev,
          [page]: flashcards.lastVisible,
        }));
      } else if (selectedSubject) {
        const flashcards: any = await getFlashcardsBySubjectId(
          selectedSubject,
          page,
          pageSize,
          lastVisible
        );
        setFlashcardList(flashcards.data);
        setPagination((prev) => ({
          ...prev,
          total: flashcards.total,
          page: flashcards.page,
          pageSize: flashcards.pageSize,
        }));
        setLastVisibleDocs((prev) => ({
          ...prev,
          [page]: flashcards.lastVisible,
        }));
      } else {
        console.log("No flashcards found");
        setFlashcardList([]);
        setPagination((prev) => ({
          ...prev,
          total: 0,
          page: 1,
          pageSize: 10,
        }));
        setLastVisibleDocs({});
        return;
      }
    } catch (error) {
      console.error("Error fetching flashcards:", error);
    } finally {
      setLoading(false);
    }
  };

  console.log(flashcardList, "this is flashcardList");

  useEffect(() => {
    fetchFlashcards();
  }, [selectedSubject, selectedTopic]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Handle subject change
  const handleSubjectChange = (subjectId: string) => {
    setPagination({
      page: 1,
      pageSize: 10,
      total: 0,
    });
    setLastVisibleDocs({});
    setSelectedSubject(subjectId);
    setSelectedTopic(null);
  };

  // Handle topic change
  const handleTopicChange = (topicId: string) => {
    setSelectedTopic(topicId);
  };

  // Handle add flashcard
  const handleAddFlashcard = async (values: any) => {
    try {
      setLoading(true);
      const response = await addFlashcard({
        subject_id: values.subject,
        topic_id: values.topic,
        note_id: values.note,
        question_title: values.questionTitle || "",
        question: values.question,
        answer_title: values.answerTitle || "",
        answer: values.answer,
        tag: values.tag || "",
        order: 1,
        is_active: true,
      });

      console.log(response, "this is response");
      setSuccessMessage("Flashcard added successfully.");
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsErrorAlertOpen(false);
      setIsAddModalVisible(false);
    } catch (error) {
      console.error("Error adding flashcard:", error);
      const message =
        error instanceof Error ? error.message : "Failed to add flashcard.";
      setErrorMessage(message);
      setSuccessMessage(null);
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
    } finally {
      setLoading(false);
    }

    fetchFlashcards(pagination.page, pagination.pageSize);
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    setPagination((prev) => ({
      ...prev,
      page,
      ...(pageSize && { pageSize }),
    }));
    fetchFlashcards(page, pageSize);
  };

  const handleViewClick = (flashcard: any) => {
    console.log("Viewing flashcard:", flashcard);
  };

  // Handle edit flashcard
  const handleEditFlashcard = async (values: any) => {
    console.log("Updating flashcard:", values);

    try {
      setLoading(true);
      const response = await updateFlashcard(values.id, values);
      console.log(response, "this is response");
      setSuccessMessage("Flashcard updated successfully.");
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsErrorAlertOpen(false);
      setIsEditModalVisible(false);
    } catch (error) {
      console.error("Error updating flashcard:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update flashcard.";
      setErrorMessage(message);
      setSuccessMessage(null);
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
    } finally {
      setLoading(false);
    }

    fetchFlashcards(pagination.page, pagination.pageSize);
    setCurrentFlashcard(null);
  };

  const handleUploadFlashcard = async (values: any) => {
    if (!values?.file) {
      setErrorMessage("Please provide an Excel file to upload.");
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
      return;
    }

    try {
      setLoading(true);
      const { successCount, totalCount, skippedCount } =
        await uploadFlashcardsFromExcel(values.file, {
          subjectId: values.subject,
          topicId: values.topic,
        });

      setSuccessMessage(
        `Flashcard upload completed. Imported ${successCount} of ${totalCount} records (skipped ${skippedCount}).`
      );
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsErrorAlertOpen(false);
      setIsUploadModalVisible(false);
      fetchFlashcards(pagination.page, pagination.pageSize);
    } catch (error) {
      console.error("Error uploading flashcards:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to upload flashcards from Excel.";
      setErrorMessage(message);
      setSuccessMessage(null);
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handle delete flashcard
  const handleDeleteFlashcard = async () => {
    console.log("Deleting flashcard:", currentFlashcard?.id);

    try {
      setLoading(true);
      const response = await deleteFlashcard(currentFlashcard?.id);
      console.log(response, "this is response");
      setSuccessMessage("Flashcard deleted successfully.");
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsErrorAlertOpen(false);
      setIsDeleteModalVisible(false);
    } catch (error) {
      console.error("Error deleting flashcard:", error);
      const message =
        error instanceof Error ? error.message : "Failed to delete flashcard.";
      setErrorMessage(message);
      setSuccessMessage(null);
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
    } finally {
      setLoading(false);
    }

    fetchFlashcards(pagination.page, pagination.pageSize);
    setCurrentFlashcard(null);
  };

  // Handle edit button click
  const handleEditClick = (flashcard: any) => {
    setCurrentFlashcard(flashcard);
    setIsEditModalVisible(true);
  };

  // Handle delete button click
  const handleDeleteClick = (flashcard: any) => {
    setCurrentFlashcard(flashcard);
    setIsDeleteModalVisible(true);
  };

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
    <div
      className={`flex flex-col px-6 py-4 bg-[#F5F6F7] h-full ${worksans.className}`}
    >
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
        <div className="flex justify-between w-full items-center">
          <div
            className={`text-[#1E4640] ${worksans.className} font-semibold text-2xl`}
          >
            Flashcard Management
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
              placeholder="Search For FlashCards"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                debouncedSearch(e.target.value);
              }}
            />
          </div>
        </div>
      </div>
      <div
        className={`h-[88%] w-full flex flex-col bg-white rounded-3xl overflow-hidden ${worksans.className}`}
      >
        <div className="h-[14%] w-full flex-shrink-0 px-5 py-4">
          <div className="h-full w-full flex justify-between items-center">
            <div className="flex gap-4">
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
                  items: topic.map((item: any) => {
                    console.log("Mapping topic item:", item);
                    return {
                      key: item.document_id,
                      label: item.title || item.name || "Untitled Topic",
                    };
                  }),
                  selectable: true,
                  disabled: !selectedSubject,
                  onSelect: (e) => {
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
                <Image
                  src="/images/plus.svg"
                  width={20}
                  height={20}
                  alt="plus"
                />
                <button
                  className="text-[#1E4640] font-medium"
                  onClick={() => setIsAddModalVisible(true)}
                >
                  Add Flashcard
                </button>
              </div>
              <button
                className="bg-[#1E4640] font-medium shadow-[0px_0px_4px_0px_#1E464040] hover:shadow-[0px_2px_8px_0px_#1E464060] px-6 cursor-pointer text-white rounded-xl items-center justify-center flex transition-all duration-300 hover:-translate-y-0.2"
                onClick={() => setIsUploadModalVisible(true)}
              >
                Upload via CSV
              </button>
            </div>
          </div>
        </div>
        <div className="h-full flex-1 min-h-0 w-full flex bg-white px-4">
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
            (flashcardList.length > 0 ? (
              <div className="w-full mt-4 h-full min-h-0 pb-2">
                <FlashCardList
                  flashcards={flashcardList}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  onView={handleViewClick}
                  loading={loading}
                  pagination={pagination}
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
                  No Flashcards Found!
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add Flashcard Modal */}
      <AddFlashCardModal
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onSave={handleAddFlashcard}
        subjects={subject}
        topics={topic}
        defaultSubject={selectedSubject}
        defaultTopic={selectedTopic}
        loading={loading}
      />

      <UploadFlashCardModal
        visible={isUploadModalVisible}
        onCancel={() => setIsUploadModalVisible(false)}
        onSave={handleUploadFlashcard}
        subjects={subject}
        topics={topic}
        defaultSubject={selectedSubject}
        defaultTopic={selectedTopic}
        loading={loading}
      />

      {/* Edit Flashcard Modal */}
      {currentFlashcard && (
        <EditFlashCardModal
          visible={isEditModalVisible}
          onCancel={() => {
            setIsEditModalVisible(false);
            setCurrentFlashcard(null);
          }}
          onSave={handleEditFlashcard}
          flashcard={currentFlashcard}
          subjects={subject}
          topics={topic}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteFlashCardModal
        visible={isDeleteModalVisible}
        onCancel={() => {
          setIsDeleteModalVisible(false);
          setCurrentFlashcard(null);
        }}
        onConfirm={handleDeleteFlashcard}
      />
    </div>
  );
};

export default ManageFlashcards;
