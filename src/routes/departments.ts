import { Router } from "express";
import { db } from "../db/index.js";
import { departments } from "../db/schema/app.js";
import { asc, eq, or, ilike } from "drizzle-orm";

const router = Router();

// Get all departments
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;

        const allDepartments = await db.query.departments.findMany({
            where: search ? or(
                ilike(departments.name, `%${search}%`),
                ilike(departments.code, `%${search}%`)
            ) : undefined,
            orderBy: [asc(departments.name)]
        });
        res.json({ data: allDepartments });
    } catch (error) {
        console.error(`GET /departments error: ${error}`);
        return res.status(500).json({ error: 'Internal server error, Failed to get departments' });
    }
});

// Create a department (optional, but useful for testing)
router.post('/', async (req, res) => {
    try {
        const { name, code, description } = req.body;
        if (!name || !code) {
            return res.status(400).json({ error: 'Name and code are required' });
        }
        const department = await db.insert(departments).values({
            name,
            code,
            description
        }).returning();
        res.status(201).json({ data: department[0] });
    } catch (error) {
        console.error(`POST /departments error: ${error}`);
        return res.status(500).json({ error: 'Internal server error, Failed to create department' });
    }
});

export default router;
