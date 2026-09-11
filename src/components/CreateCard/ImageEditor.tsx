import { useRef, useState, useCallback } from 'react';

interface ImageEditorProps {
  imageSrc: string;
  onConfirm: (editedBase64: string) => void;
  onCancel: () => void;
}

const HANDLE_SIZE = 12;
const MIN_PCT = 5;

export default function ImageEditor({ imageSrc, onConfirm, onCancel }: ImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [cropPct, setCropPct] = useState({ x: 5, y: 5, w: 90, h: 90 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ clientX: 0, clientY: 0 });
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [dragHandle, setDragHandle] = useState('');
  const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const refreshImgRect = useCallback(() => {
    if (!imgRef.current) return;
    const r = imgRef.current.getBoundingClientRect();
    setImgRect({ x: r.left, y: r.top, w: r.width, h: r.height });
  }, []);

  const clientToPct = useCallback((clientX: number, clientY: number) => {
    if (imgRect.w === 0 || imgRect.h === 0) return { x: 0, y: 0 };
    return {
      x: ((clientX - imgRect.x) / imgRect.w) * 100,
      y: ((clientY - imgRect.y) / imgRect.h) * 100
    };
  }, [imgRect]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    refreshImgRect();
    setIsDragging(true);
    setDragStart({ clientX: e.clientX, clientY: e.clientY });
    setDragMode('move');
    setDragHandle('body');
  }, [refreshImgRect]);

  const handleHandleDown = useCallback((e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    refreshImgRect();
    setIsDragging(true);
    setDragStart({ clientX: e.clientX, clientY: e.clientY });
    setDragMode('resize');
    setDragHandle(handle);
  }, [refreshImgRect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragMode) return;
    const cur = clientToPct(e.clientX, e.clientY);
    const prev = clientToPct(dragStart.clientX, dragStart.clientY);
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;

    setCropPct(prev => {
      const r = { ...prev };
      if (dragMode === 'move') {
        r.x = Math.max(0, Math.min(100 - r.w, r.x + dx));
        r.y = Math.max(0, Math.min(100 - r.h, r.y + dy));
      } else {
        const h = dragHandle;
        if (h.includes('e')) { const nw = r.w + dx; if (nw >= MIN_PCT && r.x + nw <= 100) r.w = nw; }
        if (h.includes('w')) { const nw = r.w - dx; if (nw >= MIN_PCT && r.x + dx >= 0) { r.x += dx; r.w = nw; } }
        if (h.includes('s')) { const nh = r.h + dy; if (nh >= MIN_PCT && r.y + nh <= 100) r.h = nh; }
        if (h.includes('n')) { const nh = r.h - dy; if (nh >= MIN_PCT && r.y + dy >= 0) { r.y += dy; r.h = nh; } }
        r.w = Math.max(MIN_PCT, r.w);
        r.h = Math.max(MIN_PCT, r.h);
      }
      return r;
    });
    setDragStart({ clientX: e.clientX, clientY: e.clientY });
  }, [isDragging, dragMode, dragHandle, dragStart, clientToPct]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragMode(null);
    setDragHandle('');
  }, []);

  const handleConfirm = useCallback(() => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    const sx = (cropPct.x / 100) * img.naturalWidth;
    const sy = (cropPct.y / 100) * img.naturalHeight;
    const sw = (cropPct.w / 100) * img.naturalWidth;
    const sh = (cropPct.h / 100) * img.naturalHeight;
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, Math.round(sw), Math.round(sh));
    onConfirm(canvas.toDataURL('image/jpeg', 0.92));
  }, [cropPct, onConfirm]);

  const rect = { x: cropPct.x, y: cropPct.y, w: cropPct.w, h: cropPct.h };
  const hs = HANDLE_SIZE;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4" tabIndex={0}>
      <div className="flex items-center gap-3 mb-3 w-full max-w-lg">
        <span className="text-white/70 text-sm font-bold">🖱️ 拖动边框或角来裁剪图片</span>
        <button onClick={onCancel} className="ml-auto text-white/70 hover:text-white text-xl">✕</button>
      </div>

      <div ref={containerRef} className="relative overflow-hidden rounded-2xl max-w-lg w-full bg-black/30">
        <img ref={imgRef} src={imageSrc} alt="错题" className="block w-full" onLoad={refreshImgRect} />
        <div
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="crop-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect x={`${rect.x}%`} y={`${rect.y}%`} width={`${rect.w}%`} height={`${rect.h}%`} fill="black" />
              </mask>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#crop-mask)" />
          </svg>
          <div className="absolute border-2 border-candy-pink" style={{
            left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%`
          }} />
          {[
            { x: `${rect.x}%`, y: `${rect.y}%`, h: 'nw' },
            { x: `${rect.x + rect.w}%`, y: `${rect.y}%`, h: 'ne' },
            { x: `${rect.x}%`, y: `${rect.y + rect.h}%`, h: 'sw' },
            { x: `${rect.x + rect.w}%`, y: `${rect.y + rect.h}%`, h: 'se' },
          ].map(p => (
            <div key={p.h} className="absolute bg-candy-pink border-2 border-white rounded-sm pointer-events-auto"
              style={{ left: p.x, top: p.y, width: hs, height: hs, transform: 'translate(-50%,-50%)', cursor: p.h === 'nw' || p.h === 'se' ? 'nwse-resize' : 'nesw-resize' }}
              onMouseDown={e => handleHandleDown(e, p.h)}
            />
          ))}
          {[
            { x: `${rect.x + rect.w / 2}%`, y: `${rect.y}%`, h: 'n', c: 'ns-resize' as const },
            { x: `${rect.x + rect.w / 2}%`, y: `${rect.y + rect.h}%`, h: 's', c: 'ns-resize' as const },
            { x: `${rect.x}%`, y: `${rect.y + rect.h / 2}%`, h: 'w', c: 'ew-resize' as const },
            { x: `${rect.x + rect.w}%`, y: `${rect.y + rect.h / 2}%`, h: 'e', c: 'ew-resize' as const },
          ].map(p => (
            <div key={p.h} className="absolute bg-candy-pink border-2 border-white rounded-sm pointer-events-auto"
              style={{ left: p.x, top: p.y, width: hs, height: hs, transform: 'translate(-50%,-50%)', cursor: p.c }}
              onMouseDown={e => handleHandleDown(e, p.h)}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={handleConfirm} className="bg-gradient-to-r from-candy-pink to-candy-peach text-white font-bold px-8 py-3 rounded-xl shadow-soft active:scale-95 transition-all">
          ✅ 确认裁剪
        </button>
        <button onClick={onCancel} className="bg-candy-card text-candy-text font-bold px-8 py-3 rounded-xl shadow-card active:scale-95 transition-transform">
          取消
        </button>
      </div>
    </div>
  );
}
