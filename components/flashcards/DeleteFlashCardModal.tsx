import React from "react";
import { Modal, Button } from "antd";
import { Work_Sans } from "next/font/google";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

interface DeleteFlashCardModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  count?: number;
}

const DeleteFlashCardModal: React.FC<DeleteFlashCardModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  loading,
  count = 1,
}) => {
  return (
    <Modal
      open={visible}
      footer={null}
      onCancel={onCancel}
      centered
      width={500}
      className="custom-delete-modal"
    >
      <div className={`${worksans.className} text-center`}>
        {/* TITLE */}
        <h2 className="text-[#1E4640] font-semibold text-2xl">
          {count > 1 ? "Delete Flashcards" : "Delete Flashcard"}
        </h2>

        {/* SUBTEXT */}
        <p className="text-[#667085] mt-3 text-base">
          Are you sure you want to delete {count > 1 ? "these flashcards" : "this flashcard"}?
        </p>

        {/* BUTTONS */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            onClick={onCancel}
            className={`${worksans.className}`}
            style={{
              height: 44,
              width: 150,
              borderRadius: 12,
              border: "1px solid #1E4640",
              fontWeight: 500,
              color: "#1E4640",
              fontFamily: "Work Sans",
              fontSize: 16,
            }}
          >
            Cancel
          </Button>

          <Button
            type="primary"
            loading={loading}
            onClick={onConfirm}
            className={`${worksans.className}`}
            style={{
              height: 44,
              width: 150,
              borderRadius: 12,
              backgroundColor: "#0B5447",
              fontWeight: 500,
              fontFamily: "Work Sans",
              fontSize: 16,
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteFlashCardModal;
