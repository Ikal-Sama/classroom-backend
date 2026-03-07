import express from 'express';
import { db } from '../db/index.js';
import { classes, subjects, user } from '../db/schema/index.js';
import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';

const router = express.Router()

router.post('/', async (req, res) => {
    try {
        const { name, teacherId, subjectId, capacity, description, status, bannerUrl, bannerCldPubId } = req.body

        const [createdClass] = await db.insert(classes)
            .values({ ...req.body, inviteCode: Math.random().toString(36).substring(2, 9), schedules: [] })
            .returning({ id: classes.id });

        if (!createdClass) throw Error;
        res.status(201).json({ data: createdClass });
    } catch (error) {
        console.error(`Post /classes error ${error}`)
        res.status(500).json({ error: error })
    }
})

router.get('/', async (req, res) => {
    try {
        const { teacher, subject, search, status, page = '1', limit = '10' } = req.query

        const parsePositiveInt = (value: unknown, fallback: number, max?: number) => {
            const parsed = Number.parseInt(String(value), 10);
            if (!Number.isFinite(parsed) || parsed < 1) return fallback;
            return max ? Math.min(parsed, max) : parsed;
        };

        const currentPage = parsePositiveInt(page, 1);
        const limitPerPage = parsePositiveInt(limit, 10, 100);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        if (status && status !== 'all') {
            filterConditions.push(eq(classes.status, status as any));
        }

        if (teacher) {
            filterConditions.push(eq(classes.teacherId, teacher as string));
        }

        if (subject) {
            const subjectId = Number(subject);
            if (Number.isFinite(subjectId) && subjectId > 0) {
                filterConditions.push(eq(classes.subjectId, subjectId));
            }
        }

        if (search) {
            filterConditions.push(
                or(
                    ilike(classes.name, `%${search}%`),
                    ilike(classes.inviteCode, `%${search}%`),
                    ilike(subjects.name, `%${search}%`),
                    ilike(user.name, `%${search}%`)
                )
            );
        }

        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;


        const countResult = await db.select({ count: sql<number>`count(*)` })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause);

        const totalCount = Number(countResult[0]?.count ?? 0);

        const classesList = await db
            .select({
                ...getTableColumns(classes),
                subject: getTableColumns(subjects),
                teacher: getTableColumns(user)
            })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause)
            .orderBy(desc(classes.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: classesList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        })

    } catch (error) {
        console.error(`Get /classes error ${error}`)
        return res.status(500).json({ error: 'Internal server error, Failed to get classes' });
    }
})

export default router;