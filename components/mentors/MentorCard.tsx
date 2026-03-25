import React from "react";
import { Card, Button, Typography, Dropdown, MenuProps } from "antd";
import { MoreOutlined, RightOutlined } from "@ant-design/icons";
import Image from "next/image";

const { Text } = Typography;

interface MentorCardProps {
  name: string;
  imageUrl: string;
  rank?: string[];
  expertise?: string[];
  onMenuClick?: () => void; // Deprecated but kept for compatibility if needed, though we are moving to onEdit/onDelete
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

const MentorCard: React.FC<MentorCardProps> = ({
  name,
  imageUrl,
  rank,
  expertise,
  onMenuClick,
  onEdit,
  onDelete,
  onClick,
}) => {
  const items: MenuProps["items"] = [
    {
      key: "edit",
      label: "Edit",
      onClick: (e) => {
        e.domEvent.stopPropagation();
        onEdit?.();
      },
    },
    {
      key: "delete",
      label: "Remove",
      danger: true,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        onDelete?.();
      },
    },
  ];
  return (
    <Card
      hoverable
      className="h-full overflow-hidden rounded-2xl border-none shadow-[1px_1px_4px_1px_rgba(0,0,0,0.15)]"
      styles={{ body: { padding: 0 } }}
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-b-2xl bg-gray-100">
        <Image
          src={imageUrl}
          alt={name}
          layout="fill"
          objectFit="contain"
          objectPosition="top center"
          className="rounded-t-2xl"
          priority
        />
        <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
          <Button
            type="text"
            shape="circle"
            icon={
              <MoreOutlined style={{ fontSize: "20px", color: "#1E1E1E" }} />
            }
            className="absolute top-3 right-3 bg-white border-none shadow-sm flex items-center justify-center min-w-[32px] min-h-[32px] hover:!bg-white"
            onClick={(e) => {
              e.stopPropagation();
              // onMenuClick?.(); // Optional: maintain old behavior if needed, but Dropdown handles it now
            }}
          />
        </Dropdown>
      </div>
      <div className="flex min-h-[60px] items-center justify-between bg-white px-4 py-3">
        <Text
          strong
          className="text-[#1E4640] text-[16px] leading-[20px]"
          ellipsis={{ tooltip: name }}
        >
          {name}
        </Text>
        <RightOutlined className="text-[#1E4640]" style={{ fontSize: "14px", strokeWidth: "20px" }} />
      </div>
    </Card>

  );
};

export default MentorCard;
