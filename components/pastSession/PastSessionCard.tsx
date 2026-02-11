import React from "react";
import { Button, Dropdown, MenuProps } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import Image from "next/image";

interface PastSessionCardProps {
  name: string;
  imageUrl: string;
  bannerUrl?: string;
  time?: string;
  sessionTitle?: string;
  description?: string;
  sessionLink?: string;
  sessionType?: "free" | "premium";
  onMenuClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  onToggle?: (type: "free" | "premium") => void;
}

const PastSessionCard: React.FC<PastSessionCardProps> = ({
  name,
  imageUrl,
  bannerUrl,
  time = "Today, 3:00 PM",
  sessionTitle = "Live Class: AI Researcher 🤖",
  description = "Unlock the secret of integration with expert guidance",
  sessionLink = "https://meet.google.com/abc-defg-hij",
  sessionType = "free",
  onMenuClick,
  onEdit,
  onDelete,
  onClick,
  onToggle,
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
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl"
      onClick={onClick}
    >
      {/* Image Section */}
      <div className="relative h-52 w-full">
        <Image
          src={bannerUrl || imageUrl}
          alt={sessionTitle}
          fill
          className="object-contain"
          priority
        />
        
        {/* Menu Button */}
        <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
          <Button
            type="text"
            shape="circle"
            icon={<MoreOutlined className="text-black" />}
            className="absolute top-3 right-3"
            style={{
              backgroundColor: 'white',
              borderColor: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = 'white';
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        </Dropdown>
      </div>
      
      {/* Bottom Section */}
      <div className="p-3 space-y-3 bg-[#F5F6F7]">
        {/* Session Title */}
        <div>
          <h3 className="text-lg font-bold text-[#1E4640] mb-1">{sessionTitle}</h3>
        </div>
        
        {/* Session Link */}
        <div>
          <p className="text-base font-semibold text-[#1E4640] mb-1">Session link</p>
          <p className="text-sm text-blue-600 truncate">{sessionLink}</p>
        </div>
        
        {/* Session Type */}
        <div>
          <p className="text-base font-semibold text-[#1E4640] mb-1">Session Type</p>
          <div className="flex">
            <button
              className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-all border border-[#1E4640] ${
                sessionType === "free"
                  ? "bg-[#1E4640] text-white"
                  : " text-gray-600 hover:bg-gray-300"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle?.("free");
              }}
            >
              Free
            </button>
            <button
              className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-all border border-[#1E4640] ${
                sessionType === "premium"
                  ? "bg-[#1E4640] text-white"
                  : " text-gray-600 hover:bg-gray-300"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle?.("premium");
              }}
            >
              Premium
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PastSessionCard;
