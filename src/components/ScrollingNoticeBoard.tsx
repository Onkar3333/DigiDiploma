import React, { useEffect, useState, useRef } from "react";

export default function ScrollingNoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notices")
      .then((res) => res.json())
      .then((data) => setNotices(data))
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || notices.length < 2) return;
    let scrollAmount = 0;
    const scrollStep = 1;
    const scrollInterval = setInterval(() => {
      scrollAmount += scrollStep;
      if (scrollAmount >= scrollContainer.scrollHeight / 2) {
        scrollAmount = 0;
      }
      scrollContainer.scrollTop = scrollAmount;
    }, 30);
    return () => clearInterval(scrollInterval);
  }, [notices]);

  if (loading) return <div className="text-muted-foreground">Loading notices...</div>;
  if (notices.length === 0) return <div className="text-muted-foreground">No notices at this time.</div>;

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-2 text-gray-800">College Notice Board</h2>
      <div
        ref={scrollRef}
        className="overflow-y-hidden h-24 relative"
        style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)" }}
        onMouseEnter={() => { if (scrollRef.current) scrollRef.current.style.overflowY = "auto"; }}
        onMouseLeave={() => { if (scrollRef.current) scrollRef.current.style.overflowY = "hidden"; }}
      >
        <div className="flex flex-col gap-3 animate-scroll-vertical">
          {notices.concat(notices).map((notice, idx) => (
            <div key={idx} className="py-1 px-2 text-gray-700 border-b border-gray-100">
              <span className="font-semibold">{notice.title}:</span> {notice.message}
              <span className="ml-2 text-xs text-gray-400">{new Date(notice.date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 