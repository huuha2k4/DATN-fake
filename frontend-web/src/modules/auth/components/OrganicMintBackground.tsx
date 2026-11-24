import React from 'react';
import './OrganicMintBackground.css';

interface OrganicMintBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

export const OrganicMintBackground: React.FC<OrganicMintBackgroundProps> = ({ children, className = '' }) => {
  return (
    <div className={`organic-mint-bg-root ${className}`}>
      {/* Multi-layered organic ambient mesh */}
      <div className="organic-blob-mesh" aria-hidden="true">
        {/* Top-Right Hero organic bloom */}
        <div className="blob-organic blob-hero-top-right" />
        
        {/* Top-Left subtle mint aura */}
        <div className="blob-organic blob-hero-top-left" />

        {/* Mid-Left solutions bloom */}
        <div className="blob-organic blob-mid-solutions" />

        {/* Center-Right FinAI aura */}
        <div className="blob-organic blob-finai-aura" />

        {/* Bottom-Left Highlights aura */}
        <div className="blob-organic blob-highlights-bottom" />

        {/* Subtle decorative SVG shapes for extra organic depth */}
        <svg className="svg-organic-accent svg-accent-1" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M320.5 76C361.3 118.8 385.7 181.4 371.4 237C357 292.6 303.9 341.2 243.5 365.8C183.1 390.4 115.4 391 66.5 354.5C17.6 318 -12.5 244.4 4.5 186.5C21.5 128.6 85.6 86.4 148.5 53.8C211.4 21.2 279.7 33.2 320.5 76Z"
            fill="url(#paint0_radial)"
          />
          <defs>
            <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 200) rotate(90) scale(200)">
              <stop stopColor="#BDF3D8" stopOpacity="0.45" />
              <stop offset="0.6" stopColor="#E4FAEF" stopOpacity="0.25" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        <svg className="svg-organic-accent svg-accent-2" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M410 115C458 171 475 251 450 323C425 395 358 459 281 481C204 503 117 483 62 429C7 375 -16 287 11 216C38 145 115 91 193 54C271 17 362 59 410 115Z"
            fill="url(#paint1_radial)"
          />
          <defs>
            <radialGradient id="paint1_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(250 250) rotate(90) scale(250)">
              <stop stopColor="#BDF3D8" stopOpacity="0.38" />
              <stop offset="0.7" stopColor="#E4FAEF" stopOpacity="0.18" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <div className="organic-mint-content">
        {children}
      </div>
    </div>
  );
};
