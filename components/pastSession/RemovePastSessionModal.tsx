import { Button, Modal } from "antd";
import { Work_Sans } from "next/font/google";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

interface RemoveMentorModalProps {
  visible: boolean;
  onCancel: () => void;
  onRemove: () => void;
  loading?: boolean;
}

const RemoveLiveSessionModal: React.FC<RemoveMentorModalProps> = ({
  visible,
  onCancel,
  onRemove,
  loading,
}) => (
  <Modal
    open={visible}
    footer={null}
    onCancel={onCancel}
    centered
    width={450}
    className="custom-delete-modal"
  >
    <div className={`${worksans.className} text-center`}>
      {/* TITLE */}
      <h2 className="text-[#1E4640] font-semibold text-2xl">Delete Session</h2>

      {/* SUBTEXT */}
      <p className="text-[#667085] mt-3 text-base">
        Are you sure you want to Delete this Session.
      </p>

      {/* BUTTONS */}
      <div className="flex justify-center gap-4 mt-8">
        <Button
          onClick={onCancel}
          className={`${worksans.className}`}
          style={{
            height: 44,
            width: 200,
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
          onClick={onRemove}
          className={`${worksans.className}`}
          style={{
            height: 44,
            width: 200,
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

export default RemoveLiveSessionModal;