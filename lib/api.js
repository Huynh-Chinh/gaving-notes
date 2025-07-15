import { getFirebaseAuth } from './firebase';

const API_BASE = '/api/tasks';

class ApiClient {
  async request(url, options = {}) {
    const auth = getFirebaseAuth();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // In production, you would add the Firebase ID token here
    // const idToken = await auth.currentUser?.getIdToken();
    // headers.Authorization = `Bearer ${idToken}`;

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getTasks(userId) {
    return this.request(`${API_BASE}?userId=${userId}`);
  }

  async createTask(task, userId) {
    return this.request(`${API_BASE}?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ ...task, userId }),
    });
  }

  async updateTask(task, userId) {
    return this.request(`${API_BASE}/${task.id}?userId=${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...task, userId }),
    });
  }

  async deleteTask(id, userId) {
    return this.request(`${API_BASE}/${id}?userId=${userId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();