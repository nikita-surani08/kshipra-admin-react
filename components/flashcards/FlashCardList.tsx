import React, { useMemo, useState, useEffect } from "react";
import { Button, Space, Table, Typography, Skeleton } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
// import { Flashcard } from "@/types/flashcard";
import { getNoteById } from "@/service/api/notes.api";

const { Text } = Typography;

// Custom hook to fetch and cache note titles
const useNoteTitles = (noteIds: string[]) => {
  const [noteTitles, setNoteTitles] = useState<Record<string, string>>({});
  const [loadingNotes, setLoadingNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchNoteTitles = async () => {
      const newNoteTitles: Record<string, string> = {};
      const newLoadingNotes: Record<string, boolean> = {};

      // Only process notes that haven't been loaded yet
      const notesToFetch = noteIds.filter(
        (id) => !(id in noteTitles) && !loadingNotes[id]
      );

      if (notesToFetch.length === 0) return;

      // Set loading state for all notes being fetched
      notesToFetch.forEach((id) => {
        newLoadingNotes[id] = true;
      });
      setLoadingNotes((prev) => ({ ...prev, ...newLoadingNotes }));

      try {
        // Fetch all notes in parallel
        const fetchPromises = notesToFetch.map(async (id) => {
          try {
            const note = await getNoteById(id);
            if (note) {
              newNoteTitles[id] = note.title || "Untitled Note";
            }
          } catch (error) {
            console.error(`Error fetching note ${id}:`, error);
            newNoteTitles[id] = "Error loading title";
          }
          return id;
        });

        await Promise.all(fetchPromises);

        // Update state with new note titles
        setNoteTitles((prev) => ({
          ...prev,
          ...newNoteTitles,
        }));
      } finally {
        // Clear loading states
        const updatedLoadingNotes = { ...loadingNotes };
        notesToFetch.forEach((id) => {
          delete updatedLoadingNotes[id];
        });
        setLoadingNotes(updatedLoadingNotes);
      }
    };

    fetchNoteTitles();
  }, [noteIds.join(",")]); // Only re-run when noteIds change

  return { noteTitles, loadingNotes };
};

interface Flashcard {
  id: string;
  subject_id: string;
  topic_id: string;
  note_id: string;
  question_title?: string;
  question: string;
  answer_title?: string;
  answer: string;
  category: string;
  tag?: string;
  created_at: string;
  updated_at: string;
}

interface FlashCardListProps {
  flashcards: Flashcard[];
  onEdit: (flashcard: Flashcard) => void;
  onDelete: (flashcard: Flashcard) => void;
  loading?: boolean;
  onView: (flashcard: Flashcard) => void;
  pagination?: any;
  onPageChange?: (page: number, pageSize?: number) => void;
}

const FlashCardList: React.FC<FlashCardListProps> = ({
  flashcards,
  onEdit,
  onDelete,
  loading,
  pagination,
  onPageChange = () => {},
}) => {
  // Extract unique note IDs from flashcards
  const noteIds = useMemo(() => {
    const ids = new Set<string>();
    flashcards.forEach((card) => {
      if (card.note_id) {
        ids.add(card.note_id);
      }
    });
    return Array.from(ids);
  }, [flashcards]);

  const { noteTitles, loadingNotes } = useNoteTitles(noteIds);
  const columns = [
    {
      title: "Note Title",
      dataIndex: ["note_id"],
      key: "noteTitle",
      width: "16%",
      render: (noteId: string) => {
        if (loadingNotes[noteId]) {
          return <Skeleton.Input active size="small" style={{ width: 150 }} />;
        }
        const title = noteTitles[noteId] || "Untitled Note";
        return (
          <Text ellipsis style={{ cursor: "pointer", maxWidth: "180px" }}>
            {title}
          </Text>
        );
      },
    },
    {
      title: "Question Title",
      dataIndex: "question_title",
      key: "questionTitle",
      width: "12%",
      render: (text: string) => (
        <Text ellipsis style={{ cursor: "pointer", maxWidth: "120px" }}>
          {text || "-"}
        </Text>
      ),
    },
    {
      title: "Question",
      dataIndex: "question",
      key: "question",
      width: "13%",
      render: (text: string, record: Flashcard) => (
        <Text ellipsis style={{ cursor: "pointer", maxWidth: "150px" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Answer Title",
      dataIndex: "answer_title",
      key: "answerTitle",
      width: "12%",
      render: (text: string) => (
        <Text ellipsis style={{ cursor: "pointer", maxWidth: "120px" }}>
          {text || "-"}
        </Text>
      ),
    },
    {
      title: "Answer",
      dataIndex: "answer",
      key: "answer",
      width: "13%",
      render: (text: string, record: Flashcard) => (
        <Text ellipsis style={{ cursor: "pointer", maxWidth: "150px" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Tag",
      dataIndex: "tag",
      key: "tag",
      width: "12%",
      render: (text: string) => (
        <Text
          ellipsis
          style={{
            cursor: "pointer",
            maxWidth: "120px",
            display: "block",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {text || "-"}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: "9%",
      fixed: "right" as const,
      render: (_: any, record: Flashcard) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            title="Edit"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete(record)}
            title="Delete"
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Table
        columns={columns}
        dataSource={flashcards}
        rowKey="id"
        loading={loading}
        className="notes-table hide-scrollbar"
        rowClassName={() => "notes-table-row"}
        style={{
          width: "100%",
        }}
        scroll={{
          y: "46vh",
          x: "max-content",
        }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
          onChange: onPageChange,
          onShowSizeChange: (current, pageSize) =>
            onPageChange?.(current, pageSize),
        }}
      />
    </div>
  );
};

export default FlashCardList;
