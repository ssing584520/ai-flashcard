import { useRef, useState, useCallback } from 'react';

interface ImageEditorProps {
  imageSrc: string;
  onConfirm: (editedBase64: string) => void;
  onCancel: () => void;
}

interface Point {
  x: number;
  y: number;
}

export default function ImageEditor({ imageSrc, onConfirm, onCancel }: ImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState<Point>({ x: 0, y: 0 });
  const [selection, setSelection] = useState<{ start: Point | null; end: Point | null }>({ start: null, end: null });
  const [isSelecting, setIsSelecting] = useState(false);
  const [eraseSpots, setEraseSpots] = useState<{ x: number; y: number }[]>([]);
  const [mode, setMode] = useState<'crop' | 'erase'>('crop');
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = containerRef.current;
    if (!container) return;
    const maxW = container.clientWidth - 32;
    const maxH = container.clientHeight - 32;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    setDisplaySize({ x: img.naturalWidth * scale, y: img.naturalHeight * scale });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== 'crop') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * displaySize.x;
    const y = (e.clientY - rect.top) / rect.height * displaySize.y;
    setSelection({ start: { x, y }, end: null });
    setIsSelecting(true);
  }, [mode, displaySize]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || mode !== 'crop') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * displaySize.x;
    const y = (e.clientY - rect.top) / rect.height * displaySize.y;
    setSelection(prev => ({ ...prev, end: { x, y } }));
  }, [isSelecting, mode, displaySize]);

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const handleEraseClick = useCallback((e: React.MouseEvent) => {
    if (mode !== 'erase') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * displaySize.x;
    const y = (e.clientY - rect.top) / rect.height * displaySize.y;
    setEraseSpots(prev => [...prev, { x, y }]);
  }, [mode, displaySize]);

  const handleConfirm = useCallback(() => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    const img = imgRef.current;
    const scaleX = img.naturalWidth / displaySize.x;
    const scaleY = img.naturalHeight / displaySize.y;

    let cropX = 0, cropY = 0, cropW = img.naturalWidth, cropH = img.naturalHeight;

    if (selection.start && selection.end) {
      const x1 = Math.min(selection.start.x, selection.end.x) * scaleX;
      const y1 = Math.min(selection.start.y, selection.end.y) * scaleY;
      const x2 = Math.max(selection.start.x, selection.end.x) * scaleX;
      const y2 = Math.max(selection.start.y, selection.end.y) * scaleY;
      cropX = x1;
      cropY = y1;
      cropW = x2 - x1;
      cropH = y2 - y1;
    }

    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    eraseSpots.forEach(spot => {
      const sx = (spot.x * scaleX - cropX) / cropW * canvas.width;
      const sy = (spot.y * scaleY - cropY) / cropH * canvas.height;
      const size = Math.max(canvas.width, canvas.height) * 0.08;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    });

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    onConfirm(base64);
  }, [selection, eraseSpots, displaySize, onConfirm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  }, [onCancel]);

  const selX = selection.start && selection.end ? Math.min(selection.start.x, selection.end.x) : 0;
  const selY = selection.start && selection.end ? Math.min(selection.start.y, selection.end.y) : 0;
  const selW = selection.start && selection.end ? Math.abs(selection.end.x - selection.start.x) : 0;
  const selH = selection.start && selection.end ? Math.abs(selection.end.y - selection.start.y) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center p-4" onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-3 mb-3 w-full max-w-lg">
        <button
          onClick={() => setMode('crop')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'crop' ? 'bg-candy-pink text-white' : 'bg-candy-card text-candy-text'}`}
        >
          📐 裁剪
        </button>
        <button
          onClick={() => setMode('erase')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'erase' ? 'bg-candy-yellow text-white' : 'bg-candy-card text-candy-text'}`}
        >
          ✏️ 擦除答案
        </button>
        <button onClick={onCancel} className="ml-auto text-white/70 hover:text-white text-xl">✕</button>
      </div>

      <p className="text-sm text-white/60 mb-3">
        {mode === 'crop' ? '🖱️ 拖拽框选题目区域' : '🖱️ 点击擦除选择题答案区域'}
      </p>

      <div
        ref={containerRef}
        className="relative border-2 border-candy-pink/40 rounded-2xl overflow-hidden bg-gray-900 max-w-lg w-full"
        style={{ maxHeight: '60vh' }}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          onLoad={handleLoad}
          alt="错题"
          className="block w-full"
          style={{ display: 'block', maxWidth: '100%' }}
        />
        <div
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleEraseClick}
        >
          {selection.start && selection.end && (
            <div
              className="absolute border-2 border-candy-pink bg-candy-pink/20"
              style={{
                left: selX, top: selY, width: selW, height: selH
              }}
            />
          )}
          {eraseSpots.map((spot, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/80 border-2 border-candy-pink"
              style={{
                left: spot.x - 20, top: spot.y - 20, width: 40, height: 40
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleConfirm}
          className="bg-gradient-to-r from-candy-pink to-candy-peach text-white font-bold px-8 py-3 rounded-xl shadow-soft active:scale-95 transition-all"
        >
          ✅ 确认保存图片
        </button>
        <button
          onClick={onCancel}
          className="bg-candy-card text-candy-text font-bold px-8 py-3 rounded-xl shadow-card active:scale-95 transition-all"
        >
          取消
        </button>
      </div>
    </div>
  );
}
