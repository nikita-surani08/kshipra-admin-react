"use client";

import Image from "next/image";
import { Work_Sans } from "next/font/google";
import { useState, useEffect, useMemo } from "react";
import BookingsList, { Booking } from "./BookingsList"; // Import new list
import "./bookings.css";
import { DownloadOutlined } from "@ant-design/icons";
import SuccessAlert from "@/components/alerts/SuccessAlert";
import ErrorAlert from "@/components/alerts/ErrorAlert";

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"] });

import { getBookings } from "../../service/api/bookings.api";

const ManageBookings = () => {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalBookings, setTotalBookings] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessAlertOpen, setIsSuccessAlertOpen] = useState(false);
  const [isErrorAlertOpen, setIsErrorAlertOpen] = useState(false);

  const bookingsData = useMemo(() => {
    const startIndex = Math.max(0, (currentPage - 1) * pageSize);
    return allBookings.slice(startIndex, startIndex + pageSize);
  }, [allBookings, currentPage, pageSize]);

  useEffect(() => {
    let mounted = true;
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const res: any = await getBookings(1, 0, null, searchQuery);
        if (mounted && res?.data) {
          setAllBookings(res.data);
          setTotalBookings(res.total);
        }
      } catch (e) {
        console.error("Failed to load bookings", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchBookings();
    return () => {
      mounted = false;
    };
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalBookings / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, pageSize, totalBookings]);

  const handlePageChange = (page: number, newPageSize?: number) => {
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1);
    } else {
      setCurrentPage(page);
    }
  };

  const handleExportCSV = async () => {
    console.log("Starting CSV export...");
    setExportLoading(true);
    try {
      const res: any = await getBookings(1, 0);
      const exportRows: Booking[] = res?.data || [];
      console.log("Total bookings fetched for export:", exportRows.length);

      // Convert to CSV
      if (exportRows.length === 0) {
        console.log("No bookings data to export");
        alert("No bookings data to export");
        return;
      }

      // CSV headers
      const headers = [
        "Student Name",
        "Student Email",
        "Mentor Name",
        "Booking Date",
        "Time Slot",
        "Duration",
        "Amount",
        "Created Date",
        "Booking Status",
        "Payment Status"
      ];

      // CSV rows
      const csvRows = [
        headers.join(","),
        ...exportRows.map(booking => [
          `"${booking.studentName || ""}"`,
          `"${booking.studentEmail || ""}"`,
          `"${booking.mentorName || ""}"`,
          `"${booking.bookingDate || ""}"`,
          `"${booking.timeSlot || ""}"`,
          `"${booking.duration || ""}"`,
          `"${booking.amount || ""}"`,
          `"${booking.createdDate || ""}"`,
          `"${booking.bookingStatus || ""}"`,
          `"${booking.paymentStatus || ""}"`
        ].join(","))
      ];

      // Create and download CSV file
      const csvContent = csvRows.join("\n");
      console.log("CSV content length:", csvContent.length);
      console.log("Sample CSV content:", csvContent.substring(0, 200));
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      console.log("Blob created:", blob.size, "bytes");
      
      const url = URL.createObjectURL(blob);
      console.log("URL created:", url);
      
      const link = document.createElement("a");
      console.log("Link element created");
      
      link.setAttribute("href", url);
      link.setAttribute("download", `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.display = "none";
      document.body.appendChild(link);
      console.log("Link added to DOM");
      
      link.click();
      console.log("Link clicked - download should start");
      setSuccessMessage("Export completed successfully.");
      setErrorMessage(null);
      setIsSuccessAlertOpen(true);
      setIsErrorAlertOpen(false);
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log("Cleanup completed");
      }, 100);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      setErrorMessage("Failed to export bookings data: " + (error as Error).message);
      setSuccessMessage(null);
      setIsErrorAlertOpen(true);
      setIsSuccessAlertOpen(false);
    } finally {
      setExportLoading(false);
      console.log("Export loading state reset");
    }
  };

  const handleSuccessAlertClose = () => {
    setIsSuccessAlertOpen(false);
    setSuccessMessage(null);
  };

  const handleErrorAlertClose = () => {
    setIsErrorAlertOpen(false);
    setErrorMessage(null);
  };

  return (
    <div className={`flex flex-col px-6 py-4 bg-[#F5F6F7] h-full ${worksans.className}`}>
      {successMessage && (
        <SuccessAlert
          message={successMessage}
          open={isSuccessAlertOpen}
          onClose={handleSuccessAlertClose}
        />
      )}
      {errorMessage && (
        <ErrorAlert
          message={errorMessage}
          open={isErrorAlertOpen}
          onClose={handleErrorAlertClose}
        />
      )}
      {/* Header Section */}
      <div className="h-[12%] w-full items-center justify-center flex ">
        <div className="flex justify-between w-full items-center">
          <div className={`text-[#1E4640] ${worksans.className} font-semibold text-2xl`}>
            Booking List
          </div>
          <div className="relative rounded-xl shadow-[0px_0px_4px_0px_#1E464040]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Image src="/images/search.svg" width={16} height={16} alt="search" />
            </div>
            <input
              type="text"
              className="pl-12 p-3 rounded-xl w-[350px] text-black border-none "
              placeholder="Search For Bookings"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Box */}
      <div className={`h-[88%] w-full flex flex-col bg-white rounded-3xl overflow-hidden ${worksans.className}`}>
        {/* Total Bookings Count Area */}
        <div className="w-full flex-shrink-0 px-6 py-5 mt-3">
          <div className="flex justify-between items-center">
            <div
              className={`text-[#1E4640] ${worksans.className} font-semibold text-2xl`}
            >
              Total Bookings({totalBookings})
            </div>
            <button
              className="bg-[#1E4640] h-[50px] font-medium shadow-[0px_0px_4px_0px_#1E464040] hover:shadow-[0px_2px_8px_0px_#1E464060] px-6 cursor-pointer text-white rounded-xl items-center justify-center flex transition-all duration-300 hover:-translate-y-0.2"
              onClick={handleExportCSV}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exporting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <DownloadOutlined />
                  Export CSV
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Bookings List Table or No Content */}
        <div className="h-full flex-1 min-h-0 w-full flex bg-white px-4 pt-4 pb-6 overflow-hidden">
          {bookingsData.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <Image
                src="/images/no_content.svg"
                width={120}
                height={120}
                alt="No content available"
                priority
              />
              <div className="text-[#1E4640] font-bold text-2xl text-center mt-4">
                No Bookings Found!
              </div>
              <div className="text-[#758382] text-center mt-1 whitespace-nowrap">
                No bookings available.
              </div>
            </div>
          ) : (
            <BookingsList
              bookings={bookingsData}
              loading={loading}
              pagination={{
                page: currentPage,
                pageSize: pageSize,
                total: totalBookings
              }}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageBookings;
