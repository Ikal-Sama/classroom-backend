import express from 'express';
import { db } from '../db/index.js';
import { classes } from '../db/schema/index.js';

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

export default router;