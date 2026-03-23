import React, { useState, useEffect, useMemo } from "react";
import { Modal, Form, Select, Button, Col, Row, Upload, Spin } from "antd";
import { Work_Sans } from "next/font/google";
import { getTopics, createTopic } from "@/service/api/config.api";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import Image from "next/image";

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

interface UploadFlashCardModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (values: any) => void;
  subjects: Subject[];
  topics: Topic[];
  loading?: boolean;
}

const UploadFlashCardModal: React.FC<UploadFlashCardModalProps> = ({
  visible,
  onCancel,
  onSave,
  subjects,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [topic, setTopic] = useState<any>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const buttonLoading = loading || isSubmitting;

  const fetchTopics = async () => {
    try {
      const topics = await getTopics(selectedSubject);

      setTopic(topics);
    } catch (error) {
      console.error("Error fetching topics:", error);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [selectedSubject]);

  useEffect(() => {
    const topicList = topic || [];
    const filtered = topicList.filter((t: any) =>
      (t.title || t.name || "").toLowerCase().includes(searchValue.toLowerCase())
    );

    const baseOptions = filtered.map((item: any) => ({
      label: item.title || item.name || "Untitled Topic",
      value: item.document_id,
      topicId: item.document_id,
    }));

    const exactMatch = topicList.some(
      (t: any) => (t.title || t.name || "").toLowerCase() === searchValue.toLowerCase()
    );

    if (searchValue && !exactMatch) {
      baseOptions.push({
        label: `Add "${searchValue}"`,
        value: `NEW:${searchValue}`,
        topicId: `NEW:${searchValue}`,
      });
    }

    setOptions(baseOptions);
  }, [topic, searchValue]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();

      // Handle Topic Creation if needed
      if (values.topic && values.topic.startsWith("NEW:")) {
        const newTopicName = values.topic.substring(4);
        try {
          // Create the new topic
          const newTopic = await createTopic(values.subject, newTopicName);
          values.topic = newTopic.document_id;
          console.log(`Topic "${newTopicName}" created successfully`);
        } catch (err) {
          console.error("Error creating topic:", err);
          return;
        }
      }

      const payload = {
        ...values,
        file: fileList[0]?.originFileObj || fileList[0],
      };

      await onSave(payload);
      form.resetFields();
      setFileList([]);
    } catch (error: any) {
      // Ignore Ant Design validation errors
      if (error?.errorFields) {
        return;
      }
      console.error("Error submitting upload form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadProps: UploadProps = {
    multiple: false,
    accept: ".xlsx,.xls",
    beforeUpload: (file) => {
      setFileList([file]);
      form.setFieldsValue({ file });
      return false;
    },
    onRemove: () => {
      setFileList([]);
      form.setFieldsValue({ file: undefined });
    },
    fileList,
    itemRender: () => null,
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

      <Spin spinning={buttonLoading}>
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
                placeholder="Select or Create Topic"
                className="h-[45px] rounded-lg font-400"
                showSearch
                filterOption={false}
                onSearch={setSearchValue}
                options={options}
                notFoundContent={null}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="file"
          label="Upload Excel File"
          className={`font-medium text-[#1E4640] ${worksans.className}`}
          rules={[
            {
              validator: () => {
                if (fileList.length > 0) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Please upload an Excel file (.xlsx or .xls).")
                );
              },
            },
          ]}
        >
          <Upload.Dragger {...uploadProps}>
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1E4640]/10 text-[#1E4640]">
                <Image
                  src="/images/upload-button.svg"
                  alt="Upload icon"
                  width={32}
                  height={32}
                />
              </div>
              <p className="text-[#1E4640] font-semibold text-base text-center">
                Drag and Drop Your File here, or click to browse
              </p>
              <Button
                type="primary"
                disabled={buttonLoading}
                style={{
                  backgroundColor: "#0B5447",
                  borderRadius: 8,
                  border: "none",
                  padding: "6px 24px",
                  fontFamily: "Work Sans",
                }}
              >
                Upload File
              </Button>
              {fileList.length > 0 && (
                <p className="text-[#1E4640] text-sm mt-2">
                  Selected File:{" "}
                  <span className="font-medium">{fileList[0].name}</span>
                </p>
              )}
              <p className="text-[#758382] text-xs text-center">
                Supported formats: .xlsx, .xls
              </p>
            </div>
          </Upload.Dragger>
        </Form.Item>

        {/* FOOTER BUTTONS */}
        <div className={`flex justify-end gap-4 mt-8 ${worksans.className}`}>
          <Button
            onClick={onCancel}
            disabled={buttonLoading}
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
            loading={buttonLoading}
            disabled={buttonLoading}
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
      </Spin>
    </Modal>
  );
};

export default UploadFlashCardModal;
