import express from 'express'
import { or, ilike, and, sql, eq, getTableColumns, desc } from 'drizzle-orm';
import { departments, subjects } from '../db/schema';
import { db } from '../db';

const router = express.Router();

// Get all subjects with optional search, filtering and pagination
router.get('/', async (req, res) => {
    try {
        const { search, department, page = '1', limit = '10' } = req.query;

        const parsePositiveInt = (value: unknown, fallback: number, max?: number) => {
            const parsed = Number.parseInt(String(value), 10);
            if (!Number.isFinite(parsed) || parsed < 1) return fallback;
            return max ? Math.min(parsed, max) : parsed;
        };

        const currentPage = parsePositiveInt(page, 1);
        const limitPerPage = parsePositiveInt(limit, 10, 100);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // If search query exists, filter by subject name or subject code
        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )
            )
        }

        // If department filter exists, match depatment name
        if (department) {
            const deptPattern = `%${String(department).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(ilike(departments.name, deptPattern));
        }

        // Combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)

        const totalCount = countResult[0]?.count ?? 0;

        const subjectsList = await db
            .select({
                ...getTableColumns(subjects),
                department: { ...getTableColumns(departments) }
            }).from(subjects).leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause).orderBy(desc(subjects.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        })

    } catch (error) {
        console.error(`GET /subjects error: ${error}`);
        return res.status(500).json({ error: 'Internal server error, Failed to get subjects' });
    }
})

export default router;