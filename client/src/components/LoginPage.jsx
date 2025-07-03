import React from 'react';
import HybridGoogleLogin from './HybridGoogleLogin';

const LoginPage = () => {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 sm:w-64 sm:h-64 bg-primary-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-32 h-32 sm:w-64 sm:h-64 bg-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-32 h-32 sm:w-64 sm:h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
        
        {/* Logo and Header */}
        <div className="text-center relative z-10">
          <img
            src="/newlogo.webp"
            alt="Ignite"
            className="mx-auto h-12 w-auto sm:h-16 filter drop-shadow-lg"
          />
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-bold text-white">
            Welcome to Ignite
          </h2>
          <p className="mt-2 text-sm text-primary-200">
            Access your PDF library with approved credentials
          </p>
        </div>

        {/* Hybrid Google Login Component */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-8 border border-white/20 relative z-10">
          <HybridGoogleLogin />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;