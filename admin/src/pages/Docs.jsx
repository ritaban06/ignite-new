import React from "react";
import docsData from "../../docs/docs.json";

export default function Docs() {
  const { structure, flow, modules } = docsData;

  return (
    <div className="p-6 max-w-4xl mx-auto text-sm text-white space-y-10">
      <h1 className="text-3xl font-bold">📘 Ignite Internal Docs</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2 text-white">📁 Project Folder Working</h2>
        <div className="space-y-4">
          {structure.map((section, idx) => (
            <div key={idx}>
              <div className="font-bold text-lg mb-1 text-white">
                {section.folder.startsWith('backend') && <span className="mr-2 text-red-400">🛠️</span>}
                {section.folder.startsWith('admin') && <span className="mr-2 text-blue-400">👨‍💼</span>}
                {section.folder.startsWith('client') && <span className="mr-2 text-green-400">💻</span>}
              {section.folder}
              </div>
              <ul className="ml-4 list-disc space-y-1">
                {section.items.map((file, i) => (
                  <li key={i}>
                    <span className="font-mono text-white">{file.name}</span> — <span className="text-white">{file.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2 text-white">🔁 Backend Flow (PDF Handling)</h2>
        <div className="rounded-md p-4 border border-gray-300 space-y-1">
          {flow.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-white">{idx + 1}.</span>
              <span className="text-white">{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2 text-white">🧩 Key Modules</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {modules.map((mod, idx) => (
            <div key={idx} className="border p-4 rounded-lg shadow-sm">
              <div className="font-semibold text-base text-white">{mod.title}</div>
              <div className="text-sm text-white">{mod.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
