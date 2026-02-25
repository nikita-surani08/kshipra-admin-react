"use client";

import { Work_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Logout from "./logout";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"] });

const menu = [
  {
    name: "Notes Management",
    path: "/admin/notes-management",
    icon: "/images/notes.svg",
  },
  {
    name: "Flashcard Management",
    path: "/admin/flashcard-management",
    icon: "/images/flashcards.svg",
  },
  {
    name: "Mentor Management",
    path: "/admin/mentor",
    icon: "/images/mentor.svg",
  },
  {
    name: "Live Session",
    path: "/admin/live-session",
    icon: "/images/live-session.svg",
  },
  {
    name: "Past Session",
    path: "/admin/past-session",
    icon: "/images/past-session.svg",
  },
  {
    name: "List of Bookings",
    path: "/admin/list-of-bookings",
    icon: "/images/bookings.svg",
  },
];

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  return (
    <div
      className={`w-full h-full bg-[#F5F5F5] flex flex-col justify-between ${worksans.className}`}
    >
      <div>
        <div className="p-6">
          <object
            data="/images/kshipra-logo.svg"
            type="image/svg+xml"
            className="image-logo"
          />
        </div>

        <div className="flex flex-col gap-8 px-6 my-4">
          {menu.map((item) => {
            const isActive = pathname === item.path;

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex gap-6 items-center cursor-pointer ${
                  isActive ? "text-black" : "text-[#758382] hover:text-black"
                }`}
              >
                <Image
                  src={item.icon}
                  alt={item.name}
                  width={20}
                  height={20}
                  className={`${isActive ? "brightness-0" : ""}`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col py-7 items-center font-semibold">
        <button
          type="button"
          className="flex gap-2 items-center cursor-pointer text-start"
          onClick={() => setIsLogoutModalVisible(true)}
        >
          <Image src="/images/logout.svg" alt="Logout" width={16} height={16} />
          <span className="text-[#D32F2F] text-lg">Logout</span>
        </button>
      </div>

      <Logout
        visible={isLogoutModalVisible}
        loading={isLoggingOut}
        onCancel={() => {
          if (isLoggingOut) return;
          setIsLogoutModalVisible(false);
        }}
        onConfirm={async () => {
          try {
            setIsLoggingOut(true);
            localStorage.clear();
            router.replace("/login");
          } finally {
            setIsLoggingOut(false);
            setIsLogoutModalVisible(false);
          }
        }}
      />
    </div>
  );
};

export default Sidebar;
