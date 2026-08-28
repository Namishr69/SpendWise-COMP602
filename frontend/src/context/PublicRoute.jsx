import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthProvider';

const PublicRoute = ({ children }) => {
    const { currentUser } = useContext(AuthContext);

    return currentUser ? <Navigate to="/dashboard" replace/> : children;
};

export default PublicRoute;