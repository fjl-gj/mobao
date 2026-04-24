import { useState } from "react";
import Tree from "./Tree";
import Outline from "./Outline";

export default function Sidebar() {
  const [tab, setTab] = useState<"toc" | "outline">("toc");

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={tab === "toc" ? "active" : ""}
          onClick={() => setTab("toc")}
        >
          📑 目录
        </button>
        <button
          className={tab === "outline" ? "active" : ""}
          onClick={() => setTab("outline")}
        >
          🧭 大纲
        </button>
      </div>

      {tab === "toc" ? <Tree /> : <Outline />}
    </div>
  );
}