"use client";

import React from "react";
import { Table, Typography } from "antd";

const { Text } = Typography;

export interface Booking {
  id: string;
  studentName: string;
  studentEmail: string;
  mentorName: string;
  timeSlot: string;
  duration: string;
  amount: string;
  bookingDate: string;
  createdDate: string;
  bookingStatus: "Accepted" | "Rejected" | "Pending";
  paymentStatus: "Paid" | "Pending" | "Refund";
}

interface BookingsListProps {
  bookings: Booking[];
  loading?: boolean;
  pagination?: any;
  onPageChange?: (page: number, pageSize?: number) => void;
}

const BookingsList: React.FC<BookingsListProps> = ({
  bookings = [],
  loading,
  pagination = {
    page: 1,
    pageSize: 10,
    total: 0,
  },
  onPageChange = () => {},
}) => {
  const columns = [
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
      width: "11%",
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: "100px" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Student Email",
      dataIndex: "studentEmail",
      key: "studentEmail",
      width: "15%",
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: "150px" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Mentor Name",
      dataIndex: "mentorName",
      key: "mentorName",
      width: "12%",
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: "130px" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Booking Date",
      dataIndex: "bookingDate",
      key: "bookingDate",
      width: "10%",
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: "120px" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Time Slot",
      dataIndex: "timeSlot",
      key: "timeSlot",
      width: "14%",
      render: (text: string) => (
        <Text ellipsis style={{ whiteSpace: "nowrap", maxWidth: "170px" }}>
          {text}
        </Text>
      ),
    },
    {
      title: "Duration",
      dataIndex: "duration",
      key: "duration",
      width: "7%",
      render: (text: string) => <Text ellipsis style={{ maxWidth: "90px" }}>{text}</Text>,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: "8%",
      render: (text: string) => <Text ellipsis style={{ maxWidth: "110px" }}>{text}</Text>,
    },
    {
      title: "Booking Status",
      dataIndex: "bookingStatus",
      key: "bookingStatus",
      width: "9%",
      render: (status: string) => {
        let color = "";

        switch (status) {
          case "Accepted":
            color = "#0D8B47"; 
            break;
          case "Rejected":
            color = "#EB0000"; 
            break;
          case "Pending":
            color = "#FFA500"; 
            break;
          default:
            color = "#000000";
        }

        return <Text style={{ color, fontWeight: 500 }}>{status}</Text>;
      },
    },
    {
      title: "Payment Status",
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: "7%",
      render: (status: string) => {
        return <Text ellipsis style={{ maxWidth: "90px" }}>{status}</Text>;
      },
    },
    {
      title: "Created Date",
      dataIndex: "createdDate",
      key: "createdDate",
      width: "7%",
      render: (text: string) => (
        <Text ellipsis style={{ maxWidth: "90px" }}>
          {text}
        </Text>
      ),
    },
  ];

  return (
    <div style={{ width: "100%", height: "110%", minHeight: 0 }}>
      <Table
        columns={columns}
        dataSource={bookings}
        rowKey="id"
        loading={loading}
        className="bookings-table hide-scrollbar"
        rowClassName={() => "bookings-table-row"}
        style={{
          width: "100%",
        }}
        scroll={{
          y: "44vh",
          x: "max-content",
        }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          responsive: true,
          showTotal: (total) => `Total ${total} items`,
          onChange: onPageChange,
          onShowSizeChange: (current, pageSize) =>
            onPageChange?.(current, pageSize),
        }}
      />
    </div>
  );
};

export default BookingsList;
