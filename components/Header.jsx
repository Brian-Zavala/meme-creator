export default function Header() {
  return (
    <header className="header flex items-center justify-between px-6 py-4 bg-[oklch(53%_0.187_39)] shadow-lg select-none">
      <div className="flex items-center gap-3 cursor-default">
        <div>
          <h1 className="header--title text-2xl font-black tracking-tighter text-white drop-shadow-md">MEME CREATOR</h1>
          <p className="text-[10px] font-bold text-white/80 tracking-[0.2em] uppercase">Free • No Watermark</p>
        </div>
      </div>
    </header>
  );
}
