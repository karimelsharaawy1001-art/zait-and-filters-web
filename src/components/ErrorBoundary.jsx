import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught Error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
                    <h1 className="text-3xl font-black text-red-600 mb-4">Something went wrong.</h1>
                    <p className="text-gray-600 mb-8">We encountered an unexpected error.</p>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-left overflow-auto max-w-2xl max-h-64 mb-6">
                        <p className="font-bold text-red-800 text-sm mb-2">Error Details:</p>
                        <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-black text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors"
                    >
                        Reload Page
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-4 text-gray-500 font-bold hover:text-black transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
