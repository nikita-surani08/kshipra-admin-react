"use client";

import Image from "next/image";
import { Work_Sans } from "next/font/google";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import PastSessionCard from "./PastSessionCard";
import AddPastSessionModal from "./AddPastSessionModal";
import RemovePastSessionModal from "./RemovePastSessionModal";
import { addSession } from "../../service/api/pastSession.api";
import { getSessions, updateSession, deleteSession } from "../../service/api/pastSession.api";
import { PastSession } from "../../service/api/pastSession.api";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

const managePastSession = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"list" | "add">("list");
  const [selectedSession, setSelectedSession] = useState<PastSession | null>(null);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [sessionToRemove, setSessionToRemove] = useState<PastSession | null>(null);
  const [sessionList, setSessionList] = useState<PastSession[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [displaySessions, setDisplaySessions] = useState<any[]>([]);

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
    let filtered = sessionList;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = sessionList.filter(session => {
        return session.name.toLowerCase().includes(query);
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
        sessionTitle: session.name,
        description: session.name, // Using name as description since description might not exist
        sessionLink: session.meeting_link,
        sessionType: session.is_free ? "free" : "premium"
      };
    });
    setDisplaySessions(mapped);
  }, [sessionList, searchQuery]);

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
      console.log("Session data:", values);
      
      // Map form data to API format
      const sessionData = {
        user_id: [], // Empty array as default
        is_free: values.sessionType === 'free',
        name: values.sessionTitle,
        meeting_link: values.sessionLink,
        video_url: values.video_url || "",
        banner_url: values.banner || "",
        date: values.dateTime ? values.dateTime.format('YYYY-MM-DD') : '',
        time: values.dateTime ? values.dateTime.format('HH:mm') : '',
        duration: "", // Default duration
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      
      setView("list");
      setSelectedSession(null);
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  };

  const handleRemoveClick = (session: any) => {
    setSessionToRemove(session);
    setRemoveModalVisible(true);
  };

  const handleRemoveConfirm = async () => {
    if (sessionToRemove && sessionToRemove.id) {
      try {
        await deleteSession(sessionToRemove.id);
        setSessionList(prev => prev.filter(session => session.id !== sessionToRemove.id));
        setRemoveModalVisible(false);
        setSessionToRemove(null);
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    }
  };

  const handleRemoveCancel = () => {
    setRemoveModalVisible(false);
    setSessionToRemove(null);
  };

  const initialValues = selectedSession ? {
    sessionTitle: selectedSession.name,
    sessionDescription: selectedSession.name, // Using name as description
    sessionLink: selectedSession.meeting_link,
    sessionType: selectedSession.is_free ? 'free' : 'premium',
    dateTime: selectedSession.date && selectedSession.time ? dayjs(`${selectedSession.date} ${selectedSession.time}`, 'YYYY-MM-DD HH:mm') : undefined,
    banner: selectedSession.banner_url || ""
  } : undefined;

  const handleEditClick = () => {
    // Just set to null to add a new session
    setSelectedSession(null);
    setView("add");
  };

  return (
    <div
      className={`flex flex-col px-6 py-4 bg-[#F5F6F7] h-full ${worksans.className}`}
    >
      <div className="h-[12%] w-full items-center justify-center flex ">
        <div className="flex justify-between w-full items-center">
          <div
            className={`text-[#1E4640] ${worksans.className} font-semibold text-2xl`}
          >
            {view === "add" ? (selectedSession ? "Edit Session" : "Create a session") : "Past Session Management"}
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
                    onClick={() => {
                      setSelectedSession(null);
                      setView("add");
                    }}
                  >
                    Add Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "list" ? (
          <div className="h-full flex-1 w-full flex bg-white px-4 pb-4">
            <div className="w-full max-h-[500px] overflow-y-auto p-2 no-scrollbar">
              <div className="grid grid-cols-3 gap-4 w-full">
                {displaySessions.length === 0 ? (
                  <div className="col-span-3 flex flex-col items-center justify-center h-full">
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
                  displaySessions.map((session, index) => (
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
                        const rawSession = sessionList.find(s => s.id === session.id) || null;
                        setSelectedSession(rawSession);
                        setView("add");
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
            </div>
          </div>
        ) : (
          <AddPastSessionModal
            initialValues={selectedSession}
            onCancel={() => {
              setView("list");
              setSelectedSession(null);
            }}
            onSave={handleAddSession}
            loading={loading}
          />
        )}
      </div>
      
      {/* Remove Live Session Modal */}
      <RemovePastSessionModal
        visible={removeModalVisible}
        onCancel={handleRemoveCancel}
        onRemove={handleRemoveConfirm}
        loading={false}
      />
    </div>
  );
};

export default managePastSession;
