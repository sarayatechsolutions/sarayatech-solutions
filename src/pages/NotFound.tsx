import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oops! Page not found</p>
        {/* STS-041: blue-500 on gray-100 measured 3.4:1; --primary is 11.3:1 there. */}
        <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 hover:text-primary-light">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
