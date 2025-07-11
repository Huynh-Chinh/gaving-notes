import { sql } from '@vercel/postgres';
// Firebase Admin SDK imports removed as authentication is now handled by custom APIs

export default async function handler(req, res) {
  // IMPORTANT: In a production application, you MUST implement robust authentication
  // and authorize the user based on a secure token (e.g., JWT)
  // obtained from your /api/login endpoint, instead of relying on a userId from query parameters.
  // This current approach is for demonstration purposes only and is INSECURE.
  const userId = req.query.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User ID is required.' });
  }

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
