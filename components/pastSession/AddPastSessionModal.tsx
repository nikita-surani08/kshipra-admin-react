import React, { useRef, useState, useEffect } from "react";
import dayjs from "dayjs";
import Image from "next/image";
import { Input, Button, Form, Select, DatePicker } from "antd";
import { Work_Sans } from "next/font/google"; 
import styles from "./pastSession.module.css";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../service/config/firebase.config";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

interface AddPastSessionModalProps {
  onCancel: () => void;
  onSave?: (data: any) => void;
  initialValues?: any;
  loading?: boolean;
}

const AddPastSessionModal: React.FC<AddPastSessionModalProps> = ({ 
  onCancel, 
  onSave, 
  initialValues, 
  loading 
}) => {
  const [form] = Form.useForm();
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [sessionType, setSessionType] = useState<'free' | 'premium'>('free');
  const [bannerError, setBannerError] = useState<string>('');

  useEffect(() => {
    console.log("🟠 MODAL useEffect RUNNING");
    console.log("initialValues received:", initialValues);
    console.log("initialValues type:", typeof initialValues);
    if (initialValues) {
      console.log("initialValues keys:", Object.keys(initialValues));
    }
    
    // Map raw session data to form format
    let formValues;
    if (initialValues) {
      formValues = {
        sessionTitle: initialValues.name,
        sessionDescription: initialValues.description,
        sessionLink: initialValues.meeting_link,
        sessionType: initialValues.is_free ? 'free' : 'premium',
        dateTime: dayjs(`${initialValues.date} ${initialValues.time}`, 'YYYY-MM-DD HH:mm'),
        banner: initialValues.banner_url || ""
      };
    }
    
    form.resetFields();
    if (formValues) {
      form.setFieldsValue(formValues);
      console.log("form values after setFieldsValue:", form.getFieldsValue());
      if (formValues.banner) setBannerPreview(formValues.banner);
      if (formValues.sessionType) setSessionType(formValues.sessionType as 'free' | 'premium');
    } else {
      setBannerPreview(null);
      setBannerFile(null);
      setSessionType('free');
    }
  }, [initialValues, form]);

  const handleBannerClick = () => {
    bannerFileInputRef.current?.click();
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerPreview(URL.createObjectURL(file));
      setBannerFile(file);
      setBannerError(''); // Clear error when banner is selected
    }
  };

  const handleSubmit = async () => {
    console.log("Submit clicked");

    // Check banner validation first (custom validation)
    if (!bannerFile && !bannerPreview) {
      setBannerError('Banner is required - please upload a banner image');
    } else {
      setBannerError(''); // Clear error if banner exists
    }

    try {
      // Validate form fields (this will show form field errors)
      const values = await form.validateFields();
      console.log("Validation successful", values);

      // If banner validation failed, don't proceed
      if (!bannerFile && !bannerPreview) {
        return;
      }

      let bannerUrl = bannerPreview;

      // Upload banner to Firebase Storage if file exists
      if (bannerFile) {
        try {
          const storageRef = ref(storage, `uploads/sessions/${Date.now()}_${bannerFile.name}`);
          const snapshot = await uploadBytes(storageRef, bannerFile);
          bannerUrl = await getDownloadURL(snapshot.ref);
          console.log("Banner uploaded:", bannerUrl);
        } catch (error) {
          console.error("Error uploading banner:", error);
          // Show error but don't prevent form submission
          // You might want to show an error message to the user
        }
      }

      // Call onSave with all form data including sessionType
      onSave?.({
        ...values,
        sessionType, // Include the sessionType state
        banner: bannerUrl,
        bannerFile
      });

    } catch (errorInfo: any) {
      console.error("Validation failed or submission error:", errorInfo);
      // Validation errors will be shown by Ant Design Form
    }
  };

  return (
    <div
      className={`w-full h-[calc(100vh-115px)] flex flex-col bg-white rounded-3xl p-8 overflow-y-auto no-scrollbar ${worksans.className}`}
    >
      <Form form={form} layout="vertical" className="w-full">
        {/* Banner Upload Section */}
        <div className="mb-8">
          <div
            onClick={handleBannerClick}
            className={`w-full border-2 border-dashed ${bannerError ? 'border-red-400' : 'border-gray-400'} rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-gray-500 transition relative min-h-[200px]`}
          >
            {bannerPreview ? (
              <Image
                src={bannerPreview}
                alt="Banner Preview"
                fill
                className="object-contain rounded-2xl"
              />
            ) : (
              <>
                {/* Upload Icon */}
                <Image
                  src="/images/upload-button.svg"
                  alt="Upload Banner"
                  width={40}
                  height={40}
                  className="text-gray-500"
                />
                
                {/* Text */}
                <h3 className="text-[#1E4640] font-semibold text-lg text-center">
                  Drag and Drop Your banner here, or click to browser
                </h3>
                
                {/* Upload Button */}
                <Button
                  className={`bg-[#1E4640] text-white px-6 py-2 rounded-md font-medium ${styles.customPrimaryButton}`}
                  style={{
                    backgroundColor: '#1E4640',
                    color: 'white',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1E4640';
                    e.currentTarget.style.color = 'white';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBannerClick();
                  }}
                >
                  Upload Banner
                </Button>

                {/* Error Message - More Prominent */}
                {bannerError && (
                  <div className="text-red-600 text-lg font-semibold mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                     {bannerError}
                  </div>
                )}
              </>
            )}
            
            {/* Hidden File Input */}
            <input
              type="file"
              accept="image/*"
              ref={bannerFileInputRef}
              style={{ display: 'none' }}
              onChange={handleBannerChange}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-300 my-8"></div>

        {/* Session Configuration */}
        <div className="flex flex-col gap-6 flex-1 overflow-y-auto no-scrollbar">
          {/* Section Title */}
          <h2 className="text-[#1E4640] font-bold text-xl">
            Session Configuration
          </h2>

          {/* Session Title Field */}
          <div>
            <label className="text-gray-700 font-semibold text-sm block mb-2">
              Session Title
            </label>
            <Form.Item
              name="sessionTitle"
              className="mb-0"
            >
              <Input
                placeholder="Enter session title"
                className="p-3 rounded-xl border border-gray-300 text-base"
              />
            </Form.Item>
          </div>
          {/* Session Link Field */}
          <div>
            <label className="text-gray-700 font-semibold text-sm block mb-2">
              Session link (zoom, YouTube, etc.)
            </label>
            <Form.Item
              name="sessionLink"
              rules={[{ required: true, message: "Enter session link" }]}
              className="mb-0"
            >
              <Input
                placeholder="http://"
                prefix={<Image src="/images/Link.svg" width={16} height={16} alt="Link" />}
                className="p-3 rounded-xl border border-gray-300 text-base"
              />
            </Form.Item>
          </div>

          {/* Session Type Field */}
          <div>
            <label className="text-gray-700 font-semibold text-sm block mb-3">
              Session Type
            </label>
            <div className="flex">
              <button
                className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-all border border-[#1E4640] ${
                  sessionType === "free"
                    ? "bg-[#1E4640] text-white"
                    : " text-gray-600 hover:bg-white"
                }`}
                onClick={() => setSessionType("free")}
              >
                Free
              </button>
              <button
                className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-all border border-[#1E4640] ${
                  sessionType === "premium"
                    ? "bg-[#1E4640] text-white"
                    : " text-gray-600 hover:bg-white"
                }`}
                onClick={() => setSessionType("premium")}
              >
                Premium
              </button>
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-12 pt-8 border-t border-gray-300">
          <Button
            onClick={onCancel}
            className={`px-16 py-6 rounded-lg border-2 border-[#1E4640] text-[#1E4640] font-semibold text-base hover:bg-gray-50 ${styles.customButton}`}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            className={`px-16 py-6 rounded-lg bg-[#1E4640] text-white font-semibold text-base hover:bg-[#153a34] ${styles.customPrimaryButton}`}
            onClick={handleSubmit}
            loading={loading}
            disabled={loading}
            htmlType="button"
          >
            {initialValues ? "Update" : "Submit"}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default AddPastSessionModal;