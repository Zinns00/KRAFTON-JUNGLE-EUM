"use client";

import { forwardRef } from "react";

interface CTASectionProps {
  isActive: boolean;
}

export const CTASection = forwardRef<HTMLElement, CTASectionProps>(
  function CTASection({ isActive }, ref) {
    return (
      <section
        ref={ref}
        className="min-h-screen snap-start snap-always flex items-center justify-center bg-white px-16"
      >
        <div className="w-full max-w-6xl flex items-center justify-between">
          {/* Left: Text */}
          <div className="flex-1">
            <h1
              className={`text-5xl leading-tight text-gray-800 mb-4 transition-all duration-700 ease-out ${
                isActive
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-8"
              }`}
              style={{ fontFamily: 'Handwritten, sans-serif' }}
            >
              세상의 모든 말이 당신의 모국어가 됩니다.
            </h1>

            <p
              className={`text-2xl text-gray-500 transition-all duration-700 ease-out delay-200 ${
                isActive
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-8"
              }`}
              style={{ fontFamily: 'Handwritten, sans-serif' }}
            >
              듣고, 읽고, 말하세요. 가장 완벽한 실시간 협업의 시작.
            </p>
          </div>

          {/* Right: Button */}
          <div
            className={`transition-all duration-700 ease-out delay-400 ${
              isActive
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-8"
            }`}
          >
            <button className="group px-12 py-5 bg-gray-900 text-white text-lg font-medium hover:bg-gray-800 transition-all duration-300 flex items-center gap-3">
              시작하기
              <span className="group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>
          </div>
        </div>
      </section>
    );
  }
);
