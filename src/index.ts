import AgentAPI from 'apminsight';
AgentAPI.config();

import express from 'express';
import cors from 'cors'
import subjectsRouter from './routes/subjects.js'
import usersRouter from './routes/users.js'
import classesRouter from './routes/classes.js'
import departmentsRouter from './routes/departments.js'
import securityMiddleware from './middleware/security.js';
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth.js';
import { fromNodeHeaders } from "better-auth/node";

const app = express();
const PORT = 8000;


if (!process.env.FRONTEND_URL) throw new Error('FRONTEND_URL is not defined in .env file');


// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

// Middleware to parse JSON bodies
app.use(express.json());

// Session middleware to populate req.user for securityMiddleware
app.use(async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });
        if (session) {
            req.user = {
                role: session.user.role as UserRole
            };
        }
    } catch (error) {
        console.error('Session middleware error:', error);
    }
    next();
});

app.use(securityMiddleware);
app.all('/api/auth/{*any}', toNodeHandler(auth));


app.use('/api/subjects', subjectsRouter)
app.use('/api/users', usersRouter)
app.use('/api/classes', classesRouter)
app.use('/api/departments', departmentsRouter)

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Classroom API!' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
