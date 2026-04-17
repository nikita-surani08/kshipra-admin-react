import React, { useEffect, useState } from "react";
import { Modal, Switch, TimePicker, Button } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Work_Sans } from "next/font/google";
import styles from "./AddMentor.module.css";

dayjs.extend(customParseFormat);

const worksans = Work_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"] });

interface TimeSlot {
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
}

interface DaySchedule {
    day: string;
    isOpen: boolean;
    slots: TimeSlot[];
}

interface SetScheduleModalProps {
    open: boolean;
    onCancel: () => void;
    onSave: (schedule: any[]) => void;
    initialSchedule?: any[];
}

const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const createDefaultTimeSlot = (): TimeSlot => ({
    start: dayjs().hour(7).minute(0),
    end: dayjs().hour(19).minute(0),
});

const parseTimeSlot = (timeSlot: string): TimeSlot | null => {
    const [startTime, endTime] = String(timeSlot).split(" - ");

    if (!startTime || !endTime) {
        return null;
    }

    const start = dayjs(startTime, "hh:mm A");
    const end = dayjs(endTime, "hh:mm A");

    if (!start.isValid() || !end.isValid()) {
        return null;
    }

    return { start, end };
};

const hydrateSchedule = (initialSchedule: any[] = []): DaySchedule[] => {
    const persistedScheduleMap = new Map(
        initialSchedule.map((day) => [day?.day, day])
    );

    return DAYS.map((day, index) => {
        const persistedDay = persistedScheduleMap.get(day);
        const parsedSlots = Array.isArray(persistedDay?.timeSlots)
            ? persistedDay.timeSlots
                .map((timeSlot: string) => parseTimeSlot(timeSlot))
                .filter((slot: TimeSlot | null): slot is TimeSlot => slot !== null)
            : [];

        return {
            day,
            isOpen: parsedSlots.length > 0 ? true : index === 0 && !persistedDay,
            slots: parsedSlots.length > 0 ? parsedSlots : [createDefaultTimeSlot()],
        };
    });
};

const SetScheduleModal: React.FC<SetScheduleModalProps> = ({ open, onCancel, onSave, initialSchedule }) => {
    const [schedule, setSchedule] = useState<DaySchedule[]>(() => hydrateSchedule(initialSchedule));

    useEffect(() => {
        if (open) {
            setSchedule(hydrateSchedule(initialSchedule));
        }
    }, [open, initialSchedule]);

    const handleToggleDay = (index: number, checked: boolean) => {
        setSchedule((currentSchedule) =>
            currentSchedule.map((day, dayIndex) =>
                dayIndex === index ? { ...day, isOpen: checked } : day
            )
        );
    };

    const handleAddSlot = (dayIndex: number) => {
        setSchedule((currentSchedule) =>
            currentSchedule.map((day, index) =>
                index === dayIndex
                    ? { ...day, slots: [...day.slots, createDefaultTimeSlot()] }
                    : day
            )
        );
    };

    const handleRemoveSlot = (dayIndex: number, slotIndex: number) => {
        setSchedule((currentSchedule) =>
            currentSchedule.map((day, index) => {
                if (index !== dayIndex || day.slots.length <= 1) {
                    return day;
                }

                return {
                    ...day,
                    slots: day.slots.filter((_, currentSlotIndex) => currentSlotIndex !== slotIndex),
                };
            })
        );
    };

    const handleTimeChange = (dayIndex: number, slotIndex: number, type: "start" | "end", time: dayjs.Dayjs | null) => {
        if (!time) return;

        setSchedule((currentSchedule) =>
            currentSchedule.map((day, index) =>
                index === dayIndex
                    ? {
                        ...day,
                        slots: day.slots.map((slot, currentSlotIndex) =>
                            currentSlotIndex === slotIndex ? { ...slot, [type]: time } : slot
                        ),
                    }
                    : day
            )
        );
    };

    const handleSave = () => {
        const formattedSchedule = schedule
            .filter((day) => day.isOpen)
            .map((day) => ({
                day: day.day,
                timeSlots: day.slots.map(
                    (slot) => `${slot.start.format("hh:mm A")} - ${slot.end.format("hh:mm A")}`
                ),
            }));

        onSave(formattedSchedule);
        onCancel();
    };

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            footer={null}
            centered
            width={700}
            className={worksans.className}
            closeIcon={null}
            styles={{
                content: { borderRadius: "24px", padding: "32px" },
            }}
        >
            <h2 className="text-[#1E4640] text-3xl font-medium mb-8">Set Schedule</h2>

            <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-2">
                {schedule.map((dayItem, dayIndex) => (
                    <div key={dayItem.day} className="flex flex-row items-start gap-4">
                        <div className="flex items-center gap-4 w-40 mt-2">
                            <Switch
                                checked={dayItem.isOpen}
                                onChange={(checked) => handleToggleDay(dayIndex, checked)}
                                className={styles.customSwitch}
                            />
                            <span className={`text-lg font-medium ${dayItem.isOpen ? "text-[#1E4640]" : "text-gray-400"}`}>
                                {dayItem.day}
                            </span>
                        </div>

                        <div className="flex-1 flex flex-col gap-3">
                            {dayItem.slots.map((slot, slotIndex) => (
                                <div key={slotIndex} className="flex items-center gap-3">
                                    <TimePicker
                                        value={slot.start}
                                        format="h:mm A"
                                        onChange={(time) => handleTimeChange(dayIndex, slotIndex, "start", time)}
                                        className="w-32 h-10 border-gray-400 rounded-xl text-base"
                                        suffixIcon={null}
                                        allowClear={false}
                                        disabled={!dayItem.isOpen}
                                    />
                                    <span className="text-gray-500 font-medium">to</span>
                                    <TimePicker
                                        value={slot.end}
                                        format="h:mm A"
                                        onChange={(time) => handleTimeChange(dayIndex, slotIndex, "end", time)}
                                        className="w-32 h-10 border-gray-400 rounded-xl text-base"
                                        suffixIcon={null}
                                        allowClear={false}
                                        disabled={!dayItem.isOpen}
                                    />

                                    <div
                                        className={`w-9 h-9 flex items-center justify-center rounded-full border border-red-200 cursor-pointer hover:bg-red-50 ml-1 ${dayItem.slots.length === 1 ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                                        onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
                                    >
                                        <DeleteOutlined className="text-red-500" />
                                    </div>

                                    {slotIndex === 0 && (
                                        <div
                                            className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 cursor-pointer hover:bg-gray-50 ml-1"
                                            onClick={() => handleAddSlot(dayIndex)}
                                        >
                                            <PlusOutlined className="text-gray-600" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4">
                <Button
                    onClick={onCancel}
                    className="px-8 py-5 rounded-xl border border-[#1E4640] text-[#1E4640] font-semibold text-base hover:!border-[#1E4640] hover:!text-[#1E4640]"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    className="px-10 py-5 rounded-xl bg-[#1E4640] text-white font-semibold text-base hover:!bg-[#163330] border-none hover:!text-[#FFFFFF]"
                >
                    Save
                </Button>
            </div>
        </Modal>
    );
};

export default SetScheduleModal;
