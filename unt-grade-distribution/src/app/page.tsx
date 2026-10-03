"use client";

import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-title">
        <p className="home-eyebrow"><span className="identity-dot" />Built for the Mean Green</p>
        <h1>Know your next class.<br /><span>Start with the grades.</span></h1>
        <p className="home-description">Grade distributions for UNT courses and instructors.<br className="hidden sm:block" /> A better starting point for your next semester.</p>
      </section>
      <div className="home-search">
        <SearchBar placeholder="Search a course or instructor" />
        <p className="home-hints">Course code, class title, or professor. Start anywhere.</p>
      </div>
      <section className="home-tools" aria-label="Explore UNT Grades">
        <Link href="/search"><span className="tool-number">01 / EXPLORE</span><h2>See the full distribution <span>↗</span></h2><p>Letter grades, enrollment, and GPA. All in one view.</p><div className="mini-bars" aria-hidden="true">{[78, 58, 36, 20, 12].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></Link>
        <Link href="/compare"><span className="tool-number">02 / COMPARE</span><h2>Put classes side by side <span>↗</span></h2><p>Compare courses or instructors before you choose.</p><div className="compare-motif" aria-hidden="true"><span>A</span><i>↔</i><span>B</span></div></Link>
        <Link href="/cart"><span className="tool-number">03 / SAVE</span><h2>Keep your shortlist <span>↗</span></h2><p>Bookmark courses and take a PDF summary with you.</p><div className="save-motif" aria-hidden="true"><span>✓</span><i /><i /></div></Link>
      </section>
      <footer className="home-footer"><Link href="/terms">Terms of service ↗</Link></footer>
    </div>
  );
}
