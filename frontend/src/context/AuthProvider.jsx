import { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    if (loading) return null;

    return (
        <AuthContext.Provider value={{ currentUser, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;