import { motion } from "motion/react";

const SessionScreen = () => {
  return (
    <motion.main
      key="session"
      className="w-screen h-screen flex items-center justify-center bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <div className="flex flex-col items-center gap-4 text-center px-8">
        <motion.h2
          className="text-4xl font-bold text-black"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          Session Active
        </motion.h2>
        <motion.p
          className="text-black/70 text-lg max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          Your neural session has been initialised. Cerebro is ready to process
          your signals.
        </motion.p>
      </div>
    </motion.main>
  );
};

export default SessionScreen;
