import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, Button, Col, Row, Spin } from "antd";
import { Work_Sans } from "next/font/google";
import { getTopics } from "@/service/api/config.api";
import { getNotesByTopicId } from "@/service/api/notes.api";

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  created_at: string;
  document_id: string;
  is_active: boolean;
  order: number;
  subject_id: string;
  title: string;
  total_flashcards: number;
  total_notes: number;
  updated_at: string;
}

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

interface AddFlashCardModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (values: any) => void;
  subjects: Subject[];
  topics: Topic[];
  defaultSubject?: string | null;
  defaultTopic?: string | null;
  loading?: boolean;
}

const AddFlashCardModal: React.FC<AddFlashCardModalProps> = ({
  visible,
  onCancel,
  onSave,
  subjects,
  topics,
  defaultSubject = null,
  defaultTopic = null,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [topic, setTopic] = useState<any>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [loadingDropdown, setLoadingDropdown] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    lastVisible: null as any,
  });
  const [options, setOptions] = useState<any[]>([]);
  const [noteOptions, setNoteOptions] = useState<any[]>([]);

  const fetchTopics = async () => {
    try {
      const topics = await getTopics(selectedSubject);

      setTopic(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
    }
  };

  const fetchNotes = async (isLoadMore = false) => {
    try {
      if (!selectedTopic) return;

      setLoadingDropdown(true);
      const { page, pageSize, lastVisible } = isLoadMore
        ? { ...pagination, page: pagination.page + 1 }
        : { ...pagination, page: 1 };

      const response = await getNotesByTopicId(
        selectedTopic,
        page,
        pageSize,
        { [page - 1]: lastVisible }
      );

      if (isLoadMore) {
        setNotes((prevNotes) => [...prevNotes, ...response.data]);
      } else {
        setNotes(response.data);
      }

      setPagination({
        page,
        pageSize,
        total: response.total,
        lastVisible: response.lastVisible,
      });
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoadingDropdown(false);
    }
  };

  // Handle scroll event for infinite loading
  const handlePopupScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { target } = e;
    const scrollElement = target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    const scrollThreshold = 50; // pixels from bottom

    if (
      !loadingDropdown &&
      pagination.page * pagination.pageSize < pagination.total &&
      scrollTop + clientHeight >= scrollHeight - scrollThreshold
    ) {
      fetchNotes(true);
    }
  };

  useEffect(() => {
    if (selectedSubject) {
      fetchTopics();
    } else {
      setTopic([]);
      setOptions([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    const topicList = (selectedSubject && topics.length > 0 ? topics : topic) || [];
    const baseOptions = topicList.map((item: any) => ({
      label: item.title,
      value: item.document_id,
      topicId: item.document_id,
    }));

    setOptions(baseOptions);
  }, [topic]);

  useEffect(() => {
    const formattedNotes = notes.map((item: any) => ({
      label: item.title,
      value: item.document_id,
    }));

    setNoteOptions(formattedNotes);
  }, [notes]);

  useEffect(() => {
    // Reset pagination when topic changes
    setPagination({
      page: 1,
      pageSize: 10,
      total: 0,
      lastVisible: null,
    });
    setNotes([]);
    setSelectedNote(null);
    form.setFieldValue("note", undefined);
    if (selectedTopic) {
      fetchNotes();
    }
  }, [selectedTopic]);

  // Reset form and clear validation errors when modal is opened
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setSelectedSubject(defaultSubject);
      setSelectedTopic(defaultTopic);
      setTopic(topics || []);
      setNotes([]);
      setSelectedNote(null);
      setPagination({
        page: 1,
        pageSize: 10,
        total: 0,
        lastVisible: null,
      });
      form.setFieldsValue({
        subject: defaultSubject ?? undefined,
        topic: defaultTopic ?? undefined,
        note: undefined,
      });
    }
  }, [visible, defaultSubject, defaultTopic, topics, form]);

  const handleSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        form.resetFields();
        onSave(values);
      })
      .catch(() => {});
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={500}
      centered
      className="rounded-lg"
    >
      <h2 className="text-[#1E4640] font-medium text-2xl">Add Flashcard</h2>

      <Form form={form} layout="vertical" className="mt-4 box-border">
        {/* SUBJECT + TOPIC ROW */}
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item
              name="subject"
              label="Subject"
              rules={[{ required: true, message: "Please select subject" }]}
              className={`font-medium text-[#1E4640] ${worksans.className}`}
            >
              <Select
                placeholder="Select Subject"
                className="h-[45px] rounded-lg font-400"
                options={subjects?.map((item: any) => ({
                  label: item.name,
                  value: item.document_id,
                }))}
                onChange={(value) => setSelectedSubject(value)}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="topic"
              label="Topic"
              rules={[{ required: true, message: "Please select topic" }]}
              className={`font-medium text-[#1E4640] ${worksans.className}`}
            >
              <Select
                placeholder="Select Topic"
                className="h-[45px] rounded-lg font-400"
                options={options}
                notFoundContent={null}
                onChange={(value) => {
                  setSelectedTopic(value);
                }}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col className="w-full">
            <Form.Item
              name="note"
              label="Note Title"
              rules={[{ required: true, message: "Enter note title" }]}
              className={`font-medium text-[#1E4640] ${worksans.className}`}
            >
              <Select
                placeholder="Select Note"
                className="h-[45px] rounded-lg font-400 w-full"
                listHeight={250}
                onPopupScroll={handlePopupScroll}
                options={noteOptions}
                notFoundContent={loadingDropdown ? <Spin size="small" /> : null}
                onChange={(value) => setSelectedNote(value)}
              />
            </Form.Item>
          </Col>
        </Row>

         <Form.Item
          name="questionTitle"
          label="Question Title"
          className={`font-medium text-[#1E4640] ${worksans.className}`}
        >
          <div className="flex gap-3">
            <Input
              placeholder="Add Question Title"
              style={{
                height: 45,
                borderRadius: 8,
                fontFamily: "Work Sans",
                fontWeight: 400,
              }}
            />
          </div>
        </Form.Item>

        <Form.Item
          name="question"
          label="Question"
          rules={[{ required: true, message: "Add Question" }]}
          className={`font-medium text-[#1E4640] ${worksans.className}`}
        >
          <div className="flex gap-3">
            <Input
              placeholder="Add Question"
              style={{
                height: 45,
                borderRadius: 8,
                fontFamily: "Work Sans",
                fontWeight: 400,
              }}
            />
          </div>
        </Form.Item>

        <Form.Item
          name="answerTitle"
          label="Answer Title"
          className={`font-medium text-[#1E4640] ${worksans.className}`}
        >
          <div className="flex gap-3">
            <Input
              placeholder="Add Answer Title"
              style={{
                height: 45,
                borderRadius: 8,
                fontFamily: "Work Sans",
                fontWeight: 400,
              }}
            />
          </div>
        </Form.Item>

        <Form.Item
          name="answer"
          label="Answer"
          rules={[{ required: true, message: "Add Answer" }]}
          className={`font-medium text-[#1E4640] ${worksans.className}`}
        >
          <div className="flex gap-3">
            <Input
              placeholder="Add Answer"
              style={{
                height: 45,
                borderRadius: 8,
                fontFamily: "Work Sans",
                fontWeight: 400,
              }}
            />
          </div>
        </Form.Item>

        <Form.Item
          name="tag"
          label="Tag"
          className={`font-medium text-[#1E4640] ${worksans.className}`}
        >
          <div className="flex gap-3">
            <Input
              placeholder="Add Tag (optional)"
              style={{
                height: 45,
                borderRadius: 8,
                fontFamily: "Work Sans",
                fontWeight: 400,
              }}
            />
          </div>
        </Form.Item>

        
        {/* FOOTER BUTTONS */}
        <div className={`flex justify-end gap-4 mt-8 ${worksans.className}`}>
          <Button
            onClick={onCancel}
            style={{
              height: 44,
              width: 120,
              borderRadius: 8,
              border: "1px solid #1E4640",
              fontFamily: "Work Sans",
              color: "#1E4640",
            }}
          >
            Cancel
          </Button>

          <Button
            type="primary"
            loading={loading}
            onClick={handleSubmit}
            style={{
              height: 44,
              width: 120,
              borderRadius: 8,
              backgroundColor: "#0B5447",
              fontFamily: "Work Sans",
            }}
          >
            Save
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default AddFlashCardModal;
