import React from "react";
import docsData from "../../docs/docs.json";

export default function Docs() {
  const { structure, flow, modules } = docsData;

  // Recursive renderer for items and children
  const renderItems = (items, level = 0) => {
    return (
      <ul className={level === 0 ? "ml-4 list-disc space-y-1" : "ml-8 list-circle space-y-1"}>
        {items.map((item, idx) => (
          <li key={idx}>
            <span className="font-mono text-white">{item.name}</span>
            {item.desc && <> — <span className="text-white">{item.desc}</span></>}
            {item.children && item.children.length > 0 && renderItems(item.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 py-10 px-2 sm:px-6 flex items-center justify-center animate-fade-in">
      <div className="max-w-4xl w-full mx-auto text-sm space-y-10">
        <h1 className="text-4xl font-bold text-white text-center mb-8 drop-shadow-lg">📘 Ignite Internal Docs</h1>
        {/* Project Folder Working */}
        <section className="bg-primary-800/80 rounded-2xl shadow-lg border border-primary-700 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4 text-white flex items-center gap-2"><span>📁</span>Project Folder Working</h2>
          <div className="space-y-6">
            {structure.map((section, idx) => (
              <div key={idx} className="bg-primary-900/70 rounded-xl p-4 shadow border border-primary-700">
                <div className="font-bold text-lg mb-2 flex items-center gap-2">
                  {section.folder.startsWith('backend') && <span className="text-red-400">🛠️</span>}
                  {section.folder.startsWith('admin') && <span className="text-blue-400">👨‍💼</span>}
                  {section.folder.startsWith('client') && <span className="text-green-400">💻</span>}
                  <span className="text-white">{section.folder}</span>
                </div>
                <div>{renderItems(section.items)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Backend Flow */}
        <section className="bg-primary-800/80 rounded-2xl shadow-lg border border-primary-700 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4 text-white flex items-center gap-2"><span>🔁</span>Backend Flow (PDF Handling)</h2>
          <div className="rounded-xl p-4 border border-primary-700 bg-primary-900/60 space-y-2">
            {flow.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-white/90">
                <span className="font-bold text-primary-400">{idx + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Key Modules */}
        <section className="bg-primary-800/80 rounded-2xl shadow-lg border border-primary-700 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4 text-white flex items-center gap-2"><span>🧩</span>Key Modules</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {modules.map((mod, idx) => (
              <div key={idx} className="border border-primary-700 bg-primary-900/70 p-5 rounded-xl shadow flex flex-col gap-2">
                <div className="font-semibold text-lg text-primary-300 mb-1">{mod.title}</div>
                <div className="text-sm text-white/90">{mod.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
