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

  // Meeting hooks
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();

  // Task handlers
  const handleSaveTask = (taskData: Partial<Task>) => {
    if (taskModalMode === "create") {
      createTask.mutate({
        title: taskData.title!,
        categoryId: taskData.categoryId,
        description: taskData.description,
        scheduledDate: taskData.scheduledDate,
        startTime: taskData.startTime,
        endTime: taskData.endTime,
        durationMinutes: taskData.durationMinutes,
      });
    } else if (editingTask) {
      updateTask.mutate({ id: editingTask.id, updates: taskData });
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
