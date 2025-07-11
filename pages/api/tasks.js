// File: pages/api/tasks.js
// Đây là file xử lý các yêu cầu GET (lấy tất cả task) và POST (tạo task mới)

import { sql } from '@vercel/postgres';
// import { getAuth } from 'firebase-admin/auth'; // Uncomment and configure if you want to verify Firebase ID tokens on backend

export default async function handler(req, res) {
  // --- Placeholder for Firebase ID Token Verification ---
  // In a real application, you would verify the Firebase ID token sent from the frontend
  // const idToken = req.headers.authorization?.split('Bearer ')[1];
  // if (!idToken) {
  //   return res.status(401).json({ error: 'Unauthorized: No token provided' });
  // }
  // try {
  //   const decodedToken = await getAuth().verifyIdToken(idToken);
  //   const userId = decodedToken.uid;
  //   // Use userId for database operations
  // } catch (error) {
  //   console.error('Error verifying Firebase ID token:', error);
  //   return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  // }
  // For this example, we'll assume the userId is passed directly or hardcoded for demonstration.
  // In a real app, you'd get the userId from the decodedToken.
  const userId = req.query.userId || 'demo_user_id'; // IMPORTANT: Replace with actual verified user ID in production

  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM tasks WHERE user_id = ${userId} ORDER BY due_date ASC, start_time ASC;`;
      return res.status(200).json(rows);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks.' });
    }
  } else if (req.method === 'POST') {
    const { title, description, estimated_hours, due_date, start_time, end_time, instructions, label, status } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    try {
      const { rows } = await sql`
        INSERT INTO tasks (user_id, title, description, estimated_hours, due_date, start_time, end_time, instructions, label, status)
        VALUES (${userId}, ${title}, ${description || null}, ${estimated_hours || null}, ${due_date || null}, ${start_time || null}, ${end_time || null}, ${instructions || null}, ${label || null}, ${status || 'doing'})
        RETURNING *;
      `;
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error('Error adding task:', error);
      return res.status(500).json({ error: 'Failed to add task.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
