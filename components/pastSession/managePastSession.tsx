"use client";

import Image from "next/image";
import { Work_Sans } from "next/font/google";
import { useEffect, useState } from "react";
import { Pagination } from "antd";
import dayjs from "dayjs";
import { DragOutlined, LeftOutlined } from "@ant-design/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PastSessionCard from "./PastSessionCard";
import AddPastSessionModal from "./AddPastSessionModal";
import RemovePastSessionModal from "./RemovePastSessionModal";
import ReorderPastSessionModal from "./ReorderPastSessionModal";
import { addSession, getSessions, updateSession, deleteSession, updateSessionOrders } from "../../service/api/pastSession.api";
import { PastSession } from "../../service/api/pastSession.api";
import SuccessAlert from "@/components/alerts/SuccessAlert";
import ErrorAlert from "@/components/alerts/ErrorAlert";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });
const ITEMS_PER_PAGE = 12;

const managePastSession = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"list" | "add">("list");
  const [selectedSession, setSelectedSession] = useState<PastSession | null>(null);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [sessionToRemove, setSessionToRemove] = useState<PastSession | null>(null);
  const [sessionList, setSessionList] = useState<PastSession[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [displaySessions, setDisplaySessions] = useState<any[]>([]);
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessAlertOpen, setIsSuccessAlertOpen] = useState(false);
  const [isErrorAlertOpen, setIsErrorAlertOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalSessionPages = Math.max(1, Math.ceil(displaySessions.length / ITEMS_PER_PAGE));
  const paginatedSessions = displaySessions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const sessionsResponse = await getSessions();
        setSessionList(sessionsResponse.data);
      } catch (error) {
        console.error("Failed to fetch past sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const currentView = searchParams.get("view");
    const sessionId = searchParams.get("sessionId");

    if (!currentView) {
      setView("list");
      setSelectedSession(null);
      return;
    }

    if (currentView === "add") {
      setView("add");
      setSelectedSession(null);
      return;
    }

    if (currentView === "edit") {
      setView("add");

      if (!sessionId) {
        setSelectedSession(null);
        return;
      }

      const matchedSession = sessionList.find((session) => session.id === sessionId) || null;
      setSelectedSession(matchedSession);
    }
  }, [searchParams, sessionList]);

  useEffect(() => {
    let filtered = sessionList;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = sessionList.filter(session => {
        return session.name?.toLowerCase().includes(query) || false;
      });
    }
    
    const mapped = filtered.map(session => {
      // Format date and time (optional now)
      let time = "Date TBD";
      if (session.date && session.time) {
        const sessionDateTime = dayjs(`${session.date} ${session.time}`, 'YYYY-MM-DD HH:mm');
        const today = dayjs();
        const tomorrow = today.add(1, 'day');
        
        let dateLabel = '';
        if (sessionDateTime.isSame(today, 'day')) {
          dateLabel = 'Today';
        } else if (sessionDateTime.isSame(tomorrow, 'day')) {
          dateLabel = 'Tomorrow';
        } else {
          dateLabel = sessionDateTime.format('MMM DD');
        }
        
        const timeLabel = sessionDateTime.format('h:mm A');
        time = `${dateLabel}, ${timeLabel}`;
      }
      
      return {
        id: session.id,
        name: session.name,
        bannerUrl: session.banner_url || "/images/dummy-banner.png",
        time,
        sessionTitle: session.name || "",
        description: session.name || "", // Using name as description since description might not exist
        sessionLink: session.meeting_link || "",
        sessionType: session.is_free ? "free" : "premium",
      };
    });
    setDisplaySessions(mapped);
  }, [sessionList, searchQuery]);

  useEffect(() => {
    if (currentPage > totalSessionPages) {
      setCurrentPage(totalSessionPages);
    }
  }, [currentPage, totalSessionPages]);

  const handleToggle = async (sessionId: string, newType: "free" | "premium") => {
    try {
      const session = sessionList.find(s => s.id === sessionId);
      if (!session) return;

      const updatedSession = { ...session, is_free: newType === "free" };
      await updateSession(sessionId, updatedSession);

      // Update local state
      setSessionList(prev => prev.map(s => 
        s.id === sessionId ? updatedSession : s
      ));
    } catch (error) {
      console.error("Failed to toggle session type:", error);
    }
  };

  const handleAddSession = async (values: any) => {
    try {
      setLoading(true);
      console.log("Session data:", values);
      
      // Map form data to API format
      const sessionData = {
        user_id: [], // Empty array as default
        is_free: values.sessionType === 'free',
        name: values.sessionTitle || "", 
        description: values.sessionDescription || "",
        meeting_link: values.sessionLink || "",
        video_url: values.video_url || "",
        banner_url: values.banner || "",
        date: values.dateTime ? values.dateTime.format('YYYY-MM-DD') : '',
        time: values.dateTime ? values.dateTime.format('HH:mm') : '',
        duration: "", // Default duration
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mentor_name: values.mentor,
      };

      let result: PastSession;
      if (selectedSession && selectedSession.id) {
        // Update existing session
        result = await updateSession(selectedSession.id, sessionData);
        // Update the session in the list
        setSessionList(prev => prev.map(session => 
          session.id === selectedSession.id ? { ...session, ...sessionData, id: selectedSession.id } : session
        ));
      } else {
        // Add new session
        result = await addSession(sessionData);
        // Add to the list
        setSessionList(prev => [...prev, result]);
      }

      console.log("Session operation successful:", result);
      setSuccessMessage(selectedSession ? "Updated successfully" : "Saved successfully");
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsErrorAlertOpen(false);
      
      setView("list");
      setSelectedSession(null);
    } catch (error) {
      console.error("Failed to save session:", error);
      setErrorMessage("Failed to save session.");
      setSuccessMessage(null);
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReorder = async (reorderedSessions: PastSession[]) => {
    try {
      setLoading(true);
      // Update the order in Firestore
      await updateSessionOrders(reorderedSessions);
      
      // Update the local state with new order
      setSessionList(reorderedSessions);
      setReorderModalVisible(false);
      
      console.log("Session order saved successfully");
      setSuccessMessage("Saved successfully");
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsErrorAlertOpen(false);
    } catch (error) {
      console.error("Failed to save session order:", error);
      setErrorMessage("Failed to save session order.");
      setSuccessMessage(null);
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReorder = () => {
    setReorderModalVisible(false);
  };

  const handleRemoveClick = (session: any) => {
    setSessionToRemove(session);
    setRemoveModalVisible(true);
  };

  const handleRemoveConfirm = async () => {
    if (sessionToRemove && sessionToRemove.id) {
      try {
        setLoading(true);
        await deleteSession(sessionToRemove.id);
        setSessionList(prev => prev.filter(session => session.id !== sessionToRemove.id));
        setRemoveModalVisible(false);
        setSessionToRemove(null);
        setSuccessMessage("Deleted successfully");
        setErrorMessage(null);
        setIsSuccessAlertOpen(true);
        setIsErrorAlertOpen(false);
      } catch (error) {
        console.error("Failed to delete session:", error);
        setErrorMessage("Failed to delete session.");
        setSuccessMessage(null);
        setIsErrorAlertOpen(true);
        setIsSuccessAlertOpen(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoveCancel = () => {
    setRemoveModalVisible(false);
    setSessionToRemove(null);
  };

  const openAddView = () => {
    router.push(`${pathname}?view=add`);
  };

  const openEditView = (sessionId: string) => {
    router.push(`${pathname}?view=edit&sessionId=${sessionId}`);
  };

  const closeFormView = () => {
    router.replace(pathname);
  };

  const handleSuccessAlertClose = () => {
    setIsSuccessAlertOpen(false);
    setSuccessMessage(null);
  };

  const handleErrorAlertClose = () => {
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
          <div className="flex items-center gap-3">
            {view === "add" && (
              <button
                type="button"
                onClick={closeFormView}
                className="flex items-center gap-2 rounded-xl border border-[#1E4640] px-4 py-2 text-[#1E4640] transition-colors hover:bg-[#F5F6F7]"
              >
                <LeftOutlined />
                <span className="font-medium">Back</span>
              </button>
            )}
            <div
              className={`text-[#1E4640] ${worksans.className} font-semibold text-2xl`}
            >
              {view === "add" ? (selectedSession ? "Edit Session" : "Create a session") : "Past Session Management"}
            </div>
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
              placeholder="Search for Session"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
            />
          </div>
        </div>
      </div>
      <div
        className={`h-[88%] w-full flex flex-col bg-white rounded-3xl overflow-hidden ${worksans.className}`}
      >
        {view === "list" && (
          <div className="h-[14%] w-full flex-shrink-0 px-5 py-4">
            <div className="h-full w-full flex justify-between items-center">
              <div
                className={`text-[#1E4640] ${worksans.className} font-semibold text-2xl`}
              >
                Total Sessions({displaySessions.length})
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
                    onClick={openAddView}
                  >
                    Add Session
                  </button>
                </div>
                <div className="shadow-[0px_0px_4px_0px_#1E464040] hover:shadow-[0px_2px_8px_0px_#1E464060] px-4 gap-2 cursor-pointer rounded-xl items-center justify-center flex bg-white transition-all duration-300 hover:-translate-y-0.2">
                  <DragOutlined className="text-[#1E4640]" />
                  <button
                    className="text-[#1E4640] font-medium"
                    onClick={() => {
                      setReorderModalVisible(true);
                    }}
                  >
                    Reorder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "list" ? (
          <div className="flex-1 w-full flex bg-white px-4 pb-4 overflow-hidden">
            <div className="w-full flex-1 overflow-y-auto p-2 no-scrollbar">
              <div className="grid grid-cols-3 gap-4 w-full min-h-full">
                {displaySessions.length === 0 ? (
                  <div className="col-span-3 flex flex-col items-center justify-center h-full min-h-[400px]">
                    <Image
                      src="/images/no_content.svg"
                      width={120}
                      height={120}
                      alt="No content available"
                      priority
                    />

                    <div className="text-[#1E4640] font-bold text-2xl text-center mt-4">
                      No Sessions Found!
                    </div>

                    <div className="text-[#758382] text-center mt-1 whitespace-nowrap">
                      Add a session to get started.
                    </div>
                  </div>
                ) : (
                  paginatedSessions.map((session, index) => (
                    <PastSessionCard
                      key={session.id || index}
                      name={session.name}
                      imageUrl={session.imageUrl}
                      bannerUrl={session.bannerUrl}
                      time={session.time}
                      sessionTitle={session.sessionTitle}
                      description={session.description}
                      sessionLink={session.sessionLink}
                      sessionType={session.sessionType}
                      onMenuClick={() => console.log("Menu clicked")}
                      onEdit={() => {
                        console.log("🟢 EDIT BUTTON CLICKED");
                        openEditView(session.id);
                      }}
                      onDelete={() => handleRemoveClick(session)}
                      onClick={() => {
                        const rawSession = sessionList.find(s => s.id === session.id) || null;
                        setSelectedSession(rawSession);
                        // setView("add");
                      }}
                      onToggle={(type) => handleToggle(session.id, type)}
                    />
                  ))
                )}
              </div>
              {displaySessions.length > ITEMS_PER_PAGE && (
                <div className="mt-6 flex justify-end">
                  <Pagination
                    current={currentPage}
                    pageSize={ITEMS_PER_PAGE}
                    total={displaySessions.length}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <AddPastSessionModal
            initialValues={selectedSession}
            onCancel={closeFormView}
            onSave={handleAddSession}
          />
        )}
      </div>
      
      {/* Remove Live Session Modal */}
      <RemovePastSessionModal
        visible={removeModalVisible}
        onCancel={handleRemoveCancel}
        onRemove={handleRemoveConfirm}
        loading={loading}
      />
      
      {/* Reorder Past Session Modal */}
      <ReorderPastSessionModal
        visible={reorderModalVisible}
        sessions={sessionList}
        onCancel={handleCancelReorder}
        onSave={handleSaveReorder}
        loading={loading}
      />
    </div>
  );
};

export default managePastSession;
