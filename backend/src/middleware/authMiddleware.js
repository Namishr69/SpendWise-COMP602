import { auth } from '../config/firebase.js';

const verifyToken = async (req, res, next) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = header.split('Bearer ')[1];

    try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
        req.userId = decodedToken.uid;
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

export default verifyToken;