import { sql } from '@vercel/postgres';
// Firebase Admin SDK imports removed as authentication is now handled by custom APIs

export default async function handler(req, res) {
  const { id } = req.query; // Get task ID from dynamic route
  // IMPORTANT: In a production application, you MUST implement robust authentication
  // and authorize the user based on a secure token (e.g., JWT)
  // obtained from your /api/login endpoint, instead of relying on a userId from query parameters.
  // This current approach is for demonstration purposes only and is INSECURE.
  const userId = req.query.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: User ID is required.' });
  }

  if (req.method === 'PUT') {
    const { title, description, estimated_hours, due_date, start_time, end_time, instructions, label, status } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    try {
      const { rows } = await sql`
        UPDATE tasks
        SET
          title = ${title},
          description = ${description || null},
          estimated_hours = ${estimated_hours || null},
          due_date = ${due_date || null},
          start_time = ${start_time || null},
          end_time = ${end_time || null},
          instructions = ${instructions || null},
          label = ${label || null},
          status = ${status || 'doing'}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *;
      `;
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Task not found or unauthorized.' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error('Error updating task:', error);
      return res.status(500).json({ error: 'Failed to update task.' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { rowCount } = await sql`DELETE FROM tasks WHERE id = ${id} AND user_id = ${userId};`;
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Task not found or unauthorized.' });
      }
      return res.status(204).end(); // No content for successful deletion
    } catch (error) {
      console.error('Error deleting task:', error);
      return res.status(500).json({ error: 'Failed to delete task.' });
    }
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
