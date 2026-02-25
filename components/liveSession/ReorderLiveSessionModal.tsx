"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button, Card, Typography, Space, message } from "antd";
import { DndProvider, useDrag, useDrop } from "react-dnd/dist/index.js";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DragOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import { Work_Sans } from "next/font/google";
import { LiveSession } from "@/service/api/liveSession.api";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

const { Text, Title } = Typography;

interface ReorderLiveSessionModalProps {
  visible: boolean;
  sessions: LiveSession[];
  onCancel: () => void;
  onSave: (reorderedSessions: LiveSession[]) => void;
  loading?: boolean;
}

interface DraggableSessionCardProps {
  session: LiveSession;
  index: number;
  moveSession: (dragIndex: number, hoverIndex: number) => void;
}

const DraggableSessionCard: React.FC<DraggableSessionCardProps> = ({ session, index, moveSession }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [{ isDragging }, dragRef] = useDrag({
    type: 'session-card',
    item: { type: 'session-card', id: session.id, index },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: 'session-card',
    hover: (item: { id: string; index: number }, monitor) => {
      if (!ref.current) return;
      if (!monitor.isOver({ shallow: true })) return;
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      // Get pixels to the top
      const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      // Time to actually perform the action
      moveSession(dragIndex, hoverIndex);
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  dragRef(dropRef(ref));

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.2s ease',
      }}
    >
      <Card
        size="small"
        style={{
          cursor: 'move',
          border: '1px solid #d9d9d9',
          borderRadius: '8px',
          marginBottom: '8px',
          backgroundColor: '#fafafa',
        }}
        bodyStyle={{
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div style={{ flex: 1 }}>
          <Text strong style={{ display: 'block', marginBottom: '4px' }}>
            {session.name}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {session.meeting_link ? 'Link' : 'No link'}
          </Text>
        </div>
        <DragOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
      </Card>
    </div>
  );
};

const ReorderLiveSessionModal: React.FC<ReorderLiveSessionModalProps> = ({
  visible,
  sessions,
  onCancel,
  onSave,
  loading = false,
}) => {
  const [reorderedSessions, setReorderedSessions] = useState<LiveSession[]>([]);

  useEffect(() => {
    if (visible && sessions) {
      setReorderedSessions([...sessions]);
    }
  }, [visible, sessions]);

  const moveSession = (dragIndex: number, hoverIndex: number) => {
    const dragItem = reorderedSessions[dragIndex];
    const newItems = [...reorderedSessions];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, dragItem);
    setReorderedSessions(newItems);
  };

  const handleSave = () => {
    if (reorderedSessions.length > 0) {
      onSave(reorderedSessions);
    }
  };

  const getModalTitle = () => {
    return "Reorder Live Sessions";
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DragOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
          <span className={worksans.className}>Reorder Live Sessions</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      centered={true}
      bodyStyle={{
        maxHeight: '70vh',
        overflowY: 'auto',
        padding: '20px',
      }}
      closeIcon={<CloseOutlined />}
    >
      <DndProvider backend={HTML5Backend}>
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary">
            Drag and drop sessions to reorder them. The order will be saved when you click "Save Order".
          </Text>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {reorderedSessions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#999'
            }}>
              <Text>No sessions available to reorder</Text>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {reorderedSessions.map((session, index) => (
                <DraggableSessionCard
                  key={session.id}
                  session={session}
                  index={index}
                  moveSession={moveSession}
                />
              ))}
            </div>
          )}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #f0f0f0'
        }}>
          <Button
            onClick={onCancel}
            style={{
              borderColor: '#1E4640',
              color: '#1E4640'
            }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            onClick={handleSave}
            loading={loading}
            disabled={reorderedSessions.length === 0}
            style={{
              backgroundColor: '#1E4640',
              borderColor: '#1E4640',
              color: '#ffffff'
            }}
          >
            <SaveOutlined />
            Save Order
          </Button>
        </div>
      </DndProvider>
    </Modal>
  );
};

export default ReorderLiveSessionModal;
