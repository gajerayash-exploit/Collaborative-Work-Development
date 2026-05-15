import { motion } from "framer-motion";

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-[#07080F]">
      {/* Subtle Dark Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), 
                            linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }}
      />

      {/* Orb 1: Deep Violet */}
      <motion.div
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#5B6EF5]/20 mix-blend-screen filter blur-[80px]"
      />

      {/* Orb 2: Electric Blue */}
      <motion.div
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -50, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[20%] right-[-5%] w-[600px] h-[600px] rounded-full bg-blue-600/15 mix-blend-screen filter blur-[100px]"
      />

      {/* Orb 3: Tech Teal */}
      <motion.div
        animate={{
          x: [0, 30, -40, 0],
          y: [0, 50, -30, 0],
          scale: [1, 1.1, 0.8, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[-10%] left-[20%] w-[550px] h-[550px] rounded-full bg-[#2ECFB5]/10 mix-blend-screen filter blur-[90px]"
      />

      {/* Ambient Radial Gradient Mask to keep center clear for text readability */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at center, transparent 0%, rgba(7, 8, 15, 0.4) 50%, rgba(7, 8, 15, 1) 100%)"
        }}
      />
    </div>
  );
}
