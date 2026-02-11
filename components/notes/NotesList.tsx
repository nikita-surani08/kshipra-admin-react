import React, { useState, useEffect } from "react";
import { Table, Space, Button, Tag, Typography } from "antd";
import { EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { Note } from "@/service/api/notes.api";
import { getFlashcardCountByNoteId } from "@/service/api/flashcard.api";
import "./notes.css";

const { Text } = Typography;

interface NotesListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onView: (note: Note) => void;
  loading?: boolean;
  total?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number, pageSize?: number) => void;
}

const NotesList: React.FC<NotesListProps> = ({
  notes,
  onEdit,
  onDelete,
  onView,
  loading,
  total = 0,
  currentPage = 1,
  pageSize = 10,
  onPageChange = () => {},
}) => {
  const [flashcardCounts, setFlashcardCounts] = useState<
    Record<string, number>
  >({});

  // Fetch flashcard counts for all notes
  useEffect(() => {
    const fetchFlashcardCounts = async () => {
      const counts: Record<string, number> = {};

      for (const note of notes) {
        if (note.id) {
          const count = await getFlashcardCountByNoteId(note.id);
          counts[note.id] = count;
        }
      }

      setFlashcardCounts(counts);
    };

    if (notes.length > 0) {
      fetchFlashcardCounts();
    }
  }, [notes]);

  const columns = [
    {
      title: "Note Title",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: Note) => (
        <Text ellipsis style={{ maxWidth: 200 }}>
          {text}
        </Text>
      ),
    },
    {
      title: "File",
      key: "file",
      render: (_: any, record: Note) => {
        // Check for PDF or HTML file
        const fileUrl = record.pdf_url || record.html_url;
        const fileType = record.pdf_url ? "PDF" : record.html_url ? "HTML" : null;

        // Extract filename from path (assuming format: '.../notes/filename.ext')
        const getFileNameFromUrl = (url: string) => {
          try {
            // Strip query params/hashes
            const cleanUrl = url.split(/[?#]/)[0];

            // Decode URI components
            const decoded = decodeURIComponent(cleanUrl);

            // Now split by slash and get the last part
            const parts = decoded.split("/");
            const filename = parts[parts.length - 1];

            return filename || `View ${fileType}`;
          } catch (e) {
            console.error("Error parsing filename:", e);
            return `View ${fileType}`;
          }
        };

        const displayText = fileUrl ? getFileNameFromUrl(fileUrl) : "No file";

        // If there's a file, make it a clickable link
        if (fileUrl) {
          return (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1890ff" }}
              onClick={(e) => e.stopPropagation()} // Prevent row click event
            >
              {displayText}
            </a>
          );
        }

        return (
          <Text
            style={{
              cursor: "pointer",
              color: "#1890ff",
              maxWidth: 200,
              display: "inline-block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            onClick={() => onView(record)}
            title={displayText}
          >
            {displayText}
          </Text>
        );
      },
    },
    {
      title: "FlashCards",
      key: "flashcards",
      render: (_: any, record: Note) => {
        const count = record.id ? flashcardCounts[record.id] || 0 : 0;
        return `Flashcards Link (${count})`;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Note) => (
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
    <div style={{ width: "100%" }}>
      <Table
        columns={columns}
        dataSource={notes}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
          onChange: onPageChange,
          onShowSizeChange: (current, size) => onPageChange?.(current, size),
        }}
        className="notes-table hide-scrollbar"
        rowClassName={() => "notes-table-row"}
        style={{
          width: "100%",
        }}
        scroll={{
          y: "52vh",
          x: "max-content",
        }}
      />
    </div>
  );
};

export default NotesList;
