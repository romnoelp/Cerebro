import React from "react";
import { motion } from "motion/react";
import AppSidebar from "@/components/AppSidebar";
import CodeView from "@/components/CodeView";
import { FILE_LABELS, FILE_SOURCE, LIVE_SCREENS } from "@/lib/file-contents";
import { type AppFile } from "@/types";
import ConnectionScreen from "./Connection";
import ActionsScreen from "./Actions";
import SessionScreen from "./Session";

const LIVE_COMPONENTS: Record<string, React.ReactNode> = {
  connection: <ConnectionScreen />,
  actions: <ActionsScreen />,
  session: <SessionScreen />,
};

const Dashboard = () => {
  const [selected, setSelected] = React.useState<AppFile>("connection");

  const isLive = LIVE_SCREENS.includes(selected);

  return (
    <motion.div
      key="dashboard"
      className="w-screen h-screen flex bg-white overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      {/* Left sidebar — 1/4, state persists across file changes */}
      <AppSidebar selected={selected} onSelect={setSelected} />

      {/* Main content — 3/4 */}
      <main className="w-3/4 h-full overflow-hidden">
        {isLive ? (
          LIVE_COMPONENTS[selected]
        ) : (
          <CodeView
            filename={FILE_LABELS[selected]}
            source={FILE_SOURCE[selected]}
          />
        )}
      </main>
    </motion.div>
  );
};

export default Dashboard;
