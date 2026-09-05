import React, { useState } from "react";

/**
 * 🎯 MODULE 5 PRACTICAL ASSESSMENT: Interactive Task Manager & State Engine
 * =========================================================================
 * Pintu Kelulusan Module 5 (React Fundamentals)
 * 
 * Kriteria Kelulusan:
 * 1. Functional component dengan TypeScript interface yang ketat.
 * 2. Mengelola state array of objects secara immutable (tambah, toggle selesai, hapus).
 * 3. Controlled form input dengan validasi string kosong dan e.preventDefault().
 * 4. Derived state untuk kalkulasi persentase penyelesaian tugas tanpa state duplikat.
 */

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

export const TaskManagerApp: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Kuasai TypeScript Interface", isCompleted: true, priority: "HIGH" },
    { id: "2", title: "Bangun Komponen React Deklaratif", isCompleted: true, priority: "HIGH" },
    { id: "3", title: "Lulus Gate Level 1", isCompleted: false, priority: "MEDIUM" },
  ]);

  const [inputTitle, setInputTitle] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

  // Handler: Tambah tugas baru (Immutable)
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: inputTitle.trim(),
      isCompleted: false,
      priority: selectedPriority,
    };

    setTasks(prev => [newTask, ...prev]);
    setInputTitle("");
  };

  // Handler: Toggle status selesai (Immutable dengan .map())
  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
    ));
  };

  // Handler: Hapus tugas (Immutable dengan .filter())
  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  // Derived State (Dihitung langsung saat render)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Progres Belajar Bootcamp ({progressPercent}% Selesai)</h1>
      <p>{completedTasks} dari {totalTasks} tugas telah diselesaikan.</p>

      {/* Controlled Input Form */}
      <form onSubmit={handleAddTask} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Nama tugas baru..."
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
          style={{ flex: 1, padding: "8px 12px" }}
        />
        <select 
          value={selectedPriority} 
          onChange={(e) => setSelectedPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
          style={{ padding: "8px" }}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <button type="submit" style={{ padding: "8px 16px", cursor: "pointer" }}>
          Tambah
        </button>
      </form>

      {/* Dynamic List */}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map(task => (
          <li
            key={task.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px",
              borderBottom: "1px solid #ddd",
              textDecoration: task.isCompleted ? "line-through" : "none",
              color: task.isCompleted ? "#888" : "#000",
            }}
          >
            <span 
              onClick={() => handleToggleTask(task.id)} 
              style={{ cursor: "pointer", flex: 1 }}
            >
              {task.isCompleted ? "✅ " : "⬜ "}
              <strong>[{task.priority}]</strong> {task.title}
            </span>
            <button 
              onClick={() => handleDeleteTask(task.id)}
              style={{ background: "#ff4d4f", color: "white", border: "none", padding: "4px 8px", cursor: "pointer" }}
            >
              Hapus
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
