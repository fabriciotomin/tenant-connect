import { Navigate } from "react-router-dom";

/**
 * Catch-all: any unknown route redirects to "/" which handles
 * tenant selection or auto-redirect.
 */
const NotFound = () => <Navigate to="/" replace />;

export default NotFound;
