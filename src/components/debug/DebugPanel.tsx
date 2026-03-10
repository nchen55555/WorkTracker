import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useTasks } from "@/hooks/useTasks";
import { useMeetings } from "@/hooks/useMeetings";
import { useCategories } from "@/hooks/useCategories";
import { supabase, isSupabaseConfigured } from "@/services/supabase";

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { data: tasks, error: tasksError } = useTasks();
  useMeetings(); // Keep the hook active for debugging purposes
  const { data: taskCategories, error: categoriesError } = useCategories("task");

  const runDiagnostics = async () => {
    if (!supabase) {
      setTestResult("Supabase not configured");
      return;
    }

    const results: string[] = [];

    // Check auth
    const { data: { user: authUser } } = await supabase.auth.getUser();
    results.push(`Auth User: ${authUser?.id || "NOT LOGGED IN"}`);
    results.push(`Auth Email: ${authUser?.email || "N/A"}`);

    // Check profile
    if (authUser) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      results.push(`Profile: ${profile ? "EXISTS" : "MISSING"}`);
      if (profileError) results.push(`Profile Error: ${profileError.message}`);
    }

    // Check categories in DB
    const { data: dbCategories, error: catError } = await supabase
      .from("categories")
      .select("*")
      .eq("type", "task");

    results.push(`DB Categories: ${dbCategories?.length || 0}`);
    if (catError) results.push(`Categories Error: ${catError.message}`);
    if (dbCategories) {
      dbCategories.forEach(cat => {
        results.push(`  - ${cat.name} (${cat.id})`);
      });
    }

    // Check tasks in DB
    const { data: dbTasks, error: taskError } = await supabase
      .from("tasks")
      .select("*");

    results.push(`DB Tasks: ${dbTasks?.length || 0}`);
    if (taskError) results.push(`Tasks Error: ${taskError.message}`);

    // Try a test insert
    results.push("--- Test Insert ---");
    const testCategoryId = dbCategories?.[0]?.id;
    if (testCategoryId && authUser) {
      const { data: insertData, error: insertError } = await supabase
        .from("tasks")
        .insert({
          user_id: authUser.id,
          category_id: testCategoryId,
          title: "DEBUG TEST TASK",
          is_completed: false,
        })
        .select()
        .single();

      if (insertError) {
        results.push(`Insert Error: ${insertError.message}`);
        results.push(`Error Code: ${insertError.code}`);
        results.push(`Error Details: ${JSON.stringify(insertError.details)}`);
      } else {
        results.push(`Insert Success! ID: ${insertData.id}`);
        // Clean up test task
        await supabase.from("tasks").delete().eq("id", insertData.id);
        results.push("(Test task deleted)");
      }
    } else {
      results.push("Cannot test insert - no category or user");
    }

    setTestResult(results.join("\n"));
  };

  if (!isSupabaseConfigured()) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-[#1a1a1a] text-white text-xs font-mono rounded-lg shadow-lg hover:bg-[#333]"
      >
        Debug
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-[500px] max-h-[600px] overflow-auto bg-white border border-border-subtle rounded-lg shadow-xl">
          <div className="sticky top-0 bg-[#1a1a1a] text-white px-4 py-2 flex justify-between items-center">
            <span className="font-mono text-sm">Debug Panel</span>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1L11 11M1 11L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4 text-xs font-mono">
            {/* Auth State */}
            <div>
              <h3 className="font-bold text-text-primary mb-1">Auth State</h3>
              <div className="bg-[#F5F5F0] p-2 rounded">
                <div>User ID: {user?.id || "null"}</div>
                <div>Email: {user?.email || "null"}</div>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-bold text-text-primary mb-1">Task Categories (from hook)</h3>
              <div className="bg-[#F5F5F0] p-2 rounded">
                {categoriesError && <div className="text-red-600">Error: {String(categoriesError)}</div>}
                {taskCategories?.map(cat => (
                  <div key={cat.id}>• {cat.name} ({cat.id})</div>
                ))}
                {!taskCategories?.length && <div>No categories</div>}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <h3 className="font-bold text-text-primary mb-1">Tasks (from hook)</h3>
              <div className="bg-[#F5F5F0] p-2 rounded max-h-32 overflow-auto">
                {tasksError && <div className="text-red-600">Error: {String(tasksError)}</div>}
                {tasks?.map(task => (
                  <div key={task.id}>• {task.title} (cat: {task.categoryId})</div>
                ))}
                {!tasks?.length && <div>No tasks</div>}
              </div>
            </div>

            {/* Diagnostics */}
            <div>
              <button
                onClick={runDiagnostics}
                className="px-3 py-2 bg-[#FFDE59] text-[#5C4A1F] rounded font-bold hover:bg-[#FFD633]"
              >
                Run Diagnostics
              </button>
              {testResult && (
                <pre className="mt-2 bg-[#F5F5F0] p-2 rounded whitespace-pre-wrap text-[10px]">
                  {testResult}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
