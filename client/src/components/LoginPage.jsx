import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HybridGoogleLogin from './HybridGoogleLogin';
import '../pages/LandingPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8 animate-fade-in">
      {/* Minimalist Gradient Background with Subtle Animation */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1C] via-[#1A1B3B] to-[#241B4B] animate-gradient-shift" />
        {/* Abstract Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#6c47ff]/10 to-transparent rounded-full mix-blend-overlay transform rotate-12 animate-float-slow" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#ff47c7]/5 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-[#47ffd1]/5 rounded-full blur-2xl animate-float" />
        </div>
      </div>
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
        <div className="bg-[rgba(10,15,28,0.7)] backdrop-blur-xl rounded-xl shadow-lg border border-[rgba(108,71,255,0.12)] p-6 sm:p-8 relative z-10">
          <HybridGoogleLogin />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;