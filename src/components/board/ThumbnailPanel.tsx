import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { MOLD_REGISTRY } from "../../data/moldRegistry";
import { uploadFrameThumbnail } from "../../lib/projectService";

interface ThumbnailPanelProps {
  projectId: string;
  thumbnailUrls: Record<string, string>;
  onUploaded: (segId: string, objectUrl: string, storagePath: string) => void;
}

export function ThumbnailPanel({ projectId, thumbnailUrls, onUploaded }: ThumbnailPanelProps) {
  const segments         = useStore(s => s.segments);
  const setFrameThumbnail = useStore(s => s.setFrameThumbnail);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFileChange(segId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploading(u => ({ ...u, [segId]: true }));
    try {
      const objectUrl = URL.createObjectURL(file);
      const storagePath = await uploadFrameThumbnail(projectId, segId, file);
      setFrameThumbnail(segId, storagePath);
      onUploaded(segId, objectUrl, storagePath);
    } catch (err) {
      console.error("Thumbnail upload failed:", err);
    } finally {
      setUploading(u => ({ ...u, [segId]: false }));
    }
  }

  return (
    <div className="w-[260px] shrink-0 flex flex-col bg-zinc-900/50 border-l border-zinc-800 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
          Frames
        </span>
      </div>

      {/* Frame rows */}
      <div className="flex flex-col divide-y divide-zinc-800">
        {segments.length === 0 && (
          <p className="px-4 py-6 text-xs text-zinc-600 text-center">
            No segments yet.<br />Add segments in the Timeline view.
          </p>
        )}
        {segments.map((seg, i) => {
          const mold    = MOLD_REGISTRY[seg.moldId];
          const color   = mold?.color ?? "#52525b";
          const label   = mold?.label ?? seg.moldId;
          const thumbUrl = thumbnailUrls[seg.id];
          const isUploading = uploading[seg.id];

          return (
            <div key={seg.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-800/40 transition">
              {/* Thumbnail preview */}
              <div
                className="w-16 h-10 rounded-md overflow-hidden shrink-0 border border-zinc-700 flex items-center justify-center"
                style={{ background: thumbUrl ? undefined : `${color}18` }}
              >
                {thumbUrl ? (
                  <img src={thumbUrl} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-2 h-2 rounded-full opacity-40" style={{ background: color }} />
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] text-zinc-400 font-medium truncate">{label}</span>
                <span className="text-[9px] text-zinc-600">SEG {i + 1}</span>
              </div>

              {/* Upload button */}
              <button
                onClick={() => inputRefs.current[seg.id]?.click()}
                disabled={isUploading}
                className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition disabled:opacity-40"
                title="Upload frame thumbnail"
              >
                {isUploading
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Camera size={12} />
                }
              </button>
              <input
                ref={el => { inputRefs.current[seg.id] = el; }}
                type="file"
                accept="image/*"
                onChange={e => handleFileChange(seg.id, e)}
                className="hidden"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
