import React, { useEffect, useState } from "react";
import {
  Modal,
  Input,
  Upload,
  Button,
  Form,
  Row,
  Col,
  Select,
  message,
  UploadFile,
} from "antd";
import { LoadingOutlined, UploadOutlined } from "@ant-design/icons";
import { Subject, Topic } from "./types";
import { Work_Sans } from "next/font/google";
import Image from "next/image";
import { getTopics, handleUpload, createTopic } from "@/service/api/config.api";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });
const whiteLoadingIcon = <LoadingOutlined spin style={{ color: "#ffffff" }} />;

interface AddNoteModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (values: any) => void;
  loading?: boolean;
  subject: Subject[];
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({
  visible,
  onCancel,
  onSave,
  loading,
  subject,
}) => {
  const [form] = Form.useForm();
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [topic, setTopic] = useState<any>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const buttonLoading = Boolean(loading || isUploading || isSubmitting);

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
    console.log("Topic list in useEffect:", topicList);
    console.log("Search value:", searchValue);
    
    const filtered = topicList.filter((t: any) => {
      if (!t || !t.title) {
        console.warn("Invalid topic item:", t);
        return false;
      }
      return t.title.toLowerCase().includes(searchValue.toLowerCase());
    });

    console.log("Filtered topics:", filtered);

    const baseOptions = filtered.map((item: any) => ({
      label: item.title,
      value: item.document_id,
    }));

    const exactMatch = topicList.some((t: any) => {
      if (!t || !t.title) {
        return false;
      }
      return t.title.toLowerCase() === searchValue.toLowerCase();
    });

    if (searchValue && !exactMatch) {
      baseOptions.push({
        label: `Add "${searchValue}"`,
        value: `NEW:${searchValue}`,
      });
    }

    setOptions(baseOptions);
  }, [topic, searchValue]);

  // Reset form and clear validation errors when modal is opened
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setSelectedSubject(null);
      setTopic([]);
      setSearchValue("");
      setFileList([]);
      setCurrentFileUrl("");
    }
  }, [visible]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      let pdfUrl = "";
      let htmlUrl = "";

      // Handle file upload or use direct link
      if (fileList.length > 0 && fileList[0].originFileObj) {
        // If file is selected, upload it
        const file = fileList[0].originFileObj as File;
        if (!file) {
          message.error("No file selected or invalid file");
          return;
        }

        setIsUploading(true);
        try {
          console.log("Uploading file:", file);
          const uploadedUrl = await handleUpload(file, "notes");
          console.log("File uploaded successfully. URL:", uploadedUrl);

          // Determine if it's PDF or HTML based on file type or extension
          const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');
          const isHtml = file.type === "text/html" || file.name.toLowerCase().endsWith('.html');

          if (isPdf) {
            pdfUrl = uploadedUrl;
          } else if (isHtml) {
            htmlUrl = uploadedUrl;
          } else {
            message.error("Unknown file type");
            return;
          }
        } catch (error) {
          console.error("Error uploading file:", error);
          message.error("Failed to upload file. Please try again.");
          return;
        } finally {
          setIsUploading(false);
        }
      } else if (currentFileUrl) {
        // If no file but there's a direct link, use that
        const url = currentFileUrl.trim();
        
        // Try to determine if it's PDF or HTML based on URL extension
        if (url.toLowerCase().endsWith('.pdf')) {
          pdfUrl = url;
        } else if (url.toLowerCase().endsWith('.html')) {
          htmlUrl = url;
        } else {
          // If can't determine, ask user to specify or default to one
          message.error("Please specify whether this is a PDF or HTML link by including .pdf or .html in the URL");
          return;
        }
      } else {
        message.error("Please provide either a file or a link");
        return;
      }

      // Handle Topic Creation if needed
      if (values.topic && values.topic.startsWith("NEW:")) {
        const newTopicName = values.topic.substring(4);
        try {
          // Create the new topic
          const newTopic = await createTopic(values.subject, newTopicName);
          values.topic = newTopic.document_id;
          message.success(`Topic "${newTopicName}" created successfully`);
        } catch (err) {
          console.error("Error creating topic:", err);
          message.error("Failed to create new topic");
          return;
        }
      }

      // For new topics, we need to fetch the updated topic list
      if (values.topic && values.topic.startsWith("NEW:")) {
        try {
          const updatedTopics = await getTopics(values.subject);
          setTopic(updatedTopics);
        } catch (err) {
          console.error("Error fetching updated topics:", err);
        }
      }

      // Debug: Log the values before creating the note
      const formValues = form.getFieldsValue();
      console.log("Form values:", formValues);
      console.log("Creating note with values:", {
        subject: values.subject,
        subject_id: values.subject,
        topic: values.topic,
        topic_id: values.topic,
        title: values.title,
        pdf_url: pdfUrl,
        html_url: htmlUrl,
        selectedSubject: selectedSubject,
      });

      // Validate that subject_id is not undefined
      if (!values.subject && !formValues.subject) {
        console.error("Subject is undefined in both values and form:", values.subject, formValues.subject);
        message.error("Please select a subject");
        return;
      }

      // Use the form value directly to ensure we get the correct subject
      const subjectId = values.subject || formValues.subject;

      // Update values with the correct field names and save
      const updatedValues = {
        subject_id: subjectId,
        topic_id: values.topic,
        title: values.title,
        pdf_url: pdfUrl,
        html_url: htmlUrl,
        order: 1,
        is_active: true,
        total_flashcards: 0,
      };

      // Wait for the parent save so the modal stays in loading state until completion
      await onSave(updatedValues);

      // Reset form only after the save succeeds
      form.resetFields();
      setFileList([]);
      setCurrentFileUrl("");
    } catch (error: any) {
      console.error("Form submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={visible}
      footer={null}
      onCancel={onCancel}
      width={500}
      centered
      className="custom-note-modal"
    >
      <h2 className="text-[#1E4640] font-medium text-2xl">Add a single note</h2>

      <Form form={form} layout="vertical" className="mt-4">
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
                options={subject?.map((item: any) => ({
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

        {/* FILE TITLE */}
        <Form.Item
          name="title"
          label="PDF File Title"
          rules={[{ required: true, message: "Enter file title" }]}
          className={`font-medium text-[#1E4640] ${worksans.className}`}
        >
          <Input
            placeholder="Enter File Title"
            style={{
              height: 45,
              borderRadius: 8,
              fontFamily: "Work Sans",
              fontWeight: 400,
            }}
          />
        </Form.Item>

        {/* FILE UPLOAD */}
        <Form.Item
          name="file"
          label="File (PDF or HTML)"
          rules={[
            {
              validator: (_, value) => {
                if (!value && fileList.length === 0 && !currentFileUrl) {
                  return Promise.reject(
                    "Please upload a file or provide a link"
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
          className={`font-medium text-[#1E4640] ${worksans.className}`}
        >
          <div className="space-y-3">
            <Input
              placeholder="Or paste file link here (PDF or HTML)"
              style={{
                height: 45,
                borderRadius: 8,
                fontFamily: "Work Sans",
                fontWeight: 400,
              }}
              value={currentFileUrl || ""}
              onChange={(e) => {
                const value = e.target.value;
                setCurrentFileUrl(value);
                // If user starts typing, clear any selected files
                if (value) {
                  setFileList([]);
                }
              }}
            />

            <Upload.Dragger
              beforeUpload={(file) => {
                const isPdf = file.type === "application/pdf";
                const isHtml = file.type === "text/html" || file.name.toLowerCase().endsWith('.html');
                
                if (!isPdf && !isHtml) {
                  message.error("You can only upload PDF or HTML files!");
                  return Upload.LIST_IGNORE;
                }
                return false; // Prevent automatic upload
              }}
              fileList={fileList}
              onChange={({ fileList: newFileList }) => {
                // Update file list and clear any direct link when a file is selected
                setFileList(newFileList);
                if (newFileList.length > 0) {
                  setCurrentFileUrl("");
                }
              }}
              onRemove={() => {
                setFileList([]);
                return true;
              }}
              maxCount={1}
              accept=".pdf,.html,text/html"
              showUploadList={false}
              style={{
                backgroundColor: "#fafafa",
                border: "2px dashed #d9d9d9",
                borderRadius: 8,
                padding: "20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.3s",
              }}
            >
              <p className="ant-upload-drag-icon">
                <Image
                  src="/images/upload-button.svg"
                  alt="Upload File"
                  width={48}
                  height={48}
                  className="mx-auto"
                />
              </p>
              <p className="ant-upload-text" style={{ color: "#1E4640", fontWeight: 500 }}>
                Click or drag file to this area to upload
              </p>
              <p className="ant-upload-hint" style={{ color: "#758382" }}>
                Support for PDF or HTML files. File size should not exceed 10MB.
              </p>
            </Upload.Dragger>
            
            {fileList.length > 0 && (
              <div className="text-sm text-green-600 font-medium">
                ✓ Selected file: {fileList[0].name}
              </div>
            )}
          </div>
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
            loading={buttonLoading ? { icon: whiteLoadingIcon } : false}
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
            {buttonLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default AddNoteModal;
