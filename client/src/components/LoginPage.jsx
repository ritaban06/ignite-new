import React from 'react';
import HybridGoogleLogin from './HybridGoogleLogin';

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1b0b42] via-[#24125a] to-[#2d176b] flex items-center justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
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
          <p className="mt-2 text-sm text-white/80">
            Access your PDF library with approved credentials
          </p>
        </div>

        {/* Hybrid Google Login Component */}
        <div className="bg-[rgba(27,11,66,0.7)] backdrop-blur-md rounded-xl shadow-lg border border-[rgba(255,255,255,0.12)] p-6 sm:p-8 relative z-10">
          <HybridGoogleLogin />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;