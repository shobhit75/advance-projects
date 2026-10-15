// Signal Archive style reminder: warm paper foundation, ink-black editorial structure, infrared coral for active signal, cobalt for metadata, IBM Plex Mono for measurements, and an asymmetric workbench layout.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  ArrowDownToLine,
  Braces,
  Check,
  ChevronDown,
  CircleDot,
  Crosshair,
  Database,
  Download,
  FileCode2,
  FileText,
  FolderPlus,
  Grid3X3,
  Image as ImageIcon,
  Keyboard,
  Layers3,
  Minus,
  MousePointer2,
  Move,
  PanelLeft,
  Plus,
  Ruler,
  Search,
  ScanLine,
  Settings2,
  Sparkles,
  Upload,
  Users,
  X,
  ZoomIn,
} from "lucide-react";

type PixelRecord = {
  id: number;
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
  hex: string;
  label: string;
};

type PixelPoint = {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
  hex: string;
};

type SourceMeta = {
  sourceId: string;
  fileName: string;
  mimeType: string;
  byteSize: number | null;
  source: string;
  loadedAt: string;
};

const DATASET_SCHEMA_VERSION = "pixel-lab.v1";

function createSourceId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `source-${Date.now()}`;
}

function categoryForPose(pose: string) {
  return POSE_CATEGORIES.find((category) => category.poses.includes(pose as never))?.name ?? "Uncategorized";
}

const DEFAULT_IMAGE = "/manus-storage/raster-specimen-sunroom_886ca58f.jpg";
const DEFAULT_NAME = "raster-specimen-sunroom";

const POSE_CATEGORIES = [
  {
    id: "long",
    name: "Long",
    description: "Extended posture studies and full-body movement references.",
    accent: "coral",
    poses: ["Waist right bend", "Waist left bend", "Crawl on knees", "Casual sitting", "Side view", "Bending forward", "Bending backward", "Bending while sitting", "Sitting on ground · side view", "Sitting on ground · front view", "Sitting on ground · back view", "Sitting on chair · back view", "Standing · back view", "Standing · front view", "Hands joined", "Leg pull · side view", "Jumping · side view", "Hand lift"],
  },
  {
    id: "fit",
    name: "Fit",
    description: "Balanced posture, movement, and body-structure references.",
    accent: "cobalt",
    poses: ["Bend with hands joined", "Standing · front view", "Bend while kneeling", "Leg fold", "Sitting · side view", "Back sitting · body structure", "Back view · body structure", "Bending slightly · side view", "Bending · front view", "Sitting · body structure", "Standing · body structure", "Squatting"],
  },
  {
    id: "healthy",
    name: "Healthy",
    description: "Neutral and semi-formal posture references with clear structure.",
    accent: "sage",
    poses: ["Back facing · 45 degree", "Lower back on chair · structure", "Laying on stomach", "Standing at attention", "Body structure · front", "Chair sitting · side semi-formal", "Sitting · back view", "Standing · back view", "Kneel down · thigh bending", "Front body structure"],
  },
  {
    id: "small",
    name: "Small",
    description: "Compact posture variations and expressive standing references.",
    accent: "ochre",
    poses: ["Casual standing", "Awkward sitting · back", "Normal sitting · back view", "Knee and hand fold", "Kneeling · front view", "Standing surprised · back", "Standing at ease · back", "Standing happy · front", "Standing tired · back", "Standing shocked · front", "Front body structure"],
  },
  {
    id: "thin",
    name: "Thin",
    description: "Slim-body posture studies across formal and ready stances.",
    accent: "plum",
    poses: ["Formal sitting · side view", "Calm sitting · back view", "Ready standing · back view", "Standing · front view", "Front body structure"],
  },
] as const;

type PoseCategory = (typeof POSE_CATEGORIES)[number];

function PoseLibrary({ onOpenPose }: { onOpenPose: (pose: string, src: string) => void }) {
  const [activeCategoryId, setActiveCategoryId] = useState<PoseCategory["id"]>("long");
  const [uploadedByPose, setUploadedByPose] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("signal-archive.pose-uploads.v1") ?? "{}"); } catch { return {}; }
  });
  const [query, setQuery] = useState("");
  useEffect(() => { localStorage.setItem("signal-archive.pose-uploads.v1", JSON.stringify(uploadedByPose)); }, [uploadedByPose]);
  const activeCategory = POSE_CATEGORIES.find((category) => category.id === activeCategoryId) ?? POSE_CATEGORIES[0];
  const filteredPoses = activeCategory.poses.filter((pose) => pose.toLowerCase().includes(query.toLowerCase()));
  const totalPoses = POSE_CATEGORIES.reduce((total, category) => total + category.poses.length, 0);
  const uploadedCount = Object.keys(uploadedByPose).length;

  const uploadPose = (pose: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file for this pose.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedByPose((current) => ({ ...current, [pose]: String(reader.result) }));
      toast.success("Pose photo added", { description: pose });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const exportCombinedDataset = async () => {
    const entries = Object.entries(uploadedByPose);
    if (!entries.length) { toast.error("Upload at least one pose photo first."); return; }
    const lines = [JSON.stringify({ record_type: "manifest", schema_version: "pixel-lab.combined.v1", dataset_id: "human-pose-combined", created_at: new Date().toISOString(), image_count: entries.length, categories: Array.from(new Set(entries.map(([pose]) => categoryForPose(pose)))), record_schema: ["record_type", "source_id", "file_name", "category", "pose_label", "width", "height", "pixel_index", "x", "y", "x_norm", "y_norm", "r", "g", "b", "a", "hex", "rgb_int"] })];
    let totalPixels = 0;
    for (const [pose, src] of entries) {
      await new Promise<void>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) { reject(new Error("Canvas unavailable")); return; }
          context.drawImage(image, 0, 0);
          const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const sourceId = createSourceId();
          for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
            const index = (y * canvas.width + x) * 4;
            const rgba = Array.from(data.slice(index, index + 4));
            lines.push(JSON.stringify({ record_type: "pixel", source_id: sourceId, file_name: `${pose.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.image`, category: categoryForPose(pose), pose_label: pose, width: canvas.width, height: canvas.height, pixel_index: y * canvas.width + x, x, y, x_norm: canvas.width > 1 ? Number((x / (canvas.width - 1)).toFixed(6)) : 0, y_norm: canvas.height > 1 ? Number((y / (canvas.height - 1)).toFixed(6)) : 0, r: rgba[0], g: rgba[1], b: rgba[2], a: rgba[3], hex: rgbToHex(rgba[0], rgba[1], rgba[2]), rgb_int: (rgba[0] << 16) | (rgba[1] << 8) | rgba[2] }));
          }
          totalPixels += canvas.width * canvas.height;
          resolve();
        };
        image.onerror = () => reject(new Error(`Unable to read ${pose}`));
        image.src = src;
      });
    }
    downloadFile(`human-pose-combined-${new Date().toISOString().slice(0, 10)}.ndjson`, lines.join("\n"), "application/x-ndjson;charset=utf-8");
    toast.success("Combined dataset exported", { description: `${entries.length} images and ${totalPixels.toLocaleString()} pixel records saved.` });
  };

  const removePose = (pose: string) => {
    setUploadedByPose((current) => {
      const next = { ...current };
      delete next[pose];
      return next;
    });
    toast("Pose photo removed", { description: pose });
  };

  return (
    <div className="pose-library-panel">
      <div className="pose-library-main">
      <div className="pose-library-header">
        <div>
          <div className="breadcrumb"><span>DATASET LIBRARY</span><span className="breadcrumb-separator">/</span><strong>HUMAN POSE CATEGORIES</strong></div>
          <h1>Human pose library</h1>
          <p>Upload reference photos into a clear taxonomy before sampling their pixels.</p>
        </div>
          <div className="pose-library-summary"><div><span>POSE SLOTS</span><strong>{totalPoses}</strong></div><div><span>UPLOADED</span><strong>{uploadedCount.toString().padStart(2, "0")}</strong></div><button className="coral-button pose-combined-button" onClick={exportCombinedDataset}><Download size={14} /> Export combined</button></div>
      </div>
      <div className="pose-library-toolbar">
        <div className="category-tabs" role="tablist" aria-label="Human pose categories">
          {POSE_CATEGORIES.map((category) => {
            const count = category.poses.filter((pose) => uploadedByPose[pose]).length;
            return <button key={category.id} className={`category-tab ${activeCategoryId === category.id ? "active" : ""}`} onClick={() => { setActiveCategoryId(category.id); setQuery(""); }} role="tab" aria-selected={activeCategoryId === category.id}><span className={`category-swatch ${category.accent}`} />{category.name}<em>{count}/{category.poses.length}</em></button>;
          })}
        </div>
        <label className="pose-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter pose slots" aria-label="Filter pose slots" /></label>
      </div>
      <div className="category-intro"><div><span className="rail-kicker"><Users size={13} /> ACTIVE CATEGORY</span><h2>{activeCategory.name} <small>{activeCategory.poses.length} slots</small></h2></div><p>{activeCategory.description}</p></div>
      <div className="pose-grid">
        {filteredPoses.map((pose, index) => {
          const uploadedImage = uploadedByPose[pose];
          return <div className={`pose-slot ${uploadedImage ? "uploaded" : ""}`} key={pose}><div className="pose-slot-number">{String(index + 1).padStart(2, "0")}</div><div className="pose-slot-visual">{uploadedImage ? <img src={uploadedImage} alt={`${pose} reference`} /> : <div className="pose-placeholder"><ImageIcon size={18} /><span>NO PHOTO</span></div>}<span className="pose-slot-tag">{activeCategory.name.toUpperCase()}</span></div><div className="pose-slot-footer"><div><strong>{pose}</strong><span>{uploadedImage ? "Ready for pixel sampling" : "Add one reference photo"}</span></div><div className="pose-slot-actions">{uploadedImage && <button className="inspect-slot-button" onClick={() => onOpenPose(pose, uploadedImage)}><ScanLine size={13} /> Inspect</button>}<label className="upload-slot-button"><Upload size={13} /> {uploadedImage ? "Replace" : "Upload"}<input type="file" accept="image/*" onChange={(event) => uploadPose(pose, event)} hidden /></label>{uploadedImage && <button className="remove-slot-button" onClick={() => removePose(pose)} aria-label={`Remove ${pose} photo`}><X size={13} /></button>}</div></div></div>;
        })}
      </div>
      {!filteredPoses.length && <div className="pose-empty"><Search size={18} /><strong>No pose slots match “{query}”</strong><button onClick={() => setQuery("")}>Clear filter</button></div>}
      <div className="pose-library-footnote"><span><Check size={13} /> Photos stay local in this browser until you export or clear them.</span><span className="mono-text">NEXT: SELECT A SLOT → INSPECT PIXELS</span></div>
      </div>
      <aside className="pose-library-side">
        <div className="pose-side-header"><span className="rail-kicker"><ScanLine size={13} /> CAPTURE STATUS</span><span className="status-pill ready"><span /> LOCAL</span></div>
        <div className="pose-side-number">{uploadedCount.toString().padStart(2, "0")}<small> / {totalPoses}</small></div>
        <p className="pose-side-lede">Reference photos ready for pixel-level inspection.</p>
        <div className="pose-side-progress"><span style={{ width: `${totalPoses ? (uploadedCount / totalPoses) * 100 : 0}%` }} /></div>
        <div className="pose-side-rule" />
        <div className="pose-side-block"><span className="rail-kicker"><Users size={13} /> CATEGORY MAP</span><div className="pose-category-map">{POSE_CATEGORIES.map((category) => <button key={category.id} onClick={() => { setActiveCategoryId(category.id); setQuery(""); }} className={activeCategoryId === category.id ? "active" : ""}><span className={`category-swatch ${category.accent}`} /><strong>{category.name}</strong><span>{category.poses.length} slots</span><em>{category.poses.filter((pose) => uploadedByPose[pose]).length}</em></button>)}</div></div>
        <div className="pose-side-block"><span className="rail-kicker"><Crosshair size={13} /> CAPTURE PROTOCOL</span><ol className="protocol-list"><li>Select a category slot.</li><li>Upload a clear reference photo.</li><li>Open Workspace to sample pixels.</li></ol></div>
        <div className="pose-side-callout"><Sparkles size={14} /><span>Keep pose names consistent so exported labels remain explainable.</span></div>
      </aside>
    </div>
  );
}

function toHex(value: number) {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState(DEFAULT_IMAGE);
  const [imageName, setImageName] = useState(DEFAULT_NAME);
  const [sourceMeta, setSourceMeta] = useState<SourceMeta>({ sourceId: createSourceId(), fileName: `${DEFAULT_NAME}.jpg`, mimeType: "image/jpeg", byteSize: null, source: "generated-specimen", loadedAt: new Date().toISOString() });
  const [datasetSplit, setDatasetSplit] = useState("train");
  const [datasetStatus, setDatasetStatus] = useState("draft");
  const [datasetNotes, setDatasetNotes] = useState("");
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [selectedPixel, setSelectedPixel] = useState<PixelPoint | null>(null);
  const [hoverPixel, setHoverPixel] = useState<PixelPoint | null>(null);
  const [pixelRecords, setPixelRecords] = useState<PixelRecord[]>([]);
  const [label, setLabel] = useState("unlabeled");
  const [zoom, setZoom] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);
  const [tool, setTool] = useState<"select" | "pan" | "ruler">("select");
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("Human poses");
  const [showShortcuts, setShowShortcuts] = useState(false);

  const getPixelAt = useCallback((x: number, y: number, source = imageData) => {
    if (!source || x < 0 || y < 0 || x >= source.width || y >= source.height) return null;
    const index = (y * source.width + x) * 4;
    const [r, g, b, a] = Array.from(source.data.slice(index, index + 4));
    return { x, y, r, g, b, a, hex: rgbToHex(r, g, b) };
  }, [imageData]);

  useEffect(() => {
    setIsLoading(true);
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const offscreen = document.createElement("canvas");
      offscreen.width = image.naturalWidth;
      offscreen.height = image.naturalHeight;
      const context = offscreen.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0);
      const nextImageData = context.getImageData(0, 0, offscreen.width, offscreen.height);
      setImageData(nextImageData);
      const initialX = Math.round(nextImageData.width * 0.54);
      const initialY = Math.round(nextImageData.height * 0.46);
      const initialPixel = getPixelAt(initialX, initialY, nextImageData);
      setSelectedPixel(initialPixel);
      setPixelRecords([]);
      setZoom(1);
      setIsLoading(false);
    };
    image.onerror = () => {
      setIsLoading(false);
      toast.error("This image could not be read. Try another file.");
    };
    image.src = imageSrc;
  }, [getPixelAt, imageSrc]);

  useEffect(() => {
    if (!canvasRef.current || !imageData) return;
    const context = canvasRef.current.getContext("2d");
    if (!context) return;
    canvasRef.current.width = imageData.width;
    canvasRef.current.height = imageData.height;
    context.putImageData(imageData, 0, 0);
  }, [imageData]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT") return;
      if (event.key.toLowerCase() === "x") capturePixel();
      if (event.key.toLowerCase() === "g") setGridVisible((value) => !value);
      if (event.key === "Escape") setHoverPixel(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const capturePixel = useCallback(() => {
    if (!selectedPixel) return;
    const record: PixelRecord = { ...selectedPixel, id: Date.now(), label: label.trim() || "unlabeled" };
    setPixelRecords((records) => [record, ...records]);
    toast.success(`Pixel ${selectedPixel.x}, ${selectedPixel.y} recorded`, {
      description: `${selectedPixel.hex} added to the dataset queue.`,
    });
  }, [label, selectedPixel]);

  const handleCanvasPointer = (event: React.PointerEvent<HTMLCanvasElement>, commit: boolean) => {
    if (tool !== "select" || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.min(canvasRef.current.width - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * canvasRef.current.width)));
    const y = Math.min(canvasRef.current.height - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * canvasRef.current.height)));
    const nextPixel = getPixelAt(x, y);
    if (!nextPixel) return;
    setHoverPixel(nextPixel);
    if (commit) setSelectedPixel(nextPixel);
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a PNG, JPG, GIF, or WebP image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageName(file.name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/\s+/g, "-"));
      setSourceMeta({ sourceId: createSourceId(), fileName: file.name, mimeType: file.type, byteSize: file.size, source: "local-upload", loadedAt: new Date().toISOString() });
      setImageSrc(String(reader.result));
      toast.success("Source image loaded", { description: "Click any pixel to begin sampling." });
    };
    reader.readAsDataURL(file);
  };

  const buildManifest = (pixelCount: number) => ({
    schema_version: DATASET_SCHEMA_VERSION,
    dataset_id: imageName,
    created_at: sourceMeta.loadedAt,
    updated_at: new Date().toISOString(),
    split: datasetSplit,
    status: datasetStatus,
    notes: datasetNotes || null,
    source: { ...sourceMeta, width: imageData?.width ?? null, height: imageData?.height ?? null, channels: 4, color_space: "sRGB", alpha_mode: "straight" },
    annotation: { category: categoryForPose(label), pose_label: label === "unlabeled" ? null : label, coordinate_origin: "top-left", x_axis: "left-to-right", y_axis: "top-to-bottom" },
    records: { sampled_count: pixelRecords.length, full_pixel_count: pixelCount, record_unit: "one row per pixel", full_export_format: "NDJSON" },
    pixel_schema: ["pixel_index", "x", "y", "x_norm", "y_norm", "r", "g", "b", "a", "hex", "rgb_int", "label", "category", "source_id", "split", "status"],
  });

  const makeFullPixelRecord = (x: number, y: number, index: number, rgba: number[]) => ({
    pixel_index: index,
    x,
    y,
    x_norm: imageData && imageData.width > 1 ? Number((x / (imageData.width - 1)).toFixed(6)) : 0,
    y_norm: imageData && imageData.height > 1 ? Number((y / (imageData.height - 1)).toFixed(6)) : 0,
    r: rgba[0],
    g: rgba[1],
    b: rgba[2],
    a: rgba[3],
    hex: rgbToHex(rgba[0], rgba[1], rgba[2]),
    rgb_int: (rgba[0] << 16) | (rgba[1] << 8) | rgba[2],
    label: label === "unlabeled" ? null : label,
    category: categoryForPose(label),
    source_id: sourceMeta.sourceId,
    split: datasetSplit,
    status: datasetStatus,
  });

  const exportManifest = () => {
    const manifest = buildManifest(imageData ? imageData.width * imageData.height : 0);
    downloadFile(`${imageName}-manifest.json`, JSON.stringify(manifest, null, 2), "application/json");
    toast.success("Dataset manifest exported", { description: "Metadata and pixel schema saved." });
  };

  const exportFullPixels = () => {
    if (!imageData) { toast.error("Load an image before exporting full pixels."); return; }
    const lines = [JSON.stringify({ record_type: "manifest", ...buildManifest(imageData.width * imageData.height) })];
    for (let y = 0; y < imageData.height; y += 1) {
      for (let x = 0; x < imageData.width; x += 1) {
        const index = (y * imageData.width + x) * 4;
        lines.push(JSON.stringify(makeFullPixelRecord(x, y, y * imageData.width + x, Array.from(imageData.data.slice(index, index + 4)))));
      }
    }
    downloadFile(`${imageName}-pixels.ndjson`, lines.join("\n"), "application/x-ndjson;charset=utf-8");
    toast.success("Full pixel dataset exported", { description: `${imageData.width.toLocaleString()} × ${imageData.height.toLocaleString()} pixel records saved.` });
  };

  const exportJson = () => {
    if (!pixelRecords.length) {
      toast.error("Record at least one pixel before exporting.");
      return;
    }
    const payload = { manifest: buildManifest(pixelRecords.length), pixels: pixelRecords.map(({ id: _id, ...record }) => ({ ...record, category: categoryForPose(record.label), source_id: sourceMeta.sourceId, split: datasetSplit, status: datasetStatus })) };
    downloadFile(`${imageName}-pixels.json`, JSON.stringify(payload, null, 2), "application/json");
    toast.success("JSON dataset exported", { description: `${pixelRecords.length} pixel records saved.` });
  };

  const exportCsv = () => {
    if (!pixelRecords.length) {
      toast.error("Record at least one pixel before exporting.");
      return;
    }
    const rows = ["x,y,r,g,b,a,hex,label", ...pixelRecords.map(({ x, y, r, g, b, a, hex, label: recordLabel }) => [x, y, r, g, b, a, hex, `"${recordLabel.replace(/"/g, '""')}"`].join(","))];
    downloadFile(`${imageName}-pixels.csv`, rows.join("\n"), "text/csv;charset=utf-8");
    toast.success("CSV dataset exported", { description: `${pixelRecords.length} pixel records saved.` });
  };

  const openPoseInWorkspace = (pose: string, src: string) => {
    setImageName(pose.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    setSourceMeta({ sourceId: createSourceId(), fileName: `${pose.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.image`, mimeType: "image/*", byteSize: null, source: "human-pose-library", loadedAt: new Date().toISOString() });
    setImageSrc(src);
    setLabel(pose);
    setActiveNav("Workspace");
    toast.success("Pose opened in Workspace", { description: `${pose} is ready for pixel sampling.` });
  };

  const clearRecords = () => {
    setPixelRecords([]);
    toast("Dataset queue cleared", { description: "The source image and selected pixel remain untouched." });
  };

  const sampledColors = useMemo(() => pixelRecords.slice(0, 18).map((record) => record.hex), [pixelRecords]);
  const dimensions = imageData ? `${imageData.width.toLocaleString()} × ${imageData.height.toLocaleString()}` : "—";
  const activePixel = selectedPixel ?? hoverPixel;
  const pixelPositionStyle = activePixel && imageData ? {
    left: `${((activePixel.x + 0.5) / imageData.width) * 100}%`,
    top: `${((activePixel.y + 0.5) / imageData.height) * 100}%`,
  } : undefined;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark-frame">
            <img src="/manus-storage/signal-archive-mark_bd21ae34.png" alt="" className="brand-mark" />
          </div>
          <div>
            <div className="brand-name">SIGNAL ARCHIVE</div>
            <div className="brand-product">PIXEL LAB <span className="brand-slash">/</span> LOCAL WORKSPACE</div>
          </div>
        </div>
        <div className="topbar-context">
          <span className="live-dot" />
          <span>Browser session</span>
          <span className="context-divider" />
          <span className="mono-text">v0.8.2</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" aria-label="Keyboard shortcuts" onClick={() => setShowShortcuts(true)}><Keyboard size={16} /></button>
          <button className="quiet-button" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Open source</button>
          <button className="coral-button" onClick={exportJson}><ArrowDownToLine size={15} /> Export JSON</button>
        </div>
      </header>

      <div className="workspace-frame">
        <aside className="left-rail">
          <div className="rail-section rail-nav-section">
            <div className="rail-kicker"><PanelLeft size={13} /> NAVIGATE</div>
            <nav className="rail-nav" aria-label="Workspace sections">
              {[{ label: "Workspace", icon: ScanLine }, { label: "Human poses", icon: Users }, { label: "Batches", icon: Layers3 }, { label: "Exports", icon: Archive }].map(({ label: navLabel, icon: NavIcon }) => (
                <button key={navLabel} className={`nav-item ${activeNav === navLabel ? "active" : ""}`} onClick={() => {
                  setActiveNav(navLabel);
                  if (navLabel !== "Workspace") toast(`${navLabel} view`, { description: "This lightweight local builder keeps all work in the current workspace." });
                }}>
                  <NavIcon size={15} /> <span>{navLabel}</span>
                  {navLabel === "Workspace" && <span className="nav-count">01</span>}
                </button>
              ))}
            </nav>
          </div>

          <div className="rail-section source-section">
            <div className="rail-section-heading">
              <div className="rail-kicker"><Database size={13} /> SOURCE IMAGE</div>
              <button className="mini-icon-button" aria-label="Add source image" onClick={() => fileInputRef.current?.click()}><Plus size={14} /></button>
            </div>
            <button className="source-card" onClick={() => fileInputRef.current?.click()}>
              <div className="source-thumb-wrap">
                <img src={imageSrc} alt="Current source specimen" className="source-thumb" />
                <span className="source-thumb-badge"><ImageIcon size={11} /> RGB</span>
              </div>
              <div className="source-card-copy">
                <strong>{imageName}</strong>
                <span>{dimensions} px</span>
              </div>
              <ChevronDown size={15} className="source-chevron" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleFile} hidden />
          </div>

          <div className="rail-section source-meta-section">
            <div className="rail-kicker"><Settings2 size={13} /> CAPTURE PROFILE</div>
            <div className="meta-list">
              <div className="meta-row"><span>Color space</span><strong>RGBA / 8-bit</strong></div>
              <div className="meta-row"><span>Coordinate origin</span><strong>Top-left</strong></div>
              <div className="meta-row"><span>Sample mode</span><strong>Single pixel</strong></div>
            </div>
          </div>

          <div className="left-rail-note">
            <div className="note-icon"><Sparkles size={14} /></div>
            <div><strong>Every pixel is a record.</strong><span>Click a point in the specimen to inspect it.</span></div>
          </div>
        </aside>

        {activeNav === "Human poses" ? <PoseLibrary onOpenPose={openPoseInWorkspace} /> : <main className="inspection-panel">
          <div className="inspection-header">
            <div>
              <div className="breadcrumb"><span>WORKSPACE</span><span className="breadcrumb-separator">/</span><strong>{imageName}</strong></div>
              <h1>Pixel inspection bay</h1>
            </div>
            <div className="inspection-header-meta">
              <div className="header-stat"><span>RECORDS</span><strong>{pixelRecords.length.toString().padStart(2, "0")}</strong></div>
              <div className="header-stat"><span>DIMENSIONS</span><strong>{dimensions}</strong></div>
            </div>
          </div>

          <div className="tool-strip">
            <div className="tool-group">
              {[{ id: "select", label: "Select", icon: MousePointer2, shortcut: "X" }, { id: "pan", label: "Pan", icon: Move, shortcut: "H" }, { id: "ruler", label: "Measure", icon: Ruler, shortcut: "R" }].map(({ id, label: toolLabel, icon: ToolIcon, shortcut }) => (
                <button key={id} className={`tool-button ${tool === id ? "active" : ""}`} onClick={() => setTool(id as "select" | "pan" | "ruler")}>
                  <ToolIcon size={15} /> <span>{toolLabel}</span><kbd>{shortcut}</kbd>
                </button>
              ))}
            </div>
            <div className="tool-group tool-group-right">
              <button className={`tool-button ${gridVisible ? "active-light" : ""}`} onClick={() => setGridVisible((visible) => !visible)}><Grid3X3 size={15} /><span>Grid</span></button>
              <span className="tool-divider" />
              <button className="zoom-button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))))}><Minus size={15} /></button>
              <span className="zoom-value">{Math.round(zoom * 100)}%</span>
              <button className="zoom-button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))}><Plus size={15} /></button>
              <button className="fit-button" onClick={() => setZoom(1)}>Fit</button>
            </div>
          </div>

          <div className="canvas-module">
            <div className="canvas-ruler canvas-ruler-top"><span>0</span><span>256</span><span>512</span><span>{imageData ? imageData.width : 768}</span></div>
            <div className="canvas-ruler canvas-ruler-left"><span>0</span><span>256</span><span>512</span><span>{imageData ? imageData.height : 768}</span></div>
            <div className="canvas-viewport" aria-label="Pixel inspection canvas">
              <div className={`canvas-loading ${isLoading ? "visible" : ""}`}><div className="loading-sweep" /><span>Reading source pixels…</span></div>
              {imageData && <div className="canvas-image-wrap" style={{ transform: `scale(${zoom})` }}>
                <canvas
                  ref={canvasRef}
                  className="dataset-canvas"
                  onPointerMove={(event) => handleCanvasPointer(event, false)}
                  onPointerLeave={() => setHoverPixel(null)}
                  onPointerDown={(event) => handleCanvasPointer(event, true)}
                  aria-label="Click to select a pixel"
                />
                {gridVisible && zoom >= 1.5 && <div className="pixel-grid-overlay" />}
                {activePixel && <div className="pixel-crosshair" style={pixelPositionStyle}>
                  <span className="crosshair-line crosshair-line-x" />
                  <span className="crosshair-line crosshair-line-y" />
                  <span className="crosshair-center" style={{ backgroundColor: activePixel.hex }} />
                </div>}
                {hoverPixel && <div className="pixel-hover-readout" style={pixelPositionStyle}><span>{hoverPixel.x}, {hoverPixel.y}</span><strong>{hoverPixel.hex}</strong></div>}
              </div>}
              {!isLoading && !imageData && <div className="canvas-empty"><Upload size={20} /><strong>Drop a source image to begin</strong><span>PNG, JPG, GIF, or WebP · read locally in your browser</span><button className="quiet-button" onClick={() => fileInputRef.current?.click()}>Choose image</button></div>}
            </div>
            <div className="canvas-caption"><span><CircleDot size={12} /> {selectedPixel ? `Selected pixel ${selectedPixel.x}, ${selectedPixel.y}` : "No pixel selected"}</span><span className="mono-text">ORIGIN 0,0 · TOP-LEFT</span></div>
          </div>

          <div className="sample-tape">
            <div className="sample-tape-label"><span className="rail-kicker">SAMPLE TAPE</span><span>{pixelRecords.length} captured</span></div>
            <div className="sample-color-row">
              {sampledColors.length ? sampledColors.map((color, index) => <span key={`${color}-${index}`} className="sample-color" style={{ backgroundColor: color }} title={color} />) : <span className="sample-tape-empty">Captured colors will appear here as a signal strip.</span>}
            </div>
            <div className="sample-tape-end"><span className="mono-text">{pixelRecords.length ? "LIVE QUEUE" : "EMPTY QUEUE"}</span><span className={`queue-dot ${pixelRecords.length ? "ready" : ""}`} /></div>
          </div>
          <section className="dataset-profile">
            <div className="dataset-profile-heading"><div><span className="rail-kicker"><Database size={13} /> DATASET PROFILE</span><h2>{imageName} <small>{DATASET_SCHEMA_VERSION}</small></h2></div><span className="dataset-record-count">{imageData ? (imageData.width * imageData.height).toLocaleString() : "—"} total pixels</span></div>
            <div className="dataset-profile-grid"><div className="profile-source"><span>FILE</span><strong>{sourceMeta.fileName}</strong><small>{sourceMeta.mimeType} · {sourceMeta.byteSize ? `${Math.round(sourceMeta.byteSize / 1024)} KB` : "local source"}</small></div><label className="profile-control"><span>SPLIT</span><select value={datasetSplit} onChange={(event) => setDatasetSplit(event.target.value)}><option value="train">train</option><option value="validation">validation</option><option value="test">test</option></select></label><label className="profile-control"><span>STATUS</span><select value={datasetStatus} onChange={(event) => setDatasetStatus(event.target.value)}><option value="draft">draft</option><option value="review">review</option><option value="approved">approved</option></select></label><label className="profile-notes"><span>NOTES</span><input value={datasetNotes} onChange={(event) => setDatasetNotes(event.target.value)} placeholder="Optional provenance or annotation notes" /></label></div>
            <div className="schema-row"><span className="schema-label">PER-PIXEL SCHEMA</span>{["x / y", "x_norm / y_norm", "RGBA", "HEX", "RGB int", "label", "category", "source id"].map((item) => <span className="schema-chip" key={item}><Check size={11} />{item}</span>)}</div>
            <div className="profile-actions"><div><span className="profile-action-note"><span className="queue-dot ready" /> Full export writes one record for every pixel as NDJSON.</span></div><div className="profile-action-buttons"><button className="quiet-button" onClick={exportManifest}><FileCode2 size={14} /> Manifest JSON</button><button className="coral-button" onClick={exportFullPixels}><Download size={14} /> All pixels NDJSON</button></div></div>
          </section>
        </main>}

        {activeNav === "Human poses" ? null : <aside className="right-rail">
          <div className="inspector-heading">
            <div><div className="rail-kicker"><Crosshair size={13} /> INSPECTOR</div><h2>Selected pixel</h2></div>
            <span className="inspector-index">{selectedPixel ? "01" : "—"}</span>
          </div>

          <div className="selected-color-card">
            <div className="color-swatch-large" style={{ backgroundColor: activePixel?.hex ?? "#E7E1D7" }}><div className="swatch-crosshair" /></div>
            <div className="color-card-details">
              <span className="color-card-label">CURRENT SAMPLE</span>
              <strong>{activePixel?.hex ?? "#—"}</strong>
              <span>{activePixel ? `${activePixel.r}, ${activePixel.g}, ${activePixel.b}` : "Click the image to inspect"}</span>
            </div>
          </div>

          <div className="inspector-section coordinates-section">
            <div className="section-line-heading"><span>COORDINATES</span><span className="line" /></div>
            <div className="coordinate-grid">
              <div className="coordinate-cell"><span>X POSITION</span><strong>{activePixel?.x ?? "—"}</strong><small>pixels</small></div>
              <div className="coordinate-cell"><span>Y POSITION</span><strong>{activePixel?.y ?? "—"}</strong><small>pixels</small></div>
            </div>
          </div>

          <div className="inspector-section color-section">
            <div className="section-line-heading"><span>CHANNEL VALUES</span><span className="line" /></div>
            <div className="channel-list">
              {[{ label: "RED", value: activePixel?.r ?? 0, color: "#F05D4E" }, { label: "GREEN", value: activePixel?.g ?? 0, color: "#6A9B72" }, { label: "BLUE", value: activePixel?.b ?? 0, color: "#3867C8" }, { label: "ALPHA", value: activePixel?.a ?? 0, color: "#AA9C89" }].map(({ label: channelLabel, value, color }) => <div className="channel-row" key={channelLabel}><span className="channel-name"><i style={{ backgroundColor: color }} />{channelLabel}</span><div className="channel-track"><span style={{ width: `${(value / 255) * 100}%`, backgroundColor: color }} /></div><strong>{value}</strong></div>)}
            </div>
            <div className="hex-row"><span>HEX VALUE</span><strong>{activePixel?.hex ?? "—"}</strong><button className="copy-hex-button" onClick={() => { if (activePixel) { navigator.clipboard?.writeText(activePixel.hex); toast.success("Hex value copied"); } }} aria-label="Copy hex value"><Braces size={13} /></button></div>
          </div>

          <div className="inspector-section label-section">
            <div className="section-line-heading"><span>LABEL THIS SAMPLE</span><span className="line" /></div>
            <label className="label-field"><span>Optional semantic label</span><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. terracotta" /><small>Saved with the next capture</small></label>
            <button className="capture-button" onClick={capturePixel} disabled={!selectedPixel}><Crosshair size={16} /> Capture pixel <kbd>X</kbd></button>
          </div>

          <div className="dataset-status-card">
            <div className="status-card-top"><div><span className="rail-kicker"><FileCode2 size={13} /> DATASET QUEUE</span><strong>{pixelRecords.length} pixel{pixelRecords.length === 1 ? "" : "s"}</strong></div><span className={`status-pill ${pixelRecords.length ? "ready" : ""}`}><span />{pixelRecords.length ? "READY" : "EMPTY"}</span></div>
            <div className="queue-progress"><span style={{ width: `${Math.min(100, pixelRecords.length ? 18 + pixelRecords.length * 4 : 2)}%` }} /></div>
            <div className="status-card-footer"><span>Local only · no upload</span><button onClick={clearRecords} disabled={!pixelRecords.length}><X size={12} /> Clear</button></div>
          </div>

          <div className="right-rail-footer"><button className="footer-link" onClick={exportCsv}><FileText size={14} /> Export CSV</button><button className="footer-link" onClick={() => setShowShortcuts(true)}><Keyboard size={14} /> Shortcuts</button></div>
        </aside>}
      </div>

      {showShortcuts && <div className="shortcut-overlay" onClick={() => setShowShortcuts(false)}><div className="shortcut-modal" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="rail-kicker"><Keyboard size={13} /> QUICK REFERENCE</span><h2>Keyboard shortcuts</h2></div><button className="icon-button" onClick={() => setShowShortcuts(false)} aria-label="Close shortcuts"><X size={16} /></button></div><div className="shortcut-list"><div><span>Select tool</span><kbd>X</kbd></div><div><span>Toggle pixel grid</span><kbd>G</kbd></div><div><span>Capture selected pixel</span><kbd>X</kbd></div><div><span>Dismiss hover readout</span><kbd>ESC</kbd></div></div><p>Keep the pointer over the specimen to preview coordinates; click to commit a selection.</p></div></div>}
    </div>
  );
}
