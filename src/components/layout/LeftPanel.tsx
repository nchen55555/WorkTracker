import { useState } from "react";
import { ViewSelector } from "@/components/navigation/ViewSelector";
import { useViewStore } from "@/stores/viewStore";
import { useModalStore } from "@/stores/modalStore";
import { TaskList } from "@/components/tasks/TaskList";
import { MeetingList } from "@/components/meetings/MeetingList";
import { NoteList } from "@/components/notes/NoteList";
import { AddTaskModal } from "@/components/tasks/AddTaskModal";
import { AddMeetingModal } from "@/components/meetings/AddMeetingModal";
import { GoogleCalendarStatus } from "@/components/integrations/GoogleCalendarStatus";
import { ArchiveModal } from "@/components/archive/ArchiveModal";
import { useCreateTask, useUpdateTask, useDeleteTask, useArchiveTask, useArchivedTasks } from "@/hooks/useTasks";
import { useCreateTimeEntry } from "@/hooks/useTimeEntries";
import { useArchivedNotes } from "@/hooks/useNotes";
import { useCreateMeeting, useUpdateMeeting, useDeleteMeeting, useArchivedMeetings } from "@/hooks/useMeetings";
import type { Task, Meeting } from "@/types";

export function LeftPanel() {
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const { activeView } = useViewStore();
  const {
    isTaskModalOpen,
    taskModalMode,
    editingTask,
    taskInitialData,
    closeTaskModal,
    isMeetingModalOpen,
    meetingModalMode,
    editingMeeting,
    meetingInitialData,
    closeMeetingModal,
  } = useModalStore();

  // Get archived counts for badge
  const { data: archivedTasks = [] } = useArchivedTasks();
  const { data: archivedMeetings = [] } = useArchivedMeetings();
  const { data: archivedNotes = [] } = useArchivedNotes();
  const archivedCount = archivedTasks.length + archivedMeetings.length + archivedNotes.length;

  // Task hooks
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const archiveTask = useArchiveTask();
  const createTimeEntry = useCreateTimeEntry();

  // Meeting hooks
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();

  // Task handlers
  const handleSaveTask = async (
    taskData: Partial<Task>,
    pendingTimeBlocks?: Array<{
      scheduledDate: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
    }>
  ) => {
    console.log("[handleSaveTask] called with:", taskData, "mode:", taskModalMode, "pendingBlocks:", pendingTimeBlocks?.length ?? 0);
    if (taskModalMode === "create") {
      let taskId: string;

      if (taskData.id) {
        // Existing task selected from dropdown — use its ID, no new task needed
        taskId = taskData.id;
      } else {
        const newTask = await createTask.mutateAsync({
          title: taskData.title!,
          categoryId: taskData.categoryId,
          description: taskData.description,
          scheduledDate: taskData.scheduledDate,
        });
        taskId = newTask.id;
      }

      // Create time entries from pending blocks
      if (pendingTimeBlocks && pendingTimeBlocks.length > 0) {
        for (const block of pendingTimeBlocks) {
          await createTimeEntry.mutateAsync({
            taskId,
            scheduledDate: block.scheduledDate,
            startTime: block.startTime,
            endTime: block.endTime,
            durationMinutes: block.durationMinutes,
          });
        }
      }
    } else if (editingTask) {
      updateTask.mutate({
        id: editingTask.id,
        updates: {
          title: taskData.title,
          description: taskData.description,
          categoryId: taskData.categoryId,
          scheduledDate: taskData.scheduledDate,
        },
      });
      // Time entries for existing tasks are managed directly in the modal
      // via the "Add Time Block" button, so no auto-creation needed here.
    }
  };

  const handleDeleteTask = () => {
    if (editingTask) {
      deleteTask.mutate(editingTask.id);
      closeTaskModal();
    }
  };

  const handleMarkComplete = () => {
    if (editingTask) {
      updateTask.mutate({
        id: editingTask.id,
        updates: { isCompleted: true },
      });
      closeTaskModal();
    }
  };

  const handleArchiveTask = () => {
    if (editingTask) {
      archiveTask.mutate({ id: editingTask.id, isArchived: true });
      closeTaskModal();
    }
  };

  // Meeting handlers
  const handleSaveMeeting = (meetingData: Partial<Meeting>) => {
    if (meetingModalMode === "edit" && editingMeeting) {
      updateMeeting.mutate({
        id: editingMeeting.id,
        updates: meetingData,
        originalMeeting: editingMeeting,
      });
    } else {
      createMeeting.mutate({ title: meetingData.title || "", ...meetingData });
    }
  };

  const handleDeleteMeeting = () => {
    if (editingMeeting) {
      deleteMeeting.mutate({ id: editingMeeting.id, meeting: editingMeeting });
      closeMeetingModal();
    }
  };

  return (
    <div className="flex flex-col h-full py-6 px-8 overflow-hidden">
      <div className="flex items-center gap-2.5 mb-5">
        <img src={`${import.meta.env.BASE_URL}icon.png`} alt="The Niche" className="w-8 h-8 rounded-lg" />
        <span className="font-serif text-lg font-semibold text-[#C5A233]">The Niche</span>
      </div>
      <div className="flex items-center mb-4">
        <ViewSelector />
      </div>

      <div className="flex-1 mt-2 overflow-y-auto">
        {activeView === "dailies" && <TaskList />}
        {activeView === "meetings" && <MeetingList />}
        {activeView === "notes" && <NoteList />}
      </div>

      {/* Archive Button */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <button
          onClick={() => setIsArchiveModalOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-background-card border border-border-subtle rounded-xl hover:bg-background-hover hover:border-[#E8E0D0] transition-colors"
        >
          <div className="flex items-center justify-center w-10 h-10 bg-[#F5F5F0] rounded-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B6B5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <div className="text-base font-medium text-text-primary">Archive</div>
            <div className="text-sm text-text-muted">
              {archivedCount === 0
                ? "No archived items"
                : `${archivedCount} archived item${archivedCount !== 1 ? "s" : ""}`}
            </div>
          </div>
        </button>
      </div>

      {/* Google Calendar Status - shown on all tabs */}
      <div className="mt-3">
        <GoogleCalendarStatus />
      </div>

      {/* Task Modal - always rendered */}
      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={closeTaskModal}
        onSave={handleSaveTask}
        onDelete={taskModalMode === "edit" ? handleDeleteTask : undefined}
        onArchive={taskModalMode === "edit" ? handleArchiveTask : undefined}
        onMarkComplete={taskModalMode === "edit" ? handleMarkComplete : undefined}
        initialTask={editingTask || taskInitialData || undefined}
        mode={taskModalMode}
      />

      {/* Meeting Modal - always rendered */}
      <AddMeetingModal
        isOpen={isMeetingModalOpen}
        onClose={closeMeetingModal}
        onSave={handleSaveMeeting}
        onDelete={meetingModalMode === "edit" ? handleDeleteMeeting : undefined}
        initialMeeting={editingMeeting || meetingInitialData || undefined}
        mode={meetingModalMode}
      />

      {/* Archive Modal */}
      <ArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
      />
    </div>
  );
}
