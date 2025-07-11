import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs'; // Import bcryptjs for password comparison

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc.' });
  }

  try {
    // Find user by email
    const { rows } = await sql`SELECT id, email, password_hash FROM users WHERE email = ${email};`;

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }

    const user = rows[0];

    // Compare provided password with stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }

    // Login successful
    return res.status(200).json({ message: 'Đăng nhập thành công!', userId: user.id, email: user.email });
  } catch (error) {
    console.error('Error during user login:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi khi đăng nhập.' });
  }
}
