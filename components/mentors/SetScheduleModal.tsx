import React, { useState } from "react";
import { Modal, Switch, TimePicker, Button } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Work_Sans } from "next/font/google"; // Assuming Work Sans is used globally or passed down, but importing here for self-containment if needed or reusing styles.
import styles from "./AddMentor.module.css"; // Reusing button styles if applicable, or we can define new ones.

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
}

const initialSchedule: DaySchedule[] = [
    { day: "Monday", isOpen: true, slots: [{ start: dayjs().hour(7).minute(0), end: dayjs().hour(19).minute(0) }] },
    { day: "Tuesday", isOpen: false, slots: [{ start: dayjs().hour(7).minute(0), end: dayjs().hour(19).minute(0) }] },
    { day: "Wednesday", isOpen: false, slots: [{ start: dayjs().hour(7).minute(0), end: dayjs().hour(19).minute(0) }] },
    { day: "Thursday", isOpen: false, slots: [{ start: dayjs().hour(7).minute(0), end: dayjs().hour(19).minute(0) }] },
    { day: "Friday", isOpen: false, slots: [{ start: dayjs().hour(7).minute(0), end: dayjs().hour(19).minute(0) }] },
    { day: "Saturday", isOpen: false, slots: [{ start: dayjs().hour(7).minute(0), end: dayjs().hour(19).minute(0) }] },
    { day: "Sunday", isOpen: false, slots: [{ start: dayjs().hour(7).minute(0), end: dayjs().hour(19).minute(0) }] },
];

const SetScheduleModal: React.FC<SetScheduleModalProps> = ({ open, onCancel, onSave }) => {
    const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedule);

    const handleToggleDay = (index: number, checked: boolean) => {
        const newSchedule = [...schedule];
        newSchedule[index].isOpen = checked;
        setSchedule(newSchedule);
    };

    const handleAddSlot = (dayIndex: number) => {
        const newSchedule = [...schedule];
        // Default new slot 7am-7pm or copy previous? Let's default to 7am-7pm for now or current time.
        newSchedule[dayIndex].slots.push({
            start: dayjs().hour(7).minute(0),
            end: dayjs().hour(7).minute(0),
        });
        setSchedule(newSchedule);
    };

    const handleRemoveSlot = (dayIndex: number, slotIndex: number) => {
        const newSchedule = [...schedule];
        if (newSchedule[dayIndex].slots.length <= 1) return;
        newSchedule[dayIndex].slots.splice(slotIndex, 1);
        setSchedule(newSchedule);
    };

    const handleTimeChange = (dayIndex: number, slotIndex: number, type: 'start' | 'end', time: dayjs.Dayjs | null) => {
        if (!time) return;
        const newSchedule = [...schedule];
        newSchedule[dayIndex].slots[slotIndex][type] = time;
        setSchedule(newSchedule);
    };

    const handleSave = () => {
        const formattedSchedule = schedule
            .filter(day => day.isOpen)
            .map(day => ({
                day: day.day,
                timeSlots: day.slots.map(slot =>
                    `${slot.start.format("hh:mm A")} - ${slot.end.format("hh:mm A")}`
                )
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
                content: { borderRadius: "24px", padding: "32px" }
            }}
        >
            <h2 className="text-[#1E4640] text-3xl font-medium mb-8">Set Schedule</h2>

            <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-2">
                {schedule.map((dayItem, dayIndex) => (
                    <div key={dayItem.day} className="flex flex-row items-start gap-4">
                        {/* Toggle and Day Name */}
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

                        {/* Time Slots */}
                        <div className="flex-1 flex flex-col gap-3">
                            {dayItem.slots.map((slot, slotIndex) => (
                                <div key={slotIndex} className="flex items-center gap-3">
                                    <TimePicker
                                        value={slot.start}
                                        format="h:mm A"
                                        onChange={(time) => handleTimeChange(dayIndex, slotIndex, 'start', time)}
                                        className="w-32 h-10 border-gray-400 rounded-xl text-base"
                                        suffixIcon={null}
                                        allowClear={false}
                                        disabled={!dayItem.isOpen}
                                    />
                                    <span className="text-gray-500 font-medium">→</span>
                                    <TimePicker
                                        value={slot.end}
                                        format="h:mm A"
                                        onChange={(time) => handleTimeChange(dayIndex, slotIndex, 'end', time)}
                                        className="w-32 h-10 border-gray-400 rounded-xl text-base"
                                        suffixIcon={null}
                                        allowClear={false}
                                        disabled={!dayItem.isOpen}
                                    />

                                    <div
                                        className={`w-9 h-9 flex items-center justify-center rounded-full border border-red-200 cursor-pointer hover:bg-red-50 ml-1 ${dayItem.slots.length === 1 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                                            }`}
                                        onClick={() => handleRemoveSlot(dayIndex, slotIndex)}
                                    >
                                        <DeleteOutlined className="text-red-500" />
                                    </div>

                                    {/* Show Add button only on the first slot row, OR allow adding anywhere? Design shows it on the side. 
                      Let's put it on the first one or create a logic to line them up. 
                      Actually, usually it's next to the last one or separate. 
                      The image shows the (+) button on the first row of Monday. 
                      If multiple rows, maybe it tracks the top one? 
                      Let's just put the (+) button on the first slot for now, or next to every slot if the design implies 'add another'. 
                      Wait, the design has (+) on the first row. 
                  */}
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
