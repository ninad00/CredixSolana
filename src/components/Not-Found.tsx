import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // This effect is a great practice for logging and debugging 404s.
    useEffect(() => {
        console.error(
            `404 Error: User attempted to access non-existent route: ${location.pathname}`
        );
    }, [location.pathname]);

    // Function to navigate the user to their previous page
    const handleGoBack = () => {
        navigate(-1);
    };

    return (
        <main className="grid min-h-screen place-items-center bg-gray-50 px-6 py-24 text-center sm:py-32 lg:px-8">
            <div>
                <p className="text-base font-semibold text-indigo-600">404</p>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                    Page Not Found
                </h1>
                <p className="mt-6 text-base leading-7 text-gray-600">
                    Sorry, we couldn’t find the page you’re looking for at{' '}
                    <code className="rounded-md bg-gray-200 p-1 font-mono text-sm">
                        {location.pathname}
                    </code>
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    {/* Use <Link> for client-side routing without a page refresh */}
                    <Link
                        to="/"
                        className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        Go back home
                    </Link>

                    {/* Use useNavigate to go back to the previous page in history */}
                    <button
                        onClick={handleGoBack}
                        className="text-sm font-semibold text-gray-900"
                    >
                        Go back <span aria-hidden="true">&rarr;</span>
                    </button>
                </div>
            </div>
        </main>
    );
};

export default NotFound;