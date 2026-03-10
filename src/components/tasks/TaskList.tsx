import { AddTaskInput } from "./AddTaskInput";
import { TaskGroup } from "./TaskGroup";
import { SelectionToolbar } from "../shared/SelectionToolbar";
import { useViewStore } from "@/stores/viewStore";
import { useModalStore } from "@/stores/modalStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useTasks, useCreateTask, useDeleteMultipleTasks } from "@/hooks/useTasks";
import { useCategories } from "@/hooks/useCategories";

export function TaskList() {
  const { collapsedCategories, toggleCategoryCollapse } = useViewStore();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories("task");
  const createTask = useCreateTask();
  const deleteMultipleTasks = useDeleteMultipleTasks();
  const { openCreateTaskModal } = useModalStore();

  const {
    isSelectionMode,
    activeSelectionType,
    selectedTaskIds,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useSelectionStore();

  const isTaskSelectionActive = isSelectionMode && activeSelectionType === "tasks";

  const handleQuickAdd = (title: string, categoryId?: string) => {
    createTask.mutate({ title, categoryId });
  };

  const handleToggleSelect = (id: string) => {
    toggleSelection("tasks", id);
  };

  const handleSelectAll = () => {
    selectAll("tasks", tasks.map((t) => t.id));
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedTaskIds);
    deleteMultipleTasks.mutate(ids, {
      onSuccess: () => {
        exitSelectionMode();
      },
    });
  };

  const handleEnterSelectionMode = () => {
    enterSelectionMode("tasks");
  };

  if (tasksLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary">
        Loading...
      </div>
    );
  }

  // Group tasks by category
  const tasksByCategory = categories.map((category) => ({
    category,
    tasks: tasks.filter((task) => task.categoryId === category.id),
  }));

  return (
    <div className="flex flex-col gap-4 relative pb-20">
      <AddTaskInput
        onAdd={handleQuickAdd}
        onClick={openCreateTaskModal}
        disabled={createTask.isPending}
        onEnterSelectionMode={handleEnterSelectionMode}
        isSelectionMode={isTaskSelectionActive}
        categories={categories}
        defaultCategoryId={categories[0]?.id}
      />

      <div className="mt-2">
        {tasksByCategory
          .filter(({ tasks }) => tasks.length > 0)
          .map(({ category, tasks }) => (
            <TaskGroup
              key={category.id}
              category={category}
              tasks={tasks}
              isCollapsed={collapsedCategories.has(category.id)}
              onToggle={() => toggleCategoryCollapse(category.id)}
              isSelectionMode={isTaskSelectionActive}
              selectedIds={selectedTaskIds}
              onToggleSelect={handleToggleSelect}
            />
          ))}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            No tasks yet. Add one above!
          </div>
        )}
      </div>

      {isTaskSelectionActive && (
        <SelectionToolbar
          selectedCount={selectedTaskIds.size}
          totalCount={tasks.length}
          onSelectAll={handleSelectAll}
          onClearSelection={() => clearSelection("tasks")}
          onDelete={handleDeleteSelected}
          onCancel={exitSelectionMode}
          isDeleting={deleteMultipleTasks.isPending}
          accentColor="#FFDE59"
        />
      )}
    </div>
  );
}
