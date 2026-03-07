import express from 'express'
import { or, ilike, and, sql, eq, getTableColumns, desc } from 'drizzle-orm';
import { user } from '../db/schema/index.js';
import { db } from '../db/index.js';

const router = express.Router();

// Get all users with optional search, role filter and pagination
router.get('/', async (req, res) => {
    try {
        const { search, role, page = '1', limit = '10' } = req.query;

        const parsePositiveInt = (value: unknown, fallback: number, max?: number) => {
            const parsed = Number.parseInt(String(value), 10);
            if (!Number.isFinite(parsed) || parsed < 1) return fallback;
            return max ? Math.min(parsed, max) : parsed;
        };

        const currentPage = parsePositiveInt(page, 1);
        const limitPerPage = parsePositiveInt(limit, 10, 100);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // If search query exists, filter by user name or email
        if (search) {
            filterConditions.push(
                or(
                    ilike(user.name, `%${search}%`),
                    ilike(user.email, `%${search}%`)
                )
            )
        }

        // If role filter exists, exact match
        if (role) {
            filterConditions.push(eq(user.role, role as any));
        }

        // Combine all filters using AND if any exist
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(user)
            .where(whereClause)

        const totalCount = countResult[0]?.count ?? 0;

        const usersList = await db
            .select({
                ...getTableColumns(user),
            })
            .from(user)
            .where(whereClause)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: usersList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        })

    } catch (error) {
        console.error(`GET /users error: ${error}`);
        return res.status(500).json({ error: 'Internal server error, Failed to get users' });
    }
})

export default router;
