"use client";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Input,
  Upload,
  Button,
  Form,
  Select,
  Row,
  Col,
  message,
  UploadFile,
} from "antd";
import { LoadingOutlined, UploadOutlined } from "@ant-design/icons";
import { Work_Sans } from "next/font/google";
import { getTopics, handleUpload } from "@/service/api/config.api";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });
const whiteLoadingIcon = <LoadingOutlined spin style={{ color: "#ffffff" }} />;

interface EditNoteModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (values: any) => void;
  note: any;
  loading?: boolean;
  subjects: any[];
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({
  visible,
  onCancel,
  onSave,
  note,
  loading,
  subjects,
}) => {
  const [form] = Form.useForm();
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [topic, setTopic] = useState<any>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [noteType, setNoteType] = useState<'free' | 'premium'>('free');
  const buttonLoading = Boolean(loading || isUploading);

  useEffect(() => {
    const fetchTopicsForSubject = async () => {
      if (selectedSubject) {
        try {
          const topics = await getTopics(selectedSubject);
          setTopic(topics);
        } catch (error) {
          console.error("Error fetching topics:", error);
        }
      } else {
        setTopic([]);
      }
    };

    fetchTopicsForSubject();
  }, [selectedSubject]);

  useEffect(() => {
    if (note) {
      // First set the selected subject and topic states
      setSelectedSubject(note.subject_id);

      console.log(note.pdf_url, "[][][][]this is done");

      // Set note type from existing data
      setNoteType(note.isPremium ? 'premium' : 'free');

      // Then set form values
      form.setFieldsValue({
        subject: note.subject_id || "",
        topic: note.topic_id || "",
        title: note.title || "",
        file: note.pdf_url || note.html_url || "",
      });

      // If there's a subject, fetch its topics
      if (note.subject_id) {
        getTopics(note.subject_id).then((topics) => {
          setTopic(topics);
          // Set topic after topics are loaded
          setSelectedTopic(note.topic_id);
        });
      }
    }
  }, [note, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      let pdfUrl = note?.pdf_url || "";
      let htmlUrl = note?.html_url || "";

      // Handle file upload
      if (fileList.length > 0 && fileList[0].originFileObj) {
        setIsUploading(true);
        try {
          const fileUrl = await handleUpload(
            fileList[0].originFileObj,
            "notes"
          );
          
          // Determine if it's PDF or HTML based on file type or extension
          const file = fileList[0].originFileObj;
          const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf');
          const isHtml = file.type === "text/html" || file.name.toLowerCase().endsWith('.html');

          if (isPdf) {
            pdfUrl = fileUrl;
            htmlUrl = ""; // Clear HTML URL if uploading PDF
          } else if (isHtml) {
            htmlUrl = fileUrl;
            pdfUrl = ""; // Clear PDF URL if uploading HTML
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
      } else if (currentFileUrl && currentFileUrl !== (note?.pdf_url || note?.html_url)) {
        // Only update URL if it has changed
        const url = currentFileUrl.trim();
        if (url.toLowerCase().endsWith('.pdf')) {
          pdfUrl = url;
          htmlUrl = "";
        } else if (url.toLowerCase().endsWith('.html')) {
          htmlUrl = url;
          pdfUrl = "";
        } else {
          // Default to PDF if can't determine
          pdfUrl = url;
          htmlUrl = "";
        }
      }

      const updatedValues = {
        subject_id: values.subject,
        topic_id: values.topic,
        title: values.title,
        pdf_url: pdfUrl,
        html_url: htmlUrl,
        isPremium: noteType === 'premium',
      };

      onSave({ ...updatedValues, id: note?.document_id });
      onCancel();
    } catch (error) {
      console.error("Form validation failed:", error);
    }
  };

  const handleFileChange = (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    if (info.file) {
      // Only allow one file
      if (info.fileList.length > 1) {
        message.warning(
          "Only one file can be uploaded at a time. The previous file will be replaced."
        );
        // Keep only the last selected file
        const lastFile = info.fileList[info.fileList.length - 1];
        setFileList([lastFile]);
      } else {
        setFileList([info.file]);
      }
      // Clear the link input when a file is selected
      form.setFieldsValue({ file: "" });
      setCurrentFileUrl(null);
    }
  };

  // Set current file URL when note changes
  useEffect(() => {
    if (note?.pdf_url) {
      setCurrentFileUrl(note.pdf_url);
    } else if (note?.html_url) {
      setCurrentFileUrl(note.html_url);
    }
  }, [note]);

  return (
    <Modal
      open={visible}
      footer={null}
      onCancel={onCancel}
      width={500}
      centered
      className="custom-note-modal"
    >
      <h2 className="text-[#1E4640] font-medium text-2xl">
        Edit a single note
      </h2>

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
                options={subjects?.map((item: any) => ({
                  label: item.name,
                  value: item.document_id,
                }))}
                value={selectedSubject}
                onChange={(value) => {
                  setSelectedSubject(value);
                  setSelectedTopic(null); // Reset topic when subject changes
                  form.setFieldsValue({ topic: undefined }); // Clear the topic field
                }}
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
                loading={!topic}
                options={topic?.map((item: any) => ({
                  label: item.title,
                  value: item.document_id,
                }))}
                value={selectedTopic}
                onChange={(value) => setSelectedTopic(value)}
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

        <Form.Item
          name="isPremium"
          label="Note Type"
          className={`font-medium text-[#1E4640] ${worksans.className}`}
        >
          <div className="flex">
            <button
              type="button"
              className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-all border border-[#1E4640] ${
                noteType === "free"
                  ? "bg-[#1E4640] text-white"
                  : " text-gray-600 hover:bg-white"
              }`}
              onClick={() => setNoteType("free")}
            >
              Free
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-all border border-[#1E4640] ${
                noteType === "premium"
                  ? "bg-[#1E4640] text-white"
                  : " text-gray-600 hover:bg-white"
              }`}
              onClick={() => setNoteType("premium")}
            >
              Premium
            </button>
          </div>
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
              disabled={fileList.length > 0}
              onChange={(e) => {
                if (e.target.value) {
                  setFileList([]); // Clear file list when typing in the link
                  setCurrentFileUrl(e.target.value);
                }
              }}
              value={currentFileUrl || ""}
            />

            <Upload.Dragger
              beforeUpload={(file) => {
                const isPdf = file.type === "application/pdf";
                const isHtml = file.type === "text/html" || file.name.toLowerCase().endsWith('.html');
                
                if (!isPdf && !isHtml) {
                  message.error("You can only upload PDF or HTML files!");
                  return Upload.LIST_IGNORE;
                }
                const uploadFile: UploadFile = {
                  uid: `-${Date.now()}`,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  originFileObj: file,
                };
                handleFileChange({
                  file: uploadFile,
                  fileList: [uploadFile],
                });
                return false;
              }}
              fileList={fileList}
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
                <UploadOutlined style={{ fontSize: 48, color: "#1E4640" }} />
              </p>
              <p className="ant-upload-text" style={{ color: "#1E4640", fontWeight: 500 }}>
                Click or drag file to this area to upload
              </p>
              <p className="ant-upload-hint" style={{ color: "#758382" }}>
                Support for PDF or HTML files. File size should not exceed 10MB.
              </p>
            </Upload.Dragger>
            
            {fileList.length > 0 ? (
              <div className="text-sm text-green-600 font-medium">
                ✓ New file selected: {fileList[0].name}
              </div>
            ) : currentFileUrl ? (
              <div className="text-sm text-gray-600">
                Current file:{" "}
                <a
                  href={currentFileUrl || ""}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View file
                </a>
              </div>
            ) : null}
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

export default EditNoteModal;
