
import React, { useRef, useState, useEffect } from 'react';
import './LandingPage.css';

const Landingpage = () => {
  const featuresRef = useRef(null);
  const testimonialsRef = useRef(null);
  const timelineRef = useRef(null);
  const contactRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [navbarSolid, setNavbarSolid] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const handleLearnMore = () => {
    if (featuresRef.current) {
      featuresRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const scrollToSection = (sectionRef) => {
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false); // Close mobile menu after clicking
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      // Show scroll to top button after scrolling down 500px
      setShowScrollTop(window.scrollY > 500);
      
      // Make navbar more solid after scrolling down 100px
      setNavbarSolid(window.scrollY > 100);
      
      // Determine which section is in view
      const scrollPosition = window.scrollY + 300;
      
      if (scrollPosition < featuresRef.current?.offsetTop) {
        setActiveSection('home');
      } else if (scrollPosition < timelineRef.current?.offsetTop) {
        setActiveSection('features');
      } else if (scrollPosition < testimonialsRef.current?.offsetTop) {
        setActiveSection('timeline');
      } else if (scrollPosition < contactRef.current?.offsetTop) {
        setActiveSection('testimonials');
      } else {
        setActiveSection('contact');
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center overflow-y-auto animate-fade-in">
      {/* Clean Gradient Background with Minimal Animation */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1C] via-[#121836] to-[#1D1A3B] animate-gradient-shift" />
        {/* Subtle Abstract Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-70">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#6c47ff]/5 to-transparent rounded-full mix-blend-overlay transform rotate-12 animate-float-slow" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#6c47ff]/5 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-[#6c47ff]/5 rounded-full blur-2xl animate-float" />
        </div>
      </div>
      
      {/* Clean Navbar */}
      <header className={`mb-12 w-full ${navbarSolid ? 'bg-black/70' : 'bg-black/10'} transition-colors duration-300 backdrop-blur-sm border-b border-white/10 fixed top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <img src="/newlogo.webp" alt="Ignite" className="h-8 w-auto" />
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                className={`${activeSection === 'home' ? 'text-white font-medium' : 'text-white/60'} hover:text-white text-sm transition-colors duration-300 bg-transparent relative group`}
              >
                Home
                {activeSection === 'home' && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#6c47ff]/70 rounded-full"></span>
                )}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#6c47ff]/70 rounded-full group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => scrollToSection(featuresRef)} 
                className={`${activeSection === 'features' ? 'text-white font-medium' : 'text-white/60'} hover:text-white text-sm transition-colors duration-300 bg-transparent relative group`}
              >
                Features
                {activeSection === 'features' && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#6c47ff]/70 rounded-full"></span>
                )}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#6c47ff]/70 rounded-full group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => scrollToSection(timelineRef)} 
                className={`${activeSection === 'timeline' ? 'text-white font-medium' : 'text-white/60'} hover:text-white text-sm transition-colors duration-300 bg-transparent relative group`}
              >
                How It Works
                {activeSection === 'timeline' && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#6c47ff]/70 rounded-full"></span>
                )}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#6c47ff]/70 rounded-full group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => scrollToSection(testimonialsRef)} 
                className={`${activeSection === 'testimonials' ? 'text-white font-medium' : 'text-white/60'} hover:text-white text-sm transition-colors duration-300 bg-transparent relative group`}
              >
                Testimonials
                {activeSection === 'testimonials' && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#6c47ff]/70 rounded-full"></span>
                )}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#6c47ff]/70 rounded-full group-hover:w-full transition-all duration-300"></span>
              </button>
              <button 
                onClick={() => scrollToSection(contactRef)} 
                className={`${activeSection === 'contact' ? 'text-white font-medium' : 'text-white/60'} hover:text-white text-sm transition-colors duration-300 bg-transparent relative group`}
              >
                Contact
                {activeSection === 'contact' && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-[#6c47ff]/70 rounded-full"></span>
                )}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#6c47ff]/70 rounded-full group-hover:w-full transition-all duration-300"></span>
              </button>
            </nav>
            
            {/* Desktop Login Button */}
            <div className="hidden md:flex items-center space-x-4">
              <a 
                href="/login" 
                className="px-4 py-2 text-sm text-white bg-[#6c47ff]/80 hover:bg-[#6c47ff] rounded-lg transition-colors duration-300"
              >
                Sign In
              </a>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                type="button"
                className="text-white/70 hover:text-white focus:outline-none"
                onClick={toggleMenu}
              >
                {isMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden bg-black/20 backdrop-blur-md border-t border-white/5 rounded-b-lg animate-fade-in">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <button 
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setIsMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-3 ${activeSection === 'home' ? 'text-white bg-white/5 border-l-2 border-[#6c47ff]' : 'text-white/70 border-l-2 border-transparent'} text-sm font-medium rounded-md hover:bg-white/5 transition-colors duration-300`}
                >
                  Home
                </button>
                <button 
                  onClick={() => scrollToSection(featuresRef)} 
                  className={`block w-full text-left px-3 py-3 ${activeSection === 'features' ? 'text-white bg-white/5 border-l-2 border-[#6c47ff]' : 'text-white/70 border-l-2 border-transparent'} text-sm font-medium rounded-md hover:bg-white/5 transition-colors duration-300`}
                >
                  Features
                </button>
                <button 
                  onClick={() => scrollToSection(timelineRef)} 
                  className={`block w-full text-left px-3 py-3 ${activeSection === 'timeline' ? 'text-white bg-white/5 border-l-2 border-[#6c47ff]' : 'text-white/70 border-l-2 border-transparent'} text-sm font-medium rounded-md hover:bg-white/5 transition-colors duration-300`}
                >
                  How It Works
                </button>
                <button 
                  onClick={() => scrollToSection(testimonialsRef)} 
                  className={`block w-full text-left px-3 py-3 ${activeSection === 'testimonials' ? 'text-white bg-white/5 border-l-2 border-[#6c47ff]' : 'text-white/70 border-l-2 border-transparent'} text-sm font-medium rounded-md hover:bg-white/5 transition-colors duration-300`}
                >
                  Testimonials
                </button>
                <button
                  onClick={() => scrollToSection(contactRef)}
                  className={`block w-full text-left px-3 py-3 ${activeSection === 'contact' ? 'text-white bg-white/5 border-l-2 border-[#6c47ff]' : 'text-white/70 border-l-2 border-transparent'} text-sm font-medium rounded-md hover:bg-white/5 transition-colors duration-300`}
                >
                  Contact
                </button>
              </div>
              <div className="px-5 py-4 border-t border-white/5">
                <a
                  href="/login"
                  className="block text-center w-full px-4 py-2 text-sm font-medium text-white bg-[#6c47ff]/80 hover:bg-[#6c47ff] rounded-lg transition-colors duration-300"
                >
                  Sign In
                </a>
              </div>
            </div>
          )}
        </div>
      </header>
	  <div className="flex justify-between items-center h-16 md:h-20">
            
    </div>
			{/* Hero Section - Clean Educational Theme */}
			<div className="w-full max-w-7xl mx-auto px-4 pt-8 xs:pt-36 lg:pt-24 pb-6 sm:pb-8 md:pb-10 text-center relative">
				{/* Minimalist educational icons floating in background */}
				<div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none">
					<div className="absolute top-1/4 left-10 w-16 h-16 animate-float-slow">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#6c47ff]">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
					</div>
					<div className="absolute top-1/3 right-10 w-12 h-12 animate-float">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#6c47ff]">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
					</div>
					<div className="absolute bottom-1/4 left-1/4 w-14 h-14 animate-pulse-slow">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-[#6c47ff]">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
						</svg>
					</div>
				</div>

				{/* Logo with subtle enhancement */}
				<div className="relative">
					<div className="absolute -inset-1 bg-gradient-to-r from-[#6c47ff]/0 via-[#6c47ff]/20 to-[#6c47ff]/0 rounded-full blur-md opacity-60 animate-pulse-slow"></div>
					<img
						src="/newlogo.webp"
						alt="Ignite"
						className="relative mx-auto max-w-[45%] h-auto xs:max-w-none xs:h-12 sm:h-16 md:h-20 lg:h-48 xl:h-48 filter drop-shadow-lg animate-float"
					/>
				</div>

				{/* Clean title with minimal animation */}
				<h1 className="mt-4 xs:mt-5 sm:mt-7 text-4xl leading-[1.5] xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white animate-fade-in-down relative">
					Your Path to <span className="text-[#6c47ff] relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-[#6c47ff]/20 after:rounded-full">Academic Excellence</span>
				</h1>

				{/* Clean subheading */}
				<div className="mt-3 xs:mt-4 sm:mt-5 text-sm xs:text-base sm:text-lg md:text-xl text-white/70 max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto animate-fade-in-up">
					<p>
						Tired of wasting time searching for class notes, past year papers, or guidance during exams?
					</p>
					<p className="mt-3">
						With Ignite Premium, we bring everything you need right at your fingertips.
					</p>
				</div>

				{/* Clean CTA buttons */}
				<div className="mt-8 sm:mt-10 md:mt-12 flex flex-col xs:flex-row gap-5 justify-center">
					<a href="/login" className="min-w-[160px] px-6 xs:px-8 sm:px-10 py-3 sm:py-4 bg-[#6c47ff] text-white text-sm xs:text-base sm:text-lg font-medium rounded-lg shadow-lg hover:bg-[#7b5aff] transition-all duration-300">
						<span className="flex items-center justify-center gap-2">
							Get Started
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
							</svg>
						</span>
					</a>
					<button
						onClick={handleLearnMore}
						className="min-w-[160px] px-6 xs:px-8 sm:px-10 py-3 sm:py-4 bg-transparent text-white text-sm xs:text-base sm:text-lg font-medium rounded-lg border border-white/20 hover:border-[#6c47ff]/40 hover:bg-white/5 transition-all duration-300"
					>
						<span className="flex items-center justify-center gap-2">
							Learn More
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
							</svg>
						</span>
					</button>
				</div>

				{/* Simple Trust indicators */}
				<div className="mt-10 sm:mt-12 flex flex-wrap justify-center items-center gap-8 text-white/40">
					<div className="flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#6c47ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
						</svg>
						<span className="text-sm">Secure Access</span>
					</div>
					<div className="flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#6c47ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						<span className="text-sm">Expert-Tested Academic Resources</span>
					</div>
					<div className="flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#6c47ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span className="text-sm">24/7 Support</span>
					</div>
				</div>
			</div>
			{/* Educational Stats Section */}
			<div className="w-full max-w-6xl mx-auto px-4 py-12 xs:py-16 sm:py-20 md:py-24">
				<div className="bg-gradient-to-br from-[#6c47ff]/10 via-[#6c47ff]/15 to-[#6c47ff]/10 backdrop-blur-md rounded-2xl border border-[#6c47ff]/20 shadow-[0_0_20px_rgba(108,71,255,0.15)] p-8 sm:p-10 md:p-12 relative">
					<div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-[#47ffd1]/10 rounded-full blur-2xl"></div>
					<div className="absolute bottom-0 left-0 transform -translate-x-1/4 translate-y-1/4 w-36 h-36 bg-[#6c47ff]/10 rounded-full blur-2xl"></div>
					<div className="relative grid grid-cols-3 gap-8 md:gap-16">
						<div className="text-center group">
							<div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 group-hover:text-[#6c47ff] transition-colors duration-300">500+</div>
							<div className="text-[#6c47ff] text-sm sm:text-base font-medium">Study Materials</div>
							<div className="text-white/60 text-xs sm:text-sm mt-1">Notes & Resources</div>
						</div>
						<div className="text-center group">
							<div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 group-hover:text-[#6c47ff] transition-colors duration-300">24/7</div>
							<div className="text-[#6c47ff] text-sm sm:text-base font-medium">Expert Support</div>
							<div className="text-white/60 text-xs sm:text-sm mt-1">Always Available</div>
						</div>
						<div className="text-center group">
							<div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 group-hover:text-[#6c47ff] transition-colors duration-300">98%</div>
							<div className="text-[#6c47ff] text-sm sm:text-base font-medium">Success Rate</div>
							<div className="text-white/60 text-xs sm:text-sm mt-1">Student Satisfaction</div>
						</div>
					</div>
				</div>
			</div>

			{/* Features Grid - Clean Educational Features */}
			<div ref={featuresRef} className="w-full mx-auto px-4 xs:px-6 sm:px-8 md:px-10 py-12 sm:py-16 md:py-20" style={{ zIndex: 10, position: 'relative' }}>
				<div className="text-center mb-12 sm:mb-16 md:mb-20">
					<span className="inline-block text-[#6c47ff] text-sm font-semibold tracking-wider uppercase mb-3 px-3 py-1 bg-[#6c47ff]/5 rounded-full">Comprehensive Resources</span>
					<br />
					<h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-white inline-block relative">
						Why Students Choose <span className="text-[#6c47ff]">Ignite</span>
						<div className="absolute -bottom-2 xs:-bottom-3 left-0 right-0">
							<div className="h-0.5 xs:h-1 bg-gradient-to-r from-transparent via-[#6c47ff] to-transparent opacity-50"></div>
						</div>
					</h2>
					<p className="mt-5 text-white/70 max-w-2xl mx-auto text-sm sm:text-base md:text-lg">
						Our platform is designed by educators and top students to provide you with everything you need to excel in your academic journey.
					</p>
				</div>

				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-6 xs:gap-7 md:gap-8 lg:gap-10">
						<div className="group p-8 rounded-xl backdrop-blur-md bg-gradient-to-br from-[#6c47ff]/5 via-[#6c47ff]/10 to-[#6c47ff]/5 hover:bg-gradient-to-br hover:from-[#6c47ff]/10 hover:via-[#6c47ff]/15 hover:to-[#6c47ff]/10 transition-all duration-500 relative overflow-hidden shadow-[0_0_15px_rgba(108,71,255,0.15)] hover:shadow-[0_0_25px_rgba(108,71,255,0.25)] flex flex-col items-center text-center">
							<div className="absolute inset-0 bg-gradient-to-br from-[#6c47ff]/0 via-[#6c47ff]/5 to-[#6c47ff]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
							<div className="absolute inset-0 rounded-xl border border-[#6c47ff]/20 group-hover:border-[#6c47ff]/40 transition-all duration-500">
								<div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#6c47ff]/0 via-[#6c47ff]/50 to-[#6c47ff]/0 opacity-0 group-hover:opacity-100 animate-border-shine"></div>
							</div>
							
							{/* Feature Icon */}
							<div className="w-16 h-16 rounded-full bg-[#6c47ff]/10 flex items-center justify-center mb-4 relative z-10 group-hover:scale-110 transition-all duration-300">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#6c47ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
								</svg>
								<div className="absolute inset-0 bg-[#6c47ff]/30 rounded-full blur-md animate-pulse-slow"></div>
							</div>
							
							<h3 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold text-[#6c47ff] relative z-10 group-hover:text-[#8b6aff] transition-colors duration-300 mb-2">Exam-Ready Notes</h3>
							<p className="text-white/80 text-xs xs:text-sm sm:text-base md:text-lg mt-2 relative z-10">Comprehensive handwritten & digital notes from professors and top students from all academic years.</p>
							{/* <span className="mt-4 text-[#6c47ff]/80 text-xs inline-flex items-center relative z-10">
								<span>Access Now</span>
								<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
								</svg>
							</span> */}
						</div>
						
						<div className="group p-8 rounded-xl backdrop-blur-md bg-gradient-to-br from-[#6c47ff]/5 via-[#6c47ff]/10 to-[#6c47ff]/5 hover:bg-gradient-to-br hover:from-[#6c47ff]/10 hover:via-[#6c47ff]/15 hover:to-[#6c47ff]/10 transition-all duration-500 relative overflow-hidden shadow-[0_0_15px_rgba(108,71,255,0.15)] hover:shadow-[0_0_25px_rgba(108,71,255,0.25)] flex flex-col items-center text-center">
							<div className="absolute inset-0 bg-gradient-to-br from-[#6c47ff]/0 via-[#6c47ff]/5 to-[#6c47ff]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
							<div className="absolute inset-0 rounded-xl border border-[#6c47ff]/20 group-hover:border-[#6c47ff]/40 transition-all duration-500">
								<div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#6c47ff]/0 via-[#6c47ff]/50 to-[#6c47ff]/0 opacity-0 group-hover:opacity-100 animate-border-shine"></div>
							</div>
							
							{/* Feature Icon */}
							<div className="w-16 h-16 rounded-full bg-[#6c47ff]/10 flex items-center justify-center mb-4 relative z-10 group-hover:scale-110 transition-all duration-300">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#6c47ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								<div className="absolute inset-0 bg-[#6c47ff]/30 rounded-full blur-md animate-pulse-slow"></div>
							</div>
							
							<h3 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold text-[#6c47ff] relative z-10 group-hover:text-[#8b6aff] transition-colors duration-300 mb-2">Internal Papers</h3>
							<p className="text-white/80 text-xs xs:text-sm sm:text-base md:text-lg mt-2 relative z-10">Access a comprehensive collection of previous internal exam papers with solutions to enhance your preparation.</p>
							{/* <span className="mt-4 text-[#6c47ff]/80 text-xs inline-flex items-center relative z-10">
								<span>Browse Papers</span>
								<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
								</svg>
							</span> */}
						</div>
						
						<div className="group p-8 rounded-xl backdrop-blur-md bg-gradient-to-br from-[#6c47ff]/5 via-[#6c47ff]/10 to-[#6c47ff]/5 hover:bg-gradient-to-br hover:from-[#6c47ff]/10 hover:via-[#6c47ff]/15 hover:to-[#6c47ff]/10 transition-all duration-500 relative overflow-hidden shadow-[0_0_15px_rgba(108,71,255,0.15)] hover:shadow-[0_0_25px_rgba(108,71,255,0.25)] flex flex-col items-center text-center">
							<div className="absolute inset-0 bg-gradient-to-br from-[#6c47ff]/0 via-[#6c47ff]/5 to-[#6c47ff]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
							<div className="absolute inset-0 rounded-xl border border-[#6c47ff]/20 group-hover:border-[#6c47ff]/40 transition-all duration-500">
								<div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#6c47ff]/0 via-[#6c47ff]/50 to-[#6c47ff]/0 opacity-0 group-hover:opacity-100 animate-border-shine"></div>
							</div>
							
							{/* Feature Icon */}
							<div className="w-16 h-16 rounded-full bg-[#6c47ff]/10 flex items-center justify-center mb-4 relative z-10 group-hover:scale-110 transition-all duration-300">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#6c47ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
								<div className="absolute inset-0 bg-[#6c47ff]/30 rounded-full blur-md animate-pulse-slow"></div>
							</div>
							
							<h3 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold text-[#6c47ff] relative z-10 group-hover:text-[#8b6aff] transition-colors duration-300 mb-2">University PYQs</h3>
							<p className="text-white/80 text-xs xs:text-sm sm:text-base md:text-lg mt-2 relative z-10">Expertly curated previous year question papers for all subjects to build your confidence and exam readiness.</p>
							<span className="mt-4 text-[#6c47ff]/80 text-xs inline-flex items-center relative z-10">
								{/* <span>Explore PYQs</span> */}
								{/* <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
								</svg> */}
							</span>
						</div>
						
						<div className="group p-8 rounded-xl backdrop-blur-md bg-gradient-to-br from-[#6c47ff]/5 via-[#6c47ff]/10 to-[#6c47ff]/5 hover:bg-gradient-to-br hover:from-[#6c47ff]/10 hover:via-[#6c47ff]/15 hover:to-[#6c47ff]/10 transition-all duration-500 relative overflow-hidden shadow-[0_0_15px_rgba(108,71,255,0.15)] hover:shadow-[0_0_25px_rgba(108,71,255,0.25)] flex flex-col items-center text-center">
							<div className="absolute inset-0 bg-gradient-to-br from-[#6c47ff]/0 via-[#6c47ff]/5 to-[#6c47ff]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
							<div className="absolute inset-0 rounded-xl border border-[#6c47ff]/20 group-hover:border-[#6c47ff]/40 transition-all duration-500">
								<div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#6c47ff]/0 via-[#6c47ff]/50 to-[#6c47ff]/0 opacity-0 group-hover:opacity-100 animate-border-shine"></div>
							</div>
							
							{/* Feature Icon */}
							<div className="w-16 h-16 rounded-full bg-[#6c47ff]/10 flex items-center justify-center mb-4 relative z-10 group-hover:scale-110 transition-all duration-300">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#6c47ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
								</svg>
								<div className="absolute inset-0 bg-[#6c47ff]/30 rounded-full blur-md animate-pulse-slow"></div>
							</div>
							
							<h3 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold text-[#6c47ff] relative z-10 group-hover:text-[#8b6aff] transition-colors duration-300 mb-2">24/7 Mentorship</h3>
							<p className="text-white/80 text-xs xs:text-sm sm:text-base md:text-lg mt-2 relative z-10">Direct WhatsApp guidance from experienced mentors anytime you need help, day or night, throughout your academic journey.</p>
							{/* <span className="mt-4 text-[#6c47ff]/80 text-xs inline-flex items-center relative z-10">
								<span>Connect Now</span>
								<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
								</svg>
							</span> */}
						</div>
					</div>
				</div>
			</div>

			{/* Timeline Section */}
			<div ref={timelineRef} className="w-full max-w-5xl mx-auto px-4 xs:px-6 sm:px-8 md:px-10 py-8 xs:py-12 sm:py-16 md:py-20">
        <div className="relative mb-10 xs:mb-12 sm:mb-16 text-center">
          <h2 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white inline-block relative">
            How it works
            <div className="absolute -bottom-2 xs:-bottom-3 left-0 right-0">
              <div className="h-0.5 xs:h-1 bg-gradient-to-r from-transparent via-[#6c47ff] to-transparent opacity-75"></div>
              <div className="h-0.5 xs:h-1 bg-gradient-to-r from-transparent via-[#6c47ff] to-transparent opacity-75 animate-glow-pulse"></div>
            </div>
          </h2>
          <p className="text-sm xs:text-base sm:text-lg md:text-xl text-white/80 mt-4 xs:mt-6 font-normal max-w-xs xs:max-w-sm sm:max-w-xl md:max-w-2xl mx-auto leading-relaxed animate-fade-in-up">
            Experience a seamless journey from exam notes to one-to-one mentorship, giving you complete control over your academic success
          </p>
        </div>
				<div className="relative">
					{/* Enhanced Vertical Line with Animation - Only visible on desktop */}
					<div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full timeline-line">
						{/* Base gradient line */}
						<div className="absolute inset-0 w-1 bg-gradient-to-b from-[#6c47ff] via-[#6c47ff]/50 to-[#6c47ff] rounded-full"></div>
						{/* Animated overlay */}
						<div className="absolute inset-0 w-1 bg-gradient-to-b from-[#6c47ff] via-[#ff47c7] to-[#6c47ff] rounded-full animate-glow-pulse"></div>
						{/* Glow effect */}
						<div className="absolute inset-0 w-1 bg-[#6c47ff] rounded-full blur-sm"></div>
					</div>

					{/* Timeline Items */}
					<div className="space-y-8 md:space-y-0">
						{/* Mobile Cards / Desktop Timeline */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0">
							{/* Step 1 */}
							<div className="md:col-span-1 md:pr-12 md:text-right relative group">
								{/* Desktop timeline dot */}
								<div className="hidden md:block absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
									<div className="w-8 h-8 bg-[#6c47ff] rounded-full shadow-[0_0_20px_#6c47ff] z-10">
										<div className="absolute inset-0 rounded-full animate-ping-slow bg-[#6c47ff]/40"></div>
									</div>
								</div>
								{/* Card Content */}
								<div className="bg-[#6c47ff]/10 p-6 rounded-xl backdrop-blur-sm border border-[#6c47ff]/20 hover:border-[#6c47ff]/40 transition-all shadow-lg hover:shadow-[#6c47ff]/10 md:transform md:transition-transform md:duration-300 md:hover:-translate-x-2">
									<div className="flex items-center md:justify-end gap-3 mb-4">
										<span className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold text-[#6c47ff] bg-[#6c47ff]/20 rounded-full md:order-last">1</span>
										<h3 className="text-xl lg:text-2xl font-bold text-[#6c47ff] tracking-tight">Secure Google Sign-In</h3>
									</div>
									<p className="text-white/90 text-base lg:text-lg leading-relaxed">
										Users can quickly and safely log in using their Google account, ensuring a smooth and secure authentication process.
									</p>
								</div>
							</div>

							{/* Step 2 */}
							<div className="md:col-span-1 md:pl-12 relative group md:mt-32">
								{/* Desktop timeline dot */}
								<div className="hidden md:block absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
									<div className="w-8 h-8 bg-[#6c47ff] rounded-full shadow-[0_0_20px_#6c47ff] z-10">
										<div className="absolute inset-0 rounded-full animate-ping-slow bg-[#6c47ff]/40 delay-300"></div>
									</div>
								</div>
								{/* Card Content */}
								<div className="bg-[#6c47ff]/10 p-6 rounded-xl backdrop-blur-sm border border-[#6c47ff]/20 hover:border-[#6c47ff]/40 transition-all shadow-lg hover:shadow-[#6c47ff]/10 md:transform md:transition-transform md:duration-300 md:hover:translate-x-2">
									<div className="flex items-center gap-3 mb-4">
										<span className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold text-[#6c47ff] bg-[#6c47ff]/20 rounded-full">2</span>
										<h3 className="text-xl lg:text-2xl font-bold text-[#6c47ff] tracking-tight">Smart Dashboard Access</h3>
									</div>
									<p className="text-white/90 text-base lg:text-lg leading-relaxed">
										After signing in, users can view all their folders and PDFs in a well-organized dashboard for easy access and management.
									</p>
								</div>
							</div>

							{/* Step 3 */}
							<div className="md:col-span-1 md:pr-12 md:text-right relative group">
								{/* Desktop timeline dot */}
								<div className="hidden md:block absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2">
									<div className="w-8 h-8 bg-[#6c47ff] rounded-full shadow-[0_0_20px_#6c47ff] z-10">
										<div className="absolute inset-0 rounded-full animate-ping-slow bg-[#6c47ff]/40 delay-600"></div>
									</div>
								</div>
								{/* Card Content */}
								<div className="bg-[#6c47ff]/10 p-6 rounded-xl backdrop-blur-sm border border-[#6c47ff]/20 hover:border-[#6c47ff]/40 transition-all shadow-lg hover:shadow-[#6c47ff]/10 md:transform md:transition-transform md:duration-300 md:hover:-translate-x-2">
									<div className="flex items-center md:justify-end gap-3 mb-4">
										<span className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold text-[#6c47ff] bg-[#6c47ff]/20 rounded-full md:order-last">3</span>
										<h3 className="text-xl lg:text-2xl font-bold text-[#6c47ff] tracking-tight">Quick Search & Navigation</h3>
									</div>
									<p className="text-white/90 text-base lg:text-lg leading-relaxed">
										A powerful search and filter option helps users instantly locate the desired PDF by name, keyword, or folder.
									</p>
								</div>
							</div>

							{/* Step 4 */}
							<div className="md:col-span-1 md:pl-12 relative group md:mt-32">
								{/* Desktop timeline dot */}
								<div className="hidden md:block absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
									<div className="w-8 h-8 bg-[#6c47ff] rounded-full shadow-[0_0_20px_#6c47ff] z-10">
										<div className="absolute inset-0 rounded-full animate-ping-slow bg-[#6c47ff]/40 delay-900"></div>
									</div>
								</div>
								{/* Card Content */}
								<div className="bg-[#6c47ff]/10 p-6 rounded-xl backdrop-blur-sm border border-[#6c47ff]/20 hover:border-[#6c47ff]/40 transition-all shadow-lg hover:shadow-[#6c47ff]/10 md:transform md:transition-transform md:duration-300 md:hover:translate-x-2">
									<div className="flex items-center gap-3 mb-4">
										<span className="inline-flex items-center justify-center w-8 h-8 text-sm font-bold text-[#6c47ff] bg-[#6c47ff]/20 rounded-full">4</span>
										<h3 className="text-xl lg:text-2xl font-bold text-[#6c47ff] tracking-tight">Protected PDF Viewing</h3>
									</div>
									<p className="text-white/90 text-base lg:text-lg leading-relaxed">
										Selected PDFs open in a secure viewer that prevents downloads, copying, or sharing — ensuring complete data privacy and content protection.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Testimonials Section */}
			<div ref={testimonialsRef} className="w-full max-w-7xl mx-auto px-4 py-12 sm:py-16 md:py-24">
				<div className="text-center mb-12 sm:mb-16 md:mb-20">
					<span className="inline-block text-[#6c47ff] text-sm font-semibold tracking-wider uppercase mb-3 px-3 py-1 bg-[#6c47ff]/5 rounded-full">Student Success Stories</span>
					<br />
					<h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-white inline-block relative">
						What Our Students Say
						<div className="absolute -bottom-2 xs:-bottom-3 left-0 right-0">
							<div className="h-0.5 xs:h-1 bg-gradient-to-r from-transparent via-[#6c47ff] to-transparent opacity-50"></div>
						</div>
					</h2>
				</div>
                
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
					{/* Testimonial 1 */}
					<div className="bg-gradient-to-br from-[#6c47ff]/10 via-[#6c47ff]/15 to-[#6c47ff]/10 backdrop-blur-md rounded-2xl border border-[#6c47ff]/20 p-6 sm:p-8 relative">
						<div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 w-20 h-20 bg-[#47ffd1]/10 rounded-full blur-xl"></div>
						<div className="text-[#6c47ff] mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="currentColor" className="opacity-40">
								<path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
							</svg>
						</div>
						<p className="text-white/80 italic mb-6 text-sm sm:text-base">
							"The resources on Ignite helped me secure a top rank in my semester exams. The well-organized notes and 24/7 mentorship made a huge difference in my preparation strategy."
						</p>
						<div className="flex items-center">
							<div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6c47ff] to-[#8b6aff] flex items-center justify-center text-white font-bold text-lg">
								AR
							</div>
							<div className="ml-4">
								<h4 className="text-white font-medium text-sm sm:text-base">Ananya Rajput</h4>
								<p className="text-white/60 text-xs sm:text-sm">Computer Science, 3rd Year</p>
							</div>
						</div>
					</div>
                    
					{/* Testimonial 2 */}
					<div className="bg-gradient-to-br from-[#6c47ff]/10 via-[#6c47ff]/15 to-[#6c47ff]/10 backdrop-blur-md rounded-2xl border border-[#6c47ff]/20 p-6 sm:p-8 relative">
						<div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 w-20 h-20 bg-[#47ffd1]/10 rounded-full blur-xl"></div>
						<div className="text-[#6c47ff] mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="currentColor" className="opacity-40">
								<path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
							</svg>
						</div>
						<p className="text-white/80 italic mb-6 text-sm sm:text-base">
							"Having access to previous year question papers was a game-changer for me. I could identify patterns and focus on important topics, which helped me score in my finals."
						</p>
						<div className="flex items-center">
							<div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6c47ff] to-[#47ffd1] flex items-center justify-center text-white font-bold text-lg">
								RK
							</div>
							<div className="ml-4">
								<h4 className="text-white font-medium text-sm sm:text-base">Rohan Kumar</h4>
								<p className="text-white/60 text-xs sm:text-sm">Mechanical Engineering, 2nd Year</p>
							</div>
						</div>
					</div>
                    
					{/* Testimonial 3 */}
					<div className="bg-gradient-to-br from-[#6c47ff]/10 via-[#6c47ff]/15 to-[#6c47ff]/10 backdrop-blur-md rounded-2xl border border-[#6c47ff]/20 p-6 sm:p-8 relative">
						<div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 w-20 h-20 bg-[#47ffd1]/10 rounded-full blur-xl"></div>
						<div className="text-[#6c47ff] mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="currentColor" className="opacity-40">
								<path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
							</svg>
						</div>
						<p className="text-white/80 italic mb-6 text-sm sm:text-base">
							"The night before my exams, I had some urgent questions. The mentors at Ignite responded immediately on WhatsApp and cleared all my doubts. Their support has been invaluable throughout my academic journey."
						</p>
						<div className="flex items-center">
							<div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ff47c7] to-[#6c47ff] flex items-center justify-center text-white font-bold text-lg">
								PS
							</div>
							<div className="ml-4">
								<h4 className="text-white font-medium text-sm sm:text-base">Priya Sharma</h4>
								<p className="text-white/60 text-xs sm:text-sm">Electronics, 2nd Year</p>
							</div>
						</div>
					</div>
				</div>
                
				{/* Call to Action */}
				<div className="mt-16 text-center">
					<a href="/login" className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#6c47ff] to-[#5433b7] text-white text-base sm:text-lg font-bold rounded-xl overflow-hidden shadow-[0_0_20px_rgba(108,71,255,0.3)] hover:shadow-[0_0_25px_rgba(108,71,255,0.5)] transition-all duration-500">
						<div className="absolute inset-0 bg-gradient-to-r from-[#8b6aff] to-[#6544e0] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
						<div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.15]"></div>
						<span className="relative">Join Our Community Today</span>
						<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 relative group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
						</svg>
						<div className="absolute inset-0 rounded-xl ring-2 ring-[#6c47ff]/50 group-hover:ring-[#6c47ff] transition-all duration-300">
							<div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-[#6c47ff]/0 via-[#6c47ff]/50 to-[#6c47ff]/0 opacity-0 group-hover:opacity-100 animate-border-shine"></div>
						</div>
					</a>
				</div>
			</div>
			
			{/* Contact Section */}
			<div ref={contactRef} id="contact" className="w-full max-w-6xl mx-auto px-4 py-16 sm:py-20 md:py-24">
				<div className="text-center mb-12">
					
					<h2 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-white inline-block relative">
						Contact Us
						<div className="absolute -bottom-2 xs:-bottom-3 left-0 right-0">
							<div className="h-0.5 xs:h-1 bg-gradient-to-r from-transparent via-[#6c47ff] to-transparent opacity-50"></div>
						</div>
					</h2>
					<p className="mt-5 text-white/70 max-w-2xl mx-auto text-sm sm:text-base">
						Have questions about Ignite? We're here to help! Fill out the form below and our team will get back to you as soon as possible.
					</p>
				</div>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-10">
					<div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 sm:p-8">
						<form className="space-y-6">
							<div className="space-y-4">
								<div>
									<label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1">Full Name</label>
									<input 
										type="text" 
										id="name" 
										placeholder="Your name"
										className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/50 text-white placeholder-white/30 text-sm"
									/>
								</div>
								
								<div>
									<label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">Email Address</label>
									<input 
										type="email" 
										id="email" 
										placeholder="you@example.com"
										className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/50 text-white placeholder-white/30 text-sm"
									/>
								</div>
								
								<div>
									<label htmlFor="subject" className="block text-sm font-medium text-white/80 mb-1">Subject</label>
									<input 
										type="text" 
										id="subject" 
										placeholder="How can we help you?"
										className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/50 text-white placeholder-white/30 text-sm"
									/>
								</div>
								
								<div>
									<label htmlFor="message" className="block text-sm font-medium text-white/80 mb-1">Message</label>
									<textarea 
										id="message" 
										rows="4" 
										placeholder="Your message..."
										className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/50 text-white placeholder-white/30 text-sm"
									></textarea>
								</div>
							</div>
							
							<div>
								<button 
									type="submit"
									className="w-full px-6 py-3 bg-gradient-to-r from-[#6c47ff] to-[#5433b7] text-white text-sm font-medium rounded-lg hover:from-[#7b5aff] hover:to-[#6544e0] transition-all duration-300 flex items-center justify-center"
								>
									<span>Send Message</span>
									<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
									</svg>
								</button>
							</div>
						</form>
					</div>
					
					<div>
						<div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 sm:p-8 mb-6">
							<h3 className="text-white text-lg font-semibold mb-4">Contact Information</h3>
							<div className="space-y-4">
								<div className="flex items-start">
									<div className="flex-shrink-0">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#6c47ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
										</svg>
									</div>
									<div className="ml-3">
										<p className="text-white/60 text-sm">Email</p>
										<p className="text-white text-sm font-medium mt-1">ignite.samarthtmsl@gmail.com</p>
									</div>
								</div>
								
								<div className="flex items-start">
									<div className="flex-shrink-0">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#6c47ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
										</svg>
									</div>
									<div className="ml-3">
										<p className="text-white/60 text-sm">Phone</p>
										<p className="text-white text-sm font-medium mt-1">+91 62822 23170</p>
										<p className="text-white text-sm font-medium mt-1">+91 70617 51339</p>
										<p className="text-white text-sm font-medium mt-1">+91 87970 77633</p>
									</div>
								</div>
								
								<div className="flex items-start">
									<div className="flex-shrink-0">
										<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#6c47ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
									</div>
									<div className="ml-3">
										<p className="text-white/60 text-sm">Location</p>
										<p className="text-white text-sm font-medium mt-1">Techno Main Salt Lake,
											EM-4/1, Sector-V, Salt Lake,Kolkata : 700091</p>
									</div>
								</div>
							</div>
						</div>
						
						
					</div>
				</div>
			</div>

			{/* Clean Minimal Footer */}
			<div className="w-full py-12 sm:py-16 mt-12 border-t border-white/10 bg-black/20 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
					<div className="text-center md:text-left">
						<h4 className="text-white font-semibold text-lg mb-4">About Ignite</h4>
						<p className="text-white/50 text-sm leading-relaxed">
							Ignite is the ultimate educational platform designed to help students excel in their academic journey through comprehensive resources and personalized mentorship.
						</p>
					</div>
					<div className="text-center">
						<h4 className="text-white font-semibold text-lg mb-4">Quick Links</h4>
						<ul className="text-white/50 text-sm space-y-3">
							<li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-[#6c47ff] transition-colors duration-300 bg-transparent">Home</button></li>
							<li><button onClick={() => scrollToSection(featuresRef)} className="hover:text-[#6c47ff] transition-colors duration-300 bg-transparent">Features</button></li>
							<li><button onClick={() => scrollToSection(timelineRef)} className="hover:text-[#6c47ff] transition-colors duration-300 bg-transparent">How It Works</button></li>
							<li><button onClick={() => scrollToSection(contactRef)} className="hover:text-[#6c47ff] transition-colors duration-300 bg-transparent">Contact Us</button></li>
						</ul>
					</div>
					<div className="text-center md:text-right">
						<h4 className="text-white font-semibold text-lg mb-4">Connect With Us</h4>
						<div className="flex justify-center md:justify-end gap-5">
							<a href="https://www.facebook.com/samarthtmsl/" className="text-white/50 hover:text-[#6c47ff] transition-colors duration-300">
								<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
									<path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
								</svg>
							</a>
							<a href="https://www.instagram.com/samarth_tmsl/" className="text-white/50 hover:text-[#6c47ff] transition-colors duration-300">
								<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
									<path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
								</svg>
							</a>
							<a href="#" className="text-white/50 hover:text-[#6c47ff] transition-colors duration-300">
								<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
									<path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
								</svg>
							</a>
						</div>
					</div>
				</div>
                
				<div className="max-w-7xl mx-auto px-6 pt-8 mt-8 border-t border-white/10 text-center">
					<p className="text-white/40 text-sm">
						Made and Developed by Samarth{' '}
						<span className="text-[#6c47ff] font-medium hover:text-white transition-colors duration-300">
							Pravidhi
						</span>
						 | © {new Date().getFullYear()} Ignite. All rights reserved.
					</p>
				</div>
			</div>
      
      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#6c47ff] text-white shadow-lg hover:bg-[#7b5aff] transition-all duration-300 flex items-center justify-center group animate-slideIn"
          style={{ animation: 'slideIn 0.3s ease-out forwards' }}
          aria-label="Scroll to top"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 group-hover:-translate-y-1 transition-transform duration-300" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <div className="absolute inset-0 rounded-full ring-4 ring-[#6c47ff]/30 animate-ping-slow opacity-70"></div>
        </button>
      )}
		</div>
	);
};

export default Landingpage;