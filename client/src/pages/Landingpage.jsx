
import React, { useRef } from 'react';
import './LandingPage.css';

const Landingpage = () => {
  const featuresRef = useRef(null);

  const handleLearnMore = () => {
    if (featuresRef.current) {
      featuresRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center overflow-y-auto animate-fade-in">
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
			{/* Hero Section */}
			<div className="w-full max-w-7xl mx-auto pt-6 sm:pt-8 md:pt-12 pb-4 sm:pb-6 md:pb-8 text-center">
				<img
					src="/newlogo.webp"
					alt="Ignite"
					className="mx-auto h-12 w-auto sm:h-16 md:h-20 lg:h-24 xl:h-28 filter drop-shadow-lg"
				/>
				<h1 className="mt-4 sm:mt-6 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight animate-fade-in-down">
					Welcome to <span className="text-[#6c47ff]">Ignite</span>
				</h1>
				<p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto animate-fade-in-up">
					Tired of wasting time searching for class notes, past year papers, or guidance during exams?
					<br className="hidden sm:block" />
					<span className="block mt-2">With Ignite Premium, we bring everything you need right at your fingertips.</span>
				</p>
			</div>
			{/* CTA Section */}
			<div className="w-full max-w-6xl mx-auto text-center py-8 sm:py-12 md:py-16">
				<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 justify-center items-center">
					<a href="/login" className="group relative w-full sm:w-auto px-8 sm:px-10 md:px-12 py-3 sm:py-4 md:py-5 bg-gradient-to-r from-[#6c47ff] to-[#5433b7] text-white text-base sm:text-lg md:text-xl font-bold rounded-xl overflow-hidden">
						<div className="absolute inset-0 bg-gradient-to-r from-[#8b6aff] to-[#6544e0] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
						<div className="absolute inset-0 bg-[url('/public/noise.png')] opacity-[0.15]"></div>
						<span className="relative">Get Started</span>
						<div className="absolute inset-0 rounded-xl ring-2 ring-[#6c47ff]/50 group-hover:ring-[#6c47ff] transition-all duration-300"></div>
					</a>
					<button
						onClick={handleLearnMore}
						className="group relative w-full sm:w-auto px-8 sm:px-10 md:px-12 py-3 sm:py-4 md:py-5 bg-transparent text-white text-base sm:text-lg md:text-xl font-bold rounded-xl overflow-hidden border-2 border-[#6c47ff]/50 hover:border-[#6c47ff]"
					>
						<div className="absolute inset-0 bg-[#6c47ff] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
						<div className="absolute inset-0 bg-[url('/public/noise.png')] opacity-[0.15]"></div>
						<span className="relative">Learn More</span>
					</button>
				</div>
			</div>

			{/* Features Grid */}
			<div className="w-full mx-auto px-2 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12" style={{ zIndex: 10, position: 'relative' }}>
				<h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center mb-6 sm:mb-8 md:mb-10">Why Choose Ignite?</h2>
				<div className="features-container">
					<div className="feature-card w-[280px] sm:w-[320px] md:w-[240px] lg:w-[280px] xl:w-[320px]">
						<h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#6c47ff]">Exam-Ready Notes</h3>
						<p className="text-white/80 text-sm sm:text-base md:text-lg mt-2">Handwritten & digital notes from professors of all years.</p>
					</div>
					<div className="feature-card w-[280px] sm:w-[320px] md:w-[240px] lg:w-[280px] xl:w-[320px]">
						<h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#6c47ff]">Internal Papers</h3>
						<p className="text-white/80 text-sm sm:text-base md:text-lg mt-2">Access previous internal exam papers for practice.</p>
					</div>
					<div className="feature-card w-[280px] sm:w-[320px] md:w-[240px] lg:w-[280px] xl:w-[320px]">
						<h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#6c47ff]">University PYQs</h3>
						<p className="text-white/80 text-sm sm:text-base md:text-lg mt-2">Curated PYQs for all subjects to boost confidence.</p>
					</div>
					<div className="feature-card w-[280px] sm:w-[320px] md:w-[240px] lg:w-[280px] xl:w-[320px]">
						<h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#6c47ff]">24/7 Mentorship</h3>
						<p className="text-white/80 text-sm sm:text-base md:text-lg mt-2">Direct WhatsApp guidance from mentors anytime.</p>
					</div>
				</div>
			</div>

			{/* Timeline Section */}
			<div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16 md:py-20">
        <div className="relative mb-16 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white inline-block relative">
            How it works
            <div className="absolute -bottom-3 left-0 right-0">
              <div className="h-1 bg-gradient-to-r from-transparent via-[#6c47ff] to-transparent opacity-75"></div>
              <div className="h-1 bg-gradient-to-r from-transparent via-[#6c47ff] to-transparent opacity-75 animate-glow-pulse"></div>
            </div>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/80 mt-6 font-normal max-w-2xl mx-auto leading-relaxed animate-fade-in-up">
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
										<h3 className="text-xl lg:text-2xl font-bold text-[#6c47ff] tracking-tight">Google Sign In</h3>
									</div>
									<p className="text-white/90 text-base lg:text-lg leading-relaxed">
										Simply sign in using your Google account for a secure and hassle-free authentication process.
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
										<h3 className="text-xl lg:text-2xl font-bold text-[#6c47ff] tracking-tight">Verification Check</h3>
									</div>
									<p className="text-white/90 text-base lg:text-lg leading-relaxed">
										Our system automatically checks if you're on the approved users list to ensure exclusive access.
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
										<h3 className="text-xl lg:text-2xl font-bold text-[#6c47ff] tracking-tight">Always Available</h3>
									</div>
									<p className="text-white/90 text-base lg:text-lg leading-relaxed">
										Whether it’s midnight before an exam or mid-semester, help is just a WhatsApp away.
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
										<h3 className="text-xl lg:text-2xl font-bold text-[#6c47ff] tracking-tight">Personalized Profile</h3>
									</div>
									<p className="text-white/90 text-base lg:text-lg leading-relaxed">
										Your profile is automatically set up with information from the approved users list.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			
		</div>
	);
};

export default Landingpage;