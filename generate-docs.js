const fs = require("fs");
const path = require("path");

const ROOTS = ["backend", "admin", "client"];
const OUTPUT_PATH = path.join(__dirname, "admin", "docs", "docs.json");

const IGNORE = [".git", "node_modules", "dist", ".next", ".DS_Store", "build", "android"];

function walk(dir, baseDir = dir) {
  const contents = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of contents) {
    if (IGNORE.includes(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      const children = walk(fullPath, baseDir);
      files.push({
        name: entry.name + "/",
        type: "folder",
        children,
      });
    } else {
      files.push({
        name: entry.name,
        type: "file",
        desc: guessDesc(entry.name),
      });
    }
  }

  return files;
}

function guessDesc(filename) {
  const name = filename.toLowerCase();

  if (name.includes("auth")) return "Handles authentication and JWT validation.";
  if (name.includes("upload")) return "Handles file uploads and processing.";
  if (name.includes("proxy")) return "Serves files securely via proxy.";
  if (name.includes("index")) return "Main entry point for this directory.";
  if (name.includes("pdf")) return "Manages PDF-related logic.";
  if (name.includes("analytics")) return "Logs access/view tracking.";
  if (name.includes("register")) return "User registration UI or logic.";
  return "";
}

const docsJson = {
  structure: [],
  flow: [
    "Admin uploads a PDF",
    "Backend uploads to R2 with signed URL",
    "Metadata stored in MongoDB",
    "Client fetches PDF",
    "Backend proxies PDF",
    "Access logged to DB"
  ],
  modules: []
};

for (const root of ROOTS) {
  const absPath = path.join(__dirname, root);
  const folderStructure = walk(absPath);
  docsJson.structure.push({
    folder: root,
    items: folderStructure,
  });
}

// Optional modules listing (flattened files for important folders)
const importantDirs = ["backend/controllers", "backend/utils"];
for (const dir of importantDirs) {
  const full = path.join(__dirname, dir);
  if (!fs.existsSync(full)) continue;
  const files = fs.readdirSync(full);
  for (const file of files) {
    if (file.endsWith(".js")) {
      docsJson.modules.push({
        title: file,
        desc: guessDesc(file)
      });
    }
  }
}

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(docsJson, null, 2));

console.log("✅ Full recursive docs.json generated.");
