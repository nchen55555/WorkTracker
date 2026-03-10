import { AddTaskInput } from "@/components/tasks/AddTaskInput";
import { MeetingGroup } from "./MeetingGroup";
import { SelectionToolbar } from "@/components/shared/SelectionToolbar";
import { useViewStore } from "@/stores/viewStore";
import { useModalStore } from "@/stores/modalStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useMeetings, useCreateMeeting, useDeleteMultipleMeetings } from "@/hooks/useMeetings";
import { useCategories } from "@/hooks/useCategories";
import type { Meeting } from "@/types";

const categoryColorMap: Record<string, string> = {
  // New 10-color palette
  yellow: "#FFDE59",
  orange: "#FFB366",
  coral: "#F5A88E",
  pink: "#F5A8D0",
  purple: "#C4A8F5",
  blue: "#A8C8F5",
  teal: "#A8E6E6",
  green: "#A8E6B4",
  lime: "#D4E6A8",
  gray: "#C8C8C8",
  // Legacy colors
  development: "#FFDE59",
  collaboration: "#FFB366",
  client: "#F5A88E",
};

function getCategoryColor(colorName: string): string {
  return categoryColorMap[colorName] || "#9E9E9E";
}

export function MeetingList() {
  const { collapsedCategories, toggleCategoryCollapse } = useViewStore();
  const { openEditMeetingModal } = useModalStore();
  const { data: meetings = [], isLoading: meetingsLoading } = useMeetings();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories("meeting");
  const createMeeting = useCreateMeeting();
  const deleteMultipleMeetings = useDeleteMultipleMeetings();

  const {
    isSelectionMode,
    activeSelectionType,
    selectedMeetingIds,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useSelectionStore();

  const isMeetingSelectionActive = isSelectionMode && activeSelectionType === "meetings";

  const handleAddMeeting = (title: string, categoryId?: string) => {
    createMeeting.mutate({ title, categoryId });
  };

  const handleMeetingClick = (meeting: Meeting) => {
    openEditMeetingModal(meeting);
  };

  const handleToggleSelect = (id: string) => {
    toggleSelection("meetings", id);
  };

  const handleSelectAll = () => {
    selectAll("meetings", activeMeetings.map((m) => m.id));
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedMeetingIds);
    deleteMultipleMeetings.mutate(ids, {
      onSuccess: () => {
        exitSelectionMode();
      },
    });
  };

  const handleEnterSelectionMode = () => {
    enterSelectionMode("meetings");
  };

  if (meetingsLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary">
        Loading...
      </div>
    );
  }

  // Filter out archived meetings and past meetings
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeMeetings = meetings.filter((meeting) => {
    if (meeting.isArchived) return false;

    // Filter out meetings from past days
    if (meeting.scheduledDate) {
      const meetingDate = new Date(meeting.scheduledDate);
      meetingDate.setHours(0, 0, 0, 0);
      if (meetingDate < today) return false;
    }

    return true;
  });

  // Group meetings by category
  const categoryIds = new Set(categories.map((c) => c.id));

  const meetingsByCategory = categories.map((category) => ({
    category,
    meetings: activeMeetings.filter((meeting) => meeting.categoryId === category.id),
  }));

  // Find meetings without a category (uncategorized)
  const uncategorizedMeetings = activeMeetings.filter(
    (meeting) => !meeting.categoryId || !categoryIds.has(meeting.categoryId)
  );

  return (
    <div className="flex flex-col gap-4 h-full relative pb-20">
      <AddTaskInput
        onAdd={handleAddMeeting}
        placeholder="Schedule new meeting..."
        disabled={createMeeting.isPending}
        onEnterSelectionMode={handleEnterSelectionMode}
        isSelectionMode={isMeetingSelectionActive}
        categories={categories}
        defaultCategoryId={categories[0]?.id}
      />

      <div className="mt-2 flex-1 overflow-y-auto">
        {/* Meetings grouped by category */}
        {meetingsByCategory
          .filter(({ meetings }) => meetings.length > 0)
          .map(({ category, meetings }) => (
            <MeetingGroup
              key={category.id}
              calendarId={category.id}
              calendarName={category.name}
              calendarColor={getCategoryColor(category.color)}
              meetings={meetings}
              isCollapsed={collapsedCategories.has(category.id)}
              onToggle={() => toggleCategoryCollapse(category.id)}
              onMeetingClick={handleMeetingClick}
              isSelectionMode={isMeetingSelectionActive}
              selectedIds={selectedMeetingIds}
              onToggleSelect={handleToggleSelect}
            />
          ))}

        {/* Uncategorized meetings */}
        {uncategorizedMeetings.length > 0 && (
          <MeetingGroup
            calendarId="uncategorized"
            calendarName="Other"
            calendarColor="#9E9E9E"
            meetings={uncategorizedMeetings}
            isCollapsed={collapsedCategories.has("uncategorized")}
            onToggle={() => toggleCategoryCollapse("uncategorized")}
            onMeetingClick={handleMeetingClick}
            isSelectionMode={isMeetingSelectionActive}
            selectedIds={selectedMeetingIds}
            onToggleSelect={handleToggleSelect}
          />
        )}

        {activeMeetings.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            No meetings yet. Schedule one above!
          </div>
        )}
      </div>

      {isMeetingSelectionActive && (
        <SelectionToolbar
          selectedCount={selectedMeetingIds.size}
          totalCount={activeMeetings.length}
          onSelectAll={handleSelectAll}
          onClearSelection={() => clearSelection("meetings")}
          onDelete={handleDeleteSelected}
          onCancel={exitSelectionMode}
          isDeleting={deleteMultipleMeetings.isPending}
          accentColor="#3B82F6"
        />
      )}
    </div>
  );
}
