import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './authContext';

const PrivateRoute = ({ children }) => {
    const { currentUser } = useContext(AuthContext);

    return currentUser ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;