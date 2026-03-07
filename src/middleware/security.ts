import type { Request, Response, NextFunction } from "express";
import { ArcjetNodeRequest, slidingWindow } from "@arcjet/node";
import aj from "../config/arcjet.js";

const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test') return next();

    try {
        const role: RateLimitRole = req.user?.role ?? 'guest';

        let limit: number;
        let message: string;

        switch (role) {
            case 'admin':
                limit = 30;
                message = 'Admin request limit exceeded (30 per minute). Slow down';
                break;
            case 'teacher':
            case 'student':
                limit = 20;
                message = 'Request limit exceeded (20 per minute). Please wait';
                break;
            default:
                limit = 10;
                message = "Guest request limit exceeded (10 per minute). Please sign up for higher limits";
                break;
        };

        const client = aj.withRule(
            slidingWindow({
                mode: 'LIVE',
                interval: '1m',
                max: limit
            })
        )

        const arjectRequest: ArcjetNodeRequest = {
            headers: req.headers,
            method: req.method,
            url: req.originalUrl ?? req.url,
            socket: { remoteAddress: req.socket.remoteAddress ?? req.ip ?? '0.0.0.0' }
        }

        const decision = await client.protect(arjectRequest);

        if (decision.isDenied() && decision.reason.isBot()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Automated requests are not allowed' })
        }

        if (decision.isDenied() && decision.reason.isRateLimit()) {
            return res.status(429).json({ error: 'Too many requests', message })
        }

        if (decision.isDenied() && decision.reason.isShield()) {
            return res.status(403).json({ error: 'Forbidden', message: 'Request blocked by security policy' })
        }

        next();

    } catch (error) {
        console.error('Arcjet middleware error:', error);
        return res.status(500).json({ error: 'Internal server error', message: 'Something went wrong with security middleware' });
    }
}

export default securityMiddleware;