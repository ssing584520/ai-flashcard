import { useRef, useState, useCallback, useEffect } from 'react';

interface ImageEditorProps {
  imageSrc: string;
  onConfirm: (editedBase64: string) => void;
  onCancel: () => void;
}

const HANDLE_SIZE = 14;
const MIN_PCT = 5;

type DragState = {
  mode: 'move' | 'resize';
  handle: string;
  startX: number;
  startY: number;
  startPct: { x: number; y: number; w: number; h: number };
} | null;

export default function ImageEditor({ imageSrc, onConfirm, onCancel }: ImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [cropPct, setCropPct] = useState({ x: 5, y: 5, w: 90, h: 90 });
  const [drag, setDrag] = useState<DragState>(null);
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

  // 触屏 + 桌面统一入口：记录拖拽起点
  const startDrag = useCallback((e: React.PointerEvent | React.TouchEvent, mode: 'move' | 'resize', handle: string) => {
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.PointerEvent).clientX;
      clientY = (e as React.PointerEvent).clientY;
    } else {
      return;
    }
    if ('preventDefault' in e && (e as any).preventDefault) (e as any).preventDefault();
    refreshImgRect();
    setDrag({ mode, handle, startX: clientX, startY: clientY, startPct: cropPct });
  }, [refreshImgRect, cropPct]);

  // 窗口级 touchmove 监听：绕开 pointer 事件在触屏的不可靠性
  useEffect(() => {
    if (!drag) return;

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const cur = clientToPct(t.clientX, t.clientY);
      const prev = clientToPct(drag.startX, drag.startY);
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      setCropPct(p => {
        const r = { ...p };
        if (drag.mode === 'move') {
          r.x = Math.max(0, Math.min(100 - r.w, drag.startPct.x + dx));
          r.y = Math.max(0, Math.min(100 - r.h, drag.startPct.y + dy));
        } else {
          const h = drag.handle;
          if (h.includes('e')) { const nw = drag.startPct.w + dx; if (nw >= MIN_PCT && drag.startPct.x + nw <= 100) r.w = nw; }
          if (h.includes('w')) { const nw = drag.startPct.w - dx; if (nw >= MIN_PCT && drag.startPct.x + dx >= 0) { r.x += dx; r.w = nw; } }
          if (h.includes('s')) { const nh = drag.startPct.h + dy; if (nh >= MIN_PCT && drag.startPct.y + nh <= 100) r.h = nh; }
          if (h.includes('n')) { const nh = drag.startPct.h - dy; if (nh >= MIN_PCT && drag.startPct.y + dy >= 0) { r.y += dy; r.h = nh; } }
          r.w = Math.max(MIN_PCT, r.w);
          r.h = Math.max(MIN_PCT, r.h);
        }
        return r;
      });
    };

    const onEnd = () => setDrag(null);

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    return () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [drag, clientToPct]);

  // 桌面 pointermove：仅当未处于触屏拖拽时生效
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (drag?.mode !== 'move') return;
    if (e.pointerType !== 'mouse') return;
    const cur = clientToPct(e.clientX, e.clientY);
    const prev = clientToPct(drag.startX, drag.startY);
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    setCropPct(p => {
      const r = { ...p };
      r.x = Math.max(0, Math.min(100 - r.w, drag.startPct.x + dx));
      r.y = Math.max(0, Math.min(100 - r.h, drag.startPct.y + dy));
      return r;
    });
  }, [drag, clientToPct]);

  const handlePointerUp = useCallback(() => {
    setDrag(null);
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

  const rect = cropPct;
  const hs = HANDLE_SIZE;

  // 统一的"按下并记录起点"：触屏用 touchstart，桌面用 pointerdown
  const pressBody = useCallback((e: React.PointerEvent | React.TouchEvent, mode: 'move' | 'resize', handle: string) => {
    startDrag(e, mode, handle);
  }, [startDrag]);

  const isTouch = 'ontouchstart' in window;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 select-none"
      style={{ touchAction: 'none' }}
      tabIndex={0}
    >
      <div className="flex items-center gap-3 mb-3 w-full max-w-lg">
        <span className="text-white/70 text-sm font-bold">👆 拖动裁剪框移动，拖边角调整大小</span>
        <button onClick={onCancel} className="ml-auto text-white/70 hover:text-white text-xl">✕</button>
      </div>

      <div ref={containerRef} className="relative overflow-hidden rounded-2xl max-w-lg w-full bg-black/30">
        <img ref={imgRef} src={imageSrc} alt="错题" className="block w-full" onLoad={refreshImgRect} />
        <div
          className="absolute inset-0 cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={isTouch ? undefined : e => pressBody(e, 'move', 'body')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onTouchStart={e => pressBody(e, 'move', 'body')}
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
            <div key={p.h}
              className="absolute bg-candy-pink border-2 border-white rounded-sm pointer-events-auto"
              style={{ left: p.x, top: p.y, width: hs, height: hs, transform: 'translate(-50%,-50%)', cursor: p.h === 'nw' || p.h === 'se' ? 'nwse-resize' : 'nesw-resize', touchAction: 'none' }}
              onPointerDown={isTouch ? undefined : e => pressBody(e, 'resize', p.h)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onTouchStart={e => pressBody(e, 'resize', p.h)}
            />
          ))}
          {[
            { x: `${rect.x + rect.w / 2}%`, y: `${rect.y}%`, h: 'n', c: 'ns-resize' as const },
            { x: `${rect.x + rect.w / 2}%`, y: `${rect.y + rect.h}%`, h: 's', c: 'ns-resize' as const },
            { x: `${rect.x}%`, y: `${rect.y + rect.h / 2}%`, h: 'w', c: 'ew-resize' as const },
            { x: `${rect.x + rect.w}%`, y: `${rect.y + rect.h / 2}%`, h: 'e', c: 'ew-resize' as const },
          ].map(p => (
            <div key={p.h}
              className="absolute bg-candy-pink border-2 border-white rounded-sm pointer-events-auto"
              style={{ left: p.x, top: p.y, width: hs, height: hs, transform: 'translate(-50%,-50%)', cursor: p.c, touchAction: 'none' }}
              onPointerDown={isTouch ? undefined : e => pressBody(e, 'resize', p.h)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onTouchStart={e => pressBody(e, 'resize', p.h)}
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
