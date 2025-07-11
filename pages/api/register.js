import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs'; // Import bcryptjs for password hashing

const ADMIN_PASSWORD = "tachyonai@2025"; // Default admin password

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email, password, adminPassword } = req.body;

  if (!email || !password || !adminPassword) {
    return res.status(400).json({ error: 'Email, mật khẩu và mật khẩu admin là bắt buộc.' });
  }

  if (adminPassword !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: 'Mật khẩu admin không đúng.' });
  }

  try {
    // Check if user already exists
    const { rows: existingUsers } = await sql`SELECT id FROM users WHERE email = ${email};`;
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email này đã được đăng ký.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    // Insert new user into the database
    const { rows } = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${hashedPassword})
      RETURNING id, email;
    `;

    return res.status(201).json({ message: 'Đăng ký thành công!', userId: rows[0].id, email: rows[0].email });
  } catch (error) {
    console.error('Error during user registration:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi khi đăng ký người dùng.' });
  }
}
