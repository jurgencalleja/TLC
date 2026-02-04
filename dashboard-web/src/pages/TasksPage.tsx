import { useEffect } from 'react';
import { TaskBoard } from '../components/task/TaskBoard';
import { TaskFilter } from '../components/task/TaskFilter';
import { TaskDetail } from '../components/task/TaskDetail';
import { useTasks } from '../hooks';
import { useUIStore } from '../stores';

export function TasksPage() {
  const {
    tasks,
    selectedTask,
    filters,
    filteredTasks,
    tasksByStatus,
    fetchTasks,
    selectTask,
    setFilter,
    clearFilters,
  } = useTasks();
  const setActiveView = useUIStore((state) => state.setActiveView);

  useEffect(() => {
    setActiveView('tasks');
    fetchTasks();
  }, [setActiveView, fetchTasks]);

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-text-primary">Tasks</h1>
            <TaskFilter
              filters={filters}
              onFilterChange={setFilter}
              onClearFilters={clearFilters}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <TaskBoard
            tasks={filteredTasks}
            tasksByStatus={tasksByStatus}
            onTaskClick={selectTask}
            selectedTaskId={selectedTask?.id}
          />
        </div>
      </div>

      {selectedTask && (
        <div className="w-96 border-l border-border">
          <TaskDetail
            task={selectedTask}
            onClose={() => selectTask(null)}
          />
        </div>
      )}
    </div>
  );
}
