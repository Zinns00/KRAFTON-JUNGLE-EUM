"use client";

import { useRef, useCallback } from "react";
import { slides } from "./data";
import {
  useScrollNavigation,
  useLogoAnimation,
  useSpeechAnimation,
  useMeetingNotesAnimation,
} from "./hooks";
import { DotNavigation, ScrollIndicator } from "./components/navigation";
import {
  IntroSection,
  SilentExpertsSection,
  PassiveMeetingSection,
  WhiteboardSection,
  SpeechToSpeechSection,
  MeetingNotesSection,
  CTASection,
} from "./components/sections";

export function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnded = useCallback(() => {
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    }, 5000);
  }, []);

  // Navigation
  const { currentSlide, sectionRefs, scrollToSlide } = useScrollNavigation({
    totalSlides: slides.length,
  });

  // Logo animation for IntroSection
  const { currentLogo } = useLogoAnimation();

  // Speech-to-Speech animation
  const { activeSpeaker, activeChunkIndex, translatedChunkIndex, currentStreamData } =
    useSpeechAnimation({ isActive: currentSlide === 4 });

  // Meeting notes step animation
  const { currentStep: notesStep } = useMeetingNotesAnimation(currentSlide === 5);

  return (
    <div className="h-screen overflow-hidden bg-white">
      {/* Main scroll container */}
      <div className="h-screen overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth">

        {/* Header for sections 0, 1, 2 */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-transform duration-500 ease-out ${
            currentSlide <= 2 ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="px-10 py-5 flex items-center justify-between">
            <img src="/eum_black.png" alt="Eum" className="h-7" />
            <button className="flex items-center gap-3 px-5 py-2.5 bg-white border border-gray-300 rounded-full hover:bg-gray-50 hover:shadow-sm transition-all duration-200">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Google로 시작하기</span>
            </button>
          </div>
        </header>

        {/* Intro sections wrapper (0, 1, 2) with sticky video */}
        <div className="flex">
          {/* Left content - sections stack vertically */}
          <div className="w-[35%] flex flex-col">
            {/* Section 0: Intro */}
            <IntroSection
              ref={(el) => { sectionRefs.current[0] = el; }}
              currentLogo={currentLogo}
            />

            {/* Section 1: Silent Experts */}
            <SilentExpertsSection ref={(el) => { sectionRefs.current[1] = el; }} />

            {/* Section 2: Passive Meeting */}
            <PassiveMeetingSection ref={(el) => { sectionRefs.current[2] = el; }} />
          </div>

          {/* Right side - sticky video */}
          <div className="w-[70%]">
            <div className="sticky top-0 h-screen flex items-center justify-center">
              <div className="relative overflow-hidden rounded-xl shadow-2xl scale-[1.6] origin-center translate-x-[-10%]">
                <video
                  ref={videoRef}
                  className="w-[50vw] h-auto"
                  src="/video.mov"
                  autoPlay
                  muted
                  playsInline
                  onEnded={handleVideoEnded}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Whiteboard */}
        <WhiteboardSection
          ref={(el) => { sectionRefs.current[3] = el; }}
          isActive={currentSlide === 3}
        />

        {/* Section 4: Speech-to-Speech */}
        <SpeechToSpeechSection
          ref={(el) => { sectionRefs.current[4] = el; }}
          activeSpeaker={activeSpeaker}
          activeChunkIndex={activeChunkIndex}
          translatedChunkIndex={translatedChunkIndex}
          currentStreamData={currentStreamData}
        />

        {/* Section 5: Meeting Notes */}
        <MeetingNotesSection
          ref={(el) => { sectionRefs.current[5] = el; }}
          notesStep={notesStep}
        />

        {/* Section 6: CTA */}
        <CTASection
          ref={(el) => { sectionRefs.current[6] = el; }}
          isActive={currentSlide === 6}
        />
      </div>

      {/* Side Dot Navigation */}
      <DotNavigation
        currentSlide={currentSlide}
        totalSlides={slides.length}
        onNavigate={scrollToSlide}
      />

      {/* Scroll indicator */}
      <ScrollIndicator isVisible={currentSlide === 0} />
    </div>
  );
}
