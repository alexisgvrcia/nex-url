"use client";

import React from "react";
import { motion } from "framer-motion";
import { Github } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/providers/auth-modal-provider";
import { Particles } from "@/components/landing/background/particles";

const Button = ({
  children,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline";
}) => {
  const baseClasses =
    "inline-flex cursor-pointer items-center justify-center rounded-full px-8 h-12 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";

  const variants = {
    primary:
      "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 border border-transparent",
    outline:
      "border border-black text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10 bg-transparent",
  };

  return (
    <motion.button
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]}`}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.button>
  );
};

export default function Hero({ session }: { session: boolean }) {
  const router = useRouter();
  const { openLogin } = useAuthModal();

  const handleGetStarted = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      openLogin();
    }
  };

  return (
    <motion.section className="relative h-full grid place-content-center overflow-hidden px-4 py-24 text-gray-200">
      <div className="relative z-10 flex flex-col items-center w-full px-4">
        <motion.h1
          className="text-center text-5xl md:text-7xl font-medium"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
        >
          {["Shorten", "Your", "Links"].map((word, i) => (
            <React.Fragment key={i}>
              <motion.span
                className="inline-block bg-linear-to-br from-black to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent pb-1"
                variants={{
                  hidden: { opacity: 0, y: 10, filter: "blur(10px)" },
                  visible: {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: {
                      type: "spring",
                      damping: 12,
                      stiffness: 100,
                    }
                  },
                }}
              >
                {word}
              </motion.span>
              {i === 0 ? <br /> : " "}
            </React.Fragment>
          ))}
        </motion.h1>
        <motion.p
          className="my-6 w-full max-w-sm sm:max-w-xl text-center text-sm sm:text-base md:text-lg leading-relaxed text-gray-800 dark:text-gray-200"
          initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Clean and efficient link shortening tool. Just drop a long URL and get
          a sleek short one.
        </motion.p>
        <div className="flex flex-col sm:flex-row gap-y-4 sm:gap-y-0 sm:gap-x-4 w-full max-w-xs sm:max-w-none justify-center">
          <Button onClick={handleGetStarted} variant="primary">
            Get Started
          </Button>

          <a
            href="https://github.com/gvrciary/nex-url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline">
              <Github className="h-4 w-4 mr-2" />
              View Repository
            </Button>
          </a>
        </div>
      </div>

      <div className="absolute inset-0 z-0">
        <Particles className="h-full" />
      </div>
    </motion.section>
  );
}
