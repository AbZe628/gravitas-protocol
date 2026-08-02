import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="py-32 flex items-center justify-center text-center">
      <div className="container">
        <h1 className="text-8xl md:text-9xl font-display text-gold/20 mb-8">404</h1>
        <h2 className="text-3xl md:text-4xl mb-6">Page Not Found</h2>
        <p className="text-lg text-muted mb-10 max-w-md mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/" className="btn-gold group">
          <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} /> Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
