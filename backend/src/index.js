import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import exampleRoutes from './routes/exampleRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SpendWise API is running');
});

app.use('/api', exampleRoutes);
app.use('/api', userRoutes);

// 404 for any unmatched route
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler — catches anything thrown outside a controller's
// own try/catch (e.g. Firestore/network failures) so the client always
// gets clean JSON instead of an HTML stack trace.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});