import React from "react";
import { Button, Dropdown, MenuProps } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import Image from "next/image";

interface LiveSessionCardProps {
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

const LiveSessionCard: React.FC<LiveSessionCardProps> = ({
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
      {/* Image Section with Overlay */}
      <div className="relative h-56 w-full">
        <Image
          src={bannerUrl || imageUrl}
          alt={sessionTitle}
          fill
          className="object-contain"
          priority
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
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
        
        {/* Overlay Text */}
        {/* <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="text-xl font-bold mb-1">{name}</h3>
          <p className="text-sm opacity-90 mb-2">{time}</p>
          <p className="text-sm font-medium">{sessionTitle}</p>
          <p className="text-xs opacity-80 mt-1 line-clamp-2">{description}</p>
        </div> */}
      </div>
      
      {/* Bottom Section */}
      <div className="p-4 space-y-3 bg-[#F5F6F7]">
        
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

export default LiveSessionCard;
