"use client";

import { motion } from "framer-motion";

export default function TractorAnimation() {
  return (
    <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center">
      <motion.svg
        viewBox="0 0 200 200"
        className="w-full h-full text-primary"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        {/* Chassis Group - Bouncing */}
        <motion.g
          animate={{ y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
        >
          {/* Main Body */}
          <path
            d="M40 100 L40 60 L90 60 L90 40 L110 40 L110 100 Z"
            fill="currentColor"
            className="text-white"
          />
          <path
            d="M90 60 L140 60 L160 100 L40 100"
            fill="currentColor"
            className="text-white"
          />
          {/* Cabin Window */}
          <path
            d="M95 65 L130 65 L145 95 L95 95 Z"
            fill="#E6F4FE"
            opacity="0.5"
          />
          {/* Exhaust Pipe */}
          <path
            d="M100 40 L100 20 L90 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </motion.g>

        {/* Back Wheel (Large) */}
        <motion.g
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          style={{ originX: "60px", originY: "100px" }}
        >
          <circle cx="60" cy="100" r="25" fill="none" stroke="currentColor" strokeWidth="8" className="text-action" />
          <circle cx="60" cy="100" r="5" fill="currentColor" className="text-primary" />
          {/* Spokes */}
          <path d="M60 75 L60 125" stroke="currentColor" strokeWidth="2" />
          <path d="M35 100 L85 100" stroke="currentColor" strokeWidth="2" />
        </motion.g>

        {/* Front Wheel (Small) */}
        <motion.g
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          style={{ originX: "140px", originY: "100px" }}
        >
          <circle cx="140" cy="100" r="15" fill="none" stroke="currentColor" strokeWidth="6" className="text-action" />
          <circle cx="140" cy="100" r="3" fill="currentColor" className="text-primary" />
          {/* Spokes */}
          <path d="M140 85 L140 115" stroke="currentColor" strokeWidth="2" />
          <path d="M125 100 L155 100" stroke="currentColor" strokeWidth="2" />
        </motion.g>

        {/* Ground Line - Moving backwards to simulate forward motion */}
        <motion.path
          d="M0 130 H200"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="10 10"
          animate={{ x: [-10, 0] }}
          transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
          className="text-gray-300"
        />

      </motion.svg>
    </div>
  );
}
