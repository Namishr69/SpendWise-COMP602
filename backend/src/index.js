import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import exampleRoutes from './routes/exampleRoutes.js';
app.use('/api', userRoutes);
import userRoutes from './routes/userRoutes.js';    


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SpendWise API is running');
});

app.use('/api', exampleRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});