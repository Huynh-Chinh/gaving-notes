import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

export const useTasks = (userId, isAuthReady) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = async () => {
    if (!isAuthReady || !userId) {
      setLoading(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getTasks(userId);
      setTasks(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Lỗi khi tải công việc. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [userId, isAuthReady]);

  const addTask = async (newTask) => {
    try {
      await apiClient.createTask(newTask, userId);
      await fetchTasks(); // Refresh tasks
      return { success: true, message: "Đã thêm công việc thành công!" };
    } catch (error) {
      console.error("Error adding task:", error);
      return { success: false, message: `Lỗi khi thêm công việc: ${error.message}` };
    }
  };

  const updateTask = async (updatedTask) => {
    try {
      await apiClient.updateTask(updatedTask, userId);
      await fetchTasks(); // Refresh tasks
      return { success: true, message: "Đã cập nhật công việc thành công!" };
    } catch (error) {
      console.error("Error updating task:", error);
      return { success: false, message: `Lỗi khi cập nhật công việc: ${error.message}` };
    }
  };

  const deleteTask = async (id) => {
    try {
      await apiClient.deleteTask(id, userId);
      await fetchTasks(); // Refresh tasks
      return { success: true, message: "Đã xóa công việc thành công!" };
    } catch (error) {
      console.error("Error deleting task:", error);
      return { success: false, message: `Lỗi khi xóa công việc: ${error.message}` };
    }
  };

  const changeTaskStatus = async (id, newStatus) => {
    const taskToUpdate = tasks.find(task => task.id === id);
    if (!taskToUpdate) {
      return { success: false, message: "Không tìm thấy công việc để cập nhật trạng thái." };
    }

    return updateTask({ ...taskToUpdate, status: newStatus });
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    changeTaskStatus,
    refetch: fetchTasks,
  };
};