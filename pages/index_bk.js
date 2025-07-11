import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

// Helper functions for date comparisons
const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD format
};

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // Sunday - 0, Monday - 1, etc.
  // Adjust to Monday (1) for the start of the week, if Sunday (0) shift back 6 days
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(d.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0); // Normalize to start of day
  return startOfWeek;
};

const getEndOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to Sunday (0) for the end of the week, if Sunday (0) stay same, else add 7-day
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  const endOfWeek = new Date(d.setDate(diff));
  endOfWeek.setHours(23, 59, 59, 999); // Normalize to end of day
  return endOfWeek;
};

const getStartOfMonth = (date) => {
  const d = new Date(date);
  const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0); // Normalize to start of day
  return startOfMonth;
};

const getEndOfMonth = (date) => {
  const d = new Date(date);
  const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999); // Normalize to end of day
  return endOfMonth;
};

// Initialize Firebase (will be done once in App component)
let app, auth;

// Main App component
const App = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('today');
  const [message, setMessage] = useState(null);
  const [user, setUser] = useState(null); // Firebase user object
  const [userId, setUserId] = useState(null); // User ID for API calls
  const [isAuthReady, setIsAuthReady] = useState(false); // To ensure Firebase auth is ready
  const [isLoadingTasks, setIsLoadingTasks] = useState(true); // Loading state for tasks

  // Firebase Initialization and Auth Listener
  useEffect(() => {
    try {
      // These variables are provided by the Canvas environment.
      // For a standalone Next.js app, you would get these from .env.local or similar.
      const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
      const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

      if (!app) { // Initialize Firebase only once
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
      }

      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setUserId(currentUser.uid);
        } else {
          // Sign in anonymously if no initial token, or if user logs out
          if (initialAuthToken) {
            try {
              await signInWithCustomToken(auth, initialAuthToken);
            } catch (error) {
              console.error("Error signing in with custom token:", error);
              await signInAnonymously(auth);
            }
          } else {
            await signInAnonymously(auth);
          }
          setUser(auth.currentUser); // Set user after anonymous sign-in
          setUserId(auth.currentUser?.uid || crypto.randomUUID()); // Use anonymous UID or random for unauthenticated
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe(); // Cleanup auth listener on unmount
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      setMessage("Lỗi khởi tạo Firebase. Vui lòng thử lại.");
    }
  }, []);

  // Fetch tasks from Vercel Postgres API when user ID is available
  useEffect(() => {
    const fetchTasks = async () => {
      if (!isAuthReady || !userId) {
        setIsLoadingTasks(true);
        return;
      }

      setIsLoadingTasks(true);
      try {
        // Get Firebase ID token for authentication with backend API
        // In a real app, you would send this token in the Authorization header
        // const idToken = await auth.currentUser?.getIdToken();

        const response = await fetch(`/api/tasks?userId=${userId}`, { // Pass userId as query param for demo
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${idToken}` // In a real app, send ID token for backend verification
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTasks(data);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setMessage("Lỗi khi tải công việc. Vui lòng thử lại.");
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchTasks();
    // In a real-time scenario, you might want to poll or use WebSockets
    // For simplicity, we fetch once on userId/authReady change.
  }, [userId, isAuthReady, user]); // Re-fetch when user or auth state changes

  // API Operations (using fetch to Vercel API Routes)
  const addTask = async (newTask) => {
    if (!userId) {
      setMessage("Bạn cần đăng nhập để thêm công việc.");
      return;
    }
    try {
      // const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/tasks?userId=${userId}`, { // Pass userId for demo
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ ...newTask, userId: userId }), // Ensure userId is sent
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setMessage("Đã thêm công việc thành công!");
      // Re-fetch tasks to update the UI
      const updatedResponse = await fetch(`/api/tasks?userId=${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${idToken}`
        },
      });
      const updatedTasks = await updatedResponse.json();
      setTasks(updatedTasks);
      setIsFormModalOpen(false);
    } catch (error) {
      console.error("Error adding task:", error);
      setMessage(`Lỗi khi thêm công việc: ${error.message}.`);
    }
  };

  const updateTask = async (updatedTask) => {
    if (!userId) {
      setMessage("Bạn cần đăng nhập để cập nhật công việc.");
      return;
    }
    try {
      // const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/tasks/${updatedTask.id}?userId=${userId}`, { // Pass userId for demo
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ ...updatedTask, userId: userId }), // Ensure userId is sent
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setMessage("Đã cập nhật công việc thành công!");
      // Re-fetch tasks to update the UI
      const updatedResponse = await fetch(`/api/tasks?userId=${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${idToken}`
        },
      });
      const updatedTasks = await updatedResponse.json();
      setTasks(updatedTasks);
      setSelectedTask(updatedTask);
      setIsFormModalOpen(false);
    } catch (error) {
      console.error("Error updating task:", error);
      setMessage(`Lỗi khi cập nhật công việc: ${error.message}.`);
    }
  };

  const deleteTask = async (id) => {
    if (!userId) {
      setMessage("Bạn cần đăng nhập để xóa công việc.");
      return;
    }
    try {
      // const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/tasks/${id}?userId=${userId}`, { // Pass userId for demo
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${idToken}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setMessage("Đã xóa công việc thành công!");
      // Re-fetch tasks to update the UI
      const updatedResponse = await fetch(`/api/tasks?userId=${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${idToken}`
        },
      });
      const updatedTasks = await updatedResponse.json();
      setTasks(updatedTasks);
      setSelectedTask(null);
      setIsDetailModalOpen(false);
    } catch (error) {
      console.error("Error deleting task:", error);
      setMessage(`Lỗi khi xóa công việc: ${error.message}.`);
    }
  };

  const handleAddTaskClick = () => { setSelectedTask(null); setIsFormModalOpen(true); };
  const handleEditTaskClick = (task) => { setSelectedTask(task); setIsFormModalOpen(true); };
  const handleViewDetailsClick = (task) => { setSelectedTask(task); setIsDetailModalOpen(true); };

  const handleChangeStatus = async (id, newStatus) => {
    if (!userId) {
      setMessage("Bạn cần đăng nhập để thay đổi trạng thái công việc.");
      return;
    }
    // Find the task to get its current data, then update status
    const taskToUpdate = tasks.find(task => task.id === id);
    if (!taskToUpdate) {
      setMessage("Không tìm thấy công việc để cập nhật trạng thái.");
      return;
    }
    try {
      // const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/tasks/${id}?userId=${userId}`, { // Pass userId for demo
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ ...taskToUpdate, status: newStatus, userId: userId }), // Send full task data with new status
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      setMessage("Đã cập nhật trạng thái công việc!");
      // Re-fetch tasks to update the UI
      const updatedResponse = await fetch(`/api/tasks?userId=${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${idToken}`
        },
      });
      const updatedTasks = await updatedResponse.json();
      setTasks(updatedTasks);
    } catch (error) {
      console.error("Error updating task status:", error);
      setMessage(`Lỗi khi cập nhật trạng thái: ${error.message}.`);
    }
  };

  const isTaskOverdue = (task) => {
    if (!task.due_date || task.status === 'completed') return false; // Use task.due_date from Postgres
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDueDate = new Date(task.due_date); // Use task.due_date from Postgres
    taskDueDate.setHours(0, 0, 0, 0);
    return taskDueDate < today;
  };

  const getLabelColorClass = (label) => {
    if (!label) return 'border-gray-300';
    const colors = [
      'border-purple-500', 'border-indigo-500', 'border-pink-500',
      'border-teal-500', 'border-orange-500', 'border-lime-500',
      'border-cyan-500', 'border-fuchsia-500'
    ];
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
      hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const todayDateString = getTodayDateString();
  const todayTasks = tasks.filter(task => task.due_date === todayDateString); // Use task.due_date

  const doingTasksToday = todayTasks.filter(task => task.status === 'doing' && !isTaskOverdue(task));
  const overdueTasksToday = todayTasks.filter(task => task.status === 'doing' && isTaskOverdue(task));
  const completedTasksToday = todayTasks.filter(task => task.status === 'completed');

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-700">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg">Đang tải ứng dụng...</p>
        </div>
      </div>
    );
  }

  // Render AuthPage if user is not logged in (and not anonymous from initial token)
  if (!user || user.isAnonymous) {
    return (
      <AuthPage
        auth={auth}
        setMessage={setMessage}
        onLoginSuccess={() => { /* App component will re-render with authenticated user */ }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-blue-700 mb-2">Quản Lý Công Việc Cá Nhân</h1>
        <p className="text-lg text-gray-600">Sắp xếp ngày của bạn một cách hiệu quả!</p>
        <div className="mt-4 text-sm text-gray-600">
          <p>Xin chào, <span className="font-semibold">{user.email || user.uid}</span></p>
          <button
            onClick={() => signOut(auth)}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 text-sm"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-xl p-6 sm:p-8">
        {/* Navigation/Planning Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-700">Kế Hoạch</h2>
          <button
            onClick={handleAddTaskClick}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-300 ease-in-out"
          >
            + Thêm Công Việc Mới
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={() => setCurrentView('today')}
            className={`px-4 py-2 rounded-lg font-semibold ${currentView === 'today' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Hôm Nay
          </button>
          <button
            onClick={() => setCurrentView('week')}
            className={`px-4 py-2 rounded-lg font-semibold ${currentView === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Tuần
          </button>
          <button
            onClick={() => setCurrentView('month')}
            className={`px-4 py-2 rounded-lg font-semibold ${currentView === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Tháng
          </button>
        </div>

        {isLoadingTasks ? (
          <div className="text-center text-gray-700 py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Đang tải công việc của bạn...</p>
          </div>
        ) : (
          <>
            {/* Conditional View Rendering */}
            {currentView === 'today' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Đang thực hiện (Doing) Tasks */}
                <TaskList
                  title="Đang thực hiện"
                  tasks={doingTasksToday}
                  onEdit={handleEditTaskClick}
                  onViewDetails={handleViewDetailsClick}
                  onChangeStatus={handleChangeStatus}
                  statusColor="border-blue-500"
                  getLabelColorClass={getLabelColorClass}
                  isTaskOverdue={isTaskOverdue}
                />

                {/* Quá hạn (Overdue) Tasks */}
                <TaskList
                  title="Quá hạn"
                  tasks={overdueTasksToday}
                  onEdit={handleEditTaskClick}
                  onViewDetails={handleViewDetailsClick}
                  onChangeStatus={handleChangeStatus}
                  statusColor="border-red-500"
                  isOverdueList={true} // Special styling for overdue tasks
                  getLabelColorClass={getLabelColorClass}
                  isTaskOverdue={isTaskOverdue}
                />

                {/* Đã hoàn thành (Completed) Tasks */}
                <TaskList
                  title="Đã hoàn thành"
                  tasks={completedTasksToday}
                  onEdit={handleEditTaskClick}
                  onViewDetails={handleViewDetailsClick}
                  onChangeStatus={handleChangeStatus}
                  statusColor="border-green-500"
                  getLabelColorClass={getLabelColorClass}
                  isTaskOverdue={isTaskOverdue}
                />
              </div>
            )}

            {currentView === 'week' && (
              <WeeklyTasksView
                tasks={tasks}
                onEdit={handleEditTaskClick}
                onViewDetails={handleViewDetailsClick}
                getLabelColorClass={getLabelColorClass}
                isTaskOverdue={isTaskOverdue}
              />
            )}

            {currentView === 'month' && (
              <MonthlyTasksView
                tasks={tasks}
                onEdit={handleEditTaskClick}
                onViewDetails={handleViewDetailsClick}
                getLabelColorClass={getLabelColorClass}
                isTaskOverdue={isTaskOverdue}
              />
            )}
          </>
        )}
      </div>

      {/* Task Form Modal */}
      {isFormModalOpen && (
        <Modal onClose={() => setIsFormModalOpen(false)}>
          <TaskForm
            task={selectedTask}
            onSave={selectedTask ? updateTask : addTask}
            onClose={() => setIsFormModalOpen(false)}
            setMessage={setMessage}
          />
        </Modal>
      )}

      {/* Task Detail Modal */}
      {isDetailModalOpen && selectedTask && (
        <Modal onClose={() => setIsDetailModalOpen(false)}>
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setIsDetailModalOpen(false)}
            onDelete={deleteTask}
            onEdit={() => {
              setIsDetailModalOpen(false);
              handleEditTaskClick(selectedTask);
            }}
            updateTask={updateTask}
            getLabelColorClass={getLabelColorClass}
            isTaskOverdue={isTaskOverdue}
            setMessage={setMessage}
          />
        </Modal>
      )}

      {/* Custom Message Modal */}
      {message && <MessageModal message={message} onClose={() => setMessage(null)} />}
    </div>
  );
};

// Component for Authentication (Login/Signup)
const AuthPage = ({ auth, setMessage, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setMessage("Đăng nhập thành công!");
        onLoginSuccess(); // Trigger re-render of App component
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage("Đăng ký thành công! Vui lòng đăng nhập.");
        setIsLogin(true); // Switch to login after successful registration
      }
    } catch (error) {
      console.error("Authentication error:", error);
      let errorMessage = "Đã xảy ra lỗi. Vui lòng thử lại.";
      if (error.code === 'auth/invalid-email') {
        errorMessage = "Email không hợp lệ.";
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Email hoặc mật khẩu không đúng.";
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email này đã được sử dụng.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Mật khẩu quá yếu (ít nhất 6 ký tự).";
      }
      setMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-blue-700 mb-6">
          {isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
            ) : (
              isLogin ? 'Đăng Nhập' : 'Đăng Ký'
            )}
          </button>
        </form>
        <p className="mt-6 text-center text-gray-600">
          {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>
        <p className="mt-4 text-center text-gray-500 text-sm">
          ID người dùng hiện tại (chỉ hiển thị): <span className="font-mono break-all">{auth.currentUser?.uid || 'Đang tải...'}</span>
        </p>
      </div>
    </div>
  );
};

// Component for a list of tasks (e.g., Doing, Overdue, Completed)
const TaskList = ({ title, tasks, onEdit, onViewDetails, onChangeStatus, statusColor, isOverdueList = false, getLabelColorClass, isTaskOverdue }) => {
  return (
    <div className={`bg-gray-50 p-5 rounded-lg shadow-sm border-t-4 ${statusColor}`}>
      <h3 className="text-xl font-semibold mb-4 text-gray-700">{title} ({tasks.length})</h3>
      {tasks.length === 0 ? (
        <p className="text-gray-500 italic">Chưa có công việc nào.</p>
      ) : (
        <ul className="space-y-4">
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={onEdit}
              onViewDetails={onViewDetails}
              onChangeStatus={onChangeStatus}
              isOverdue={isOverdueList || isTaskOverdue(task)}
              getLabelColorClass={getLabelColorClass}
              showStatusDropdown={true}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

// Component for a single task item
const TaskItem = ({ task, onEdit, onViewDetails, onChangeStatus, isOverdue, getLabelColorClass, showStatusDropdown = false }) => {
  const statusOptions = [
    { value: 'doing', label: 'Đang thực hiện' },
    { value: 'completed', label: 'Đã hoàn thành' },
  ];

  const labelColorClass = getLabelColorClass(task.label);

  return (
    <li className={`bg-white p-4 rounded-md shadow-md border border-gray-200 ${isOverdue ? 'border-red-400 bg-red-50' : ''} ${labelColorClass} border-l-8`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className={`text-lg font-medium ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>{task.title}</h4>
          <p className="text-sm text-gray-600">
            {task.estimated_hours ? `${task.estimated_hours} giờ` : 'Không xác định giờ'}
            {task.due_date && ` - Hạn: ${new Date(task.due_date).toLocaleDateString('vi-VN')}`}
            {task.start_time && ` (${task.start_time}`}
            {task.end_time && ` - ${task.end_time})`}
          </p>
          {task.label && (
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-opacity-75
              ${labelColorClass.replace('border-', 'bg-').replace('-500', '-200')}
              ${labelColorClass.replace('border-', 'text-').replace('-500', '-800')}
            `}>
              {task.label}
            </span>
          )}
        </div>
        {showStatusDropdown && (
          <div className="flex space-x-2">
            <select
              value={task.status}
              onChange={(e) => onChangeStatus(task.id, e.target.value)}
              className={`p-1 text-sm rounded-md border focus:ring-blue-500 focus:border-blue-500 ${task.status === 'completed' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-2 mt-3">
        <button
          onClick={() => onViewDetails(task)}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200"
        >
          Chi tiết
        </button>
        <button
          onClick={() => onEdit(task)}
          className="px-3 py-1 text-sm bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500 transition duration-200"
        >
          Chỉnh sửa
        </button>
      </div>
    </li>
  );
};

// Modal component for forms and details
const Modal = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

// Task Form component for adding/editing tasks
const TaskForm = ({ task, onSave, onClose, setMessage }) => {
  // Note: Backend uses snake_case for column names, but frontend uses camelCase for state
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [estimatedHours, setEstimatedHours] = useState(task?.estimated_hours || ''); // Changed to estimated_hours
  const [dueDate, setDueDate] = useState(task?.due_date || ''); // Changed to due_date
  const [startTime, setStartTime] = useState(task?.start_time || ''); // Changed to start_time
  const [endTime, setEndTime] = useState(task?.end_time || '');     // Changed to end_time
  const [instructions, setInstructions] = useState(task?.instructions || '');
  const [label, setLabel] = useState(task?.label || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setMessage('Tiêu đề công việc không được để trống!');
      return;
    }
    onSave({
      id: task?.id,
      title,
      description,
      estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null, // Send as estimated_hours
      due_date: dueDate || null, // Send as due_date
      start_time: startTime.trim() || null, // Send as start_time
      end_time: endTime.trim() || null,     // Send as end_time
      instructions,
      label: label.trim() || null,
      status: task?.status || 'doing',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">{task ? 'Chỉnh Sửa Công Việc' : 'Thêm Công Việc Mới'}</h3>
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề công việc <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">Nhãn (ví dụ: Công việc, Cá nhân, Dự án X)</label>
        <input
          type="text"
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="3"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
      <div>
        <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700 mb-1">Thời gian dự kiến (giờ)</label>
        <input
          type="number"
          id="estimatedHours"
          value={estimatedHours}
          onChange={(e) => setEstimatedHours(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          min="0"
          step="0.5"
        />
      </div>
      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">Ngày hết hạn</label>
        <input
          type="date"
          id="dueDate"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">Thời gian bắt đầu (HH:MM)</label>
        <input
          type="time"
          id="startTime"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">Thời gian kết thúc (HH:MM)</label>
        <input
          type="time"
          id="endTime"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">Hướng dẫn chi tiết</label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows="5"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-200"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
        >
          {task ? 'Lưu Thay Đổi' : 'Thêm Công Việc'}
        </button>
      </div>
    </form>
  );
};

// Task Detail Modal component
const TaskDetailModal = ({ task, onClose, onDelete, onEdit, updateTask, getLabelColorClass, isTaskOverdue, setMessage }) => {
  const labelColorClass = getLabelColorClass(task.label);
  const [isGenerating, setIsGenerating] = useState(false); // State for loading indicator

  const handleGenerateInstructions = async () => {
    setIsGenerating(true);
    setMessage('Đang tạo hướng dẫn chi tiết...');
    try {
      const prompt = `Tạo hướng dẫn chi tiết cho công việc sau:
      Tiêu đề: ${task.title}
      Mô tả: ${task.description || 'Không có mô tả.'}
      Hãy cung cấp các bước rõ ràng và ngắn gọn.`;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = ""; // Leave this as-is; Canvas will provide the key at runtime.
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const generatedText = result.candidates[0].content.parts[0].text;
        // Update the task with the generated instructions
        // Ensure all fields are passed back, especially those from Postgres (snake_case)
        updateTask({
          ...task,
          instructions: generatedText,
          due_date: task.due_date, // Preserve original due_date
          estimated_hours: task.estimated_hours, // Preserve original estimated_hours
          start_time: task.start_time, // Preserve original start_time
          end_time: task.end_time // Preserve original end_time
        });
        setMessage('Đã tạo hướng dẫn thành công!');
      } else {
        setMessage('Không thể tạo hướng dẫn. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Lỗi khi gọi API Gemini:', error);
      setMessage('Đã xảy ra lỗi khi tạo hướng dẫn. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">{task.title}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-600">Thời gian dự kiến:</p>
          <p className="text-base text-gray-900">{task.estimated_hours ? `${task.estimated_hours} giờ` : 'Không xác định'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Ngày hết hạn:</p>
          <p className="text-base text-gray-900">{task.due_date ? new Date(task.due_date).toLocaleDateString('vi-VN') : 'Không có'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Thời gian bắt đầu:</p>
          <p className="text-base text-gray-900">{task.start_time || 'Không có'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Thời gian kết thúc:</p>
          <p className="text-base text-gray-900">{task.end_time || 'Không có'}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Trạng thái:</p>
          <p className="text-base text-gray-900">
            {task.status === 'doing' ? 'Đang thực hiện' : 'Đã hoàn thành'}
            {isTaskOverdue(task) && task.status !== 'completed' && <span className="text-red-500 font-bold ml-2">(Quá hạn)</span>}
          </p>
        </div>
        {task.label && (
          <div>
            <p className="text-sm font-medium text-gray-600">Nhãn:</p>
            <span className={`inline-block px-2 py-0.5 text-sm font-semibold rounded-full
              ${getLabelColorClass(task.label).replace('border-', 'bg-').replace('-500', '-200')}
              ${getLabelColorClass(task.label).replace('border-', 'text-').replace('-500', '-800')}
            `}>
              {task.label}
            </span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-600">Mô tả:</p>
        <p className="text-base text-gray-900 whitespace-pre-wrap">{task.description || 'Không có mô tả.'}</p>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-600">Hướng dẫn chi tiết:</p>
        <p className="text-base text-gray-900 whitespace-pre-wrap">{task.instructions || 'Không có hướng dẫn chi tiết.'}</p>
        <button
          onClick={handleGenerateInstructions}
          disabled={isGenerating}
          className="mt-3 w-full px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Đang tạo...' : 'Tạo Hướng Dẫn ✨'}
        </button>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={() => onDelete(task.id)}
          className="px-5 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
        >
          Xóa
        </button>
        <button
          onClick={onEdit}
          className="px-5 py-2 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 transition duration-200"
        >
          Chỉnh sửa
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-200"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

// Component for displaying weekly tasks
const WeeklyTasksView = ({ tasks, onEdit, onViewDetails, getLabelColorClass, isTaskOverdue }) => {
  const today = new Date();
  const startOfWeek = getStartOfWeek(today);
  const endOfWeek = getEndOfWeek(today);

  const weekTasks = tasks.filter(task => {
    if (!task.due_date) return false; // Use task.due_date
    const taskDate = new Date(task.due_date); // Use task.due_date
    taskDate.setHours(0, 0, 0, 0); // Normalize for comparison
    return taskDate >= startOfWeek && taskDate <= endOfWeek;
  }).sort((a, b) => {
    // Sort by due date, then by start time
    const dateComparison = new Date(a.due_date) - new Date(b.due_date); // Use due_date
    if (dateComparison !== 0) return dateComparison;
    if (a.start_time && b.start_time) { // Use start_time
      return a.start_time.localeCompare(b.start_time);
    }
    return 0;
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Công Việc Trong Tuần</h2>
      {weekTasks.length === 0 ? (
        <p className="text-gray-500 italic">Không có công việc nào trong tuần này.</p>
      ) : (
        <ul className="space-y-4">
          {weekTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={onEdit}
              onViewDetails={onViewDetails}
              onChangeStatus={() => {}} // Status change not directly in this view
              getLabelColorClass={getLabelColorClass}
              isOverdue={isTaskOverdue(task)}
              showStatusDropdown={false} // Hide status dropdown in weekly/monthly view
            />
          ))}
        </ul>
      )}
    </div>
  );
};

// Component for displaying monthly tasks
const MonthlyTasksView = ({ tasks, onEdit, onViewDetails, getLabelColorClass, isTaskOverdue }) => {
  const today = new Date();
  const startOfMonth = getStartOfMonth(today);
  const endOfMonth = getEndOfMonth(today);

  const monthTasks = tasks.filter(task => {
    if (!task.due_date) return false; // Use task.due_date
    const taskDate = new Date(task.due_date); // Use task.due_date
    taskDate.setHours(0, 0, 0, 0); // Normalize for comparison
    return taskDate >= startOfMonth && taskDate <= endOfMonth;
  }).sort((a, b) => {
    // Sort by due date, then by start time
    const dateComparison = new Date(a.due_date) - new Date(b.due_date); // Use due_date
    if (dateComparison !== 0) return dateComparison;
    if (a.start_time && b.start_time) { // Use start_time
      return a.start_time.localeCompare(b.start_time);
    }
    return 0;
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Công Việc Trong Tháng</h2>
      {monthTasks.length === 0 ? (
        <p className="text-gray-500 italic">Không có công việc nào trong tháng này.</p>
      ) : (
        <ul className="space-y-4">
          {monthTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={onEdit}
              onViewDetails={onViewDetails}
              onChangeStatus={() => {}} // Status change not directly in this view
              getLabelColorClass={getLabelColorClass}
              isOverdue={isTaskOverdue(task)}
              showStatusDropdown={false} // Hide status dropdown in weekly/monthly view
            />
          ))}
        </ul>
      )}
    </div>
  );
};

// Custom Message Modal component
const MessageModal = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm relative text-center">
      <p className="text-lg font-semibold mb-4">{message}</p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
      >
        OK
      </button>
    </div>
  </div>
);

export default App;
