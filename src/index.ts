import AgentAPI from 'apminsight';
AgentAPI.config();

import express from 'express';
import cors from 'cors'
import subjectsRouter from './routes/subjects.js'
import usersRouter from './routes/users.js'
import classesRouter from './routes/classes.js'
import securityMiddleware from './middleware/security.js';
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth.js';

const app = express();
const PORT = 8000;


if (!process.env.FRONTEND_URL) throw new Error('FRONTEND_URL is not defined in .env file');


// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

app.all('/api/auth/{*any}', toNodeHandler(auth));
// Middleware to parse JSON bodies
app.use(express.json());
app.use(securityMiddleware);

app.use('/api/subjects', subjectsRouter)
app.use('/api/users', usersRouter)
app.use('/api/classes', classesRouter)

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Classroom API!' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
