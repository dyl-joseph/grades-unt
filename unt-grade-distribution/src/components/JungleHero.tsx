"use client";

import { useState, useRef, useEffect } from "react";
import SearchBar from "./SearchBar";

// Pre-computed firefly positions to avoid hydration mismatch
const FIREFLIES = [
    { left: "8%", top: "15%", dur: "7s", delay: "0s", fx: "30px", fy: "-40px", fx2: "-20px", fy2: "20px" },
    { left: "18%", top: "60%", dur: "9s", delay: "1.2s", fx: "-40px", fy: "30px", fx2: "25px", fy2: "-35px" },
    { left: "28%", top: "30%", dur: "6s", delay: "2.5s", fx: "20px", fy: "50px", fx2: "-30px", fy2: "10px" },
    { left: "40%", top: "75%", dur: "11s", delay: "0.8s", fx: "-25px", fy: "-20px", fx2: "35px", fy2: "30px" },
    { left: "52%", top: "20%", dur: "8s", delay: "3.1s", fx: "40px", fy: "15px", fx2: "-15px", fy2: "-40px" },
    { left: "62%", top: "55%", dur: "7s", delay: "1.7s", fx: "-30px", fy: "40px", fx2: "20px", fy2: "-20px" },
    { left: "72%", top: "40%", dur: "10s", delay: "4.0s", fx: "15px", fy: "-35px", fx2: "-25px", fy2: "45px" },
    { left: "82%", top: "25%", dur: "6s", delay: "2.0s", fx: "-20px", fy: "30px", fx2: "40px", fy2: "-15px" },
    { left: "90%", top: "70%", dur: "9s", delay: "0.5s", fx: "25px", fy: "-20px", fx2: "-35px", fy2: "25px" },
    { left: "5%", top: "80%", dur: "8s", delay: "3.5s", fx: "35px", fy: "20px", fx2: "10px", fy2: "-30px" },
    { left: "35%", top: "10%", dur: "12s", delay: "1.0s", fx: "-15px", fy: "40px", fx2: "30px", fy2: "15px" },
    { left: "55%", top: "85%", dur: "7s", delay: "4.8s", fx: "20px", fy: "-30px", fx2: "-40px", fy2: "20px" },
    { left: "75%", top: "10%", dur: "9s", delay: "2.8s", fx: "-35px", fy: "25px", fx2: "15px", fy2: "-40px" },
    { left: "15%", top: "45%", dur: "6s", delay: "5.2s", fx: "40px", fy: "-15px", fx2: "-20px", fy2: "35px" },
    { left: "48%", top: "48%", dur: "10s", delay: "0.3s", fx: "-20px", fy: "-30px", fx2: "30px", fy2: "15px" },
    { left: "92%", top: "38%", dur: "8s", delay: "6.1s", fx: "10px", fy: "40px", fx2: "-30px", fy2: "-25px" },
    { left: "22%", top: "88%", dur: "11s", delay: "3.8s", fx: "-40px", fy: "-20px", fx2: "25px", fy2: "30px" },
    { left: "68%", top: "78%", dur: "7s", delay: "1.5s", fx: "30px", fy: "25px", fx2: "-15px", fy2: "-35px" },
    { left: "44%", top: "92%", dur: "9s", delay: "4.2s", fx: "-25px", fy: "-40px", fx2: "40px", fy2: "10px" },
    { left: "85%", top: "52%", dur: "6s", delay: "2.3s", fx: "15px", fy: "35px", fx2: "-35px", fy2: "-20px" },
];

export default function JungleHero() {
    const [focused, setFocused] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (focused && searchRef.current) {
            // Smooth scroll so the search bar sits near the top
            const offset = searchRef.current.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: offset, behavior: "smooth" });
        }
    }, [focused]);

    return (
        <div
            className="relative flex min-h-screen w-full flex-col items-center overflow-hidden transition-all duration-700 ease-out"
            style={{
                background: "radial-gradient(ellipse at 50% 30%, var(--hero-gradient-1) 0%, var(--hero-gradient-2) 70%)",
                justifyContent: focused ? "flex-start" : "center",
                paddingTop: focused ? "100px" : "0",
            }}
        >

            {/* ── Mist layers (hidden in light mode via CSS) ── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                    className="mist-layer"
                    style={{ bottom: "10%", "--speed": "28s" } as React.CSSProperties}
                />
                <div
                    className="mist-layer"
                    style={{ bottom: "30%", "--speed": "42s", opacity: 0.6 } as React.CSSProperties}
                />
                <div
                    className="mist-layer"
                    style={{ bottom: "55%", "--speed": "56s", opacity: 0.35 } as React.CSSProperties}
                />
            </div>

            {/* ── Fireflies (hidden in light mode via CSS) ── */}
            <div className="pointer-events-none absolute inset-0">
                {FIREFLIES.map((f, i) => (
                    <span
                        key={i}
                        className="firefly"
                        style={{
                            left: f.left,
                            top: f.top,
                            "--dur": f.dur,
                            "--delay": f.delay,
                            "--fx": f.fx,
                            "--fy": f.fy,
                            "--fx2": f.fx2,
                            "--fy2": f.fy2,
                        } as React.CSSProperties}
                    />
                ))}
            </div>

            {/* ── SVG Vines — top left ── */}
            <svg
                className="pointer-events-none absolute top-0 left-0 h-[520px] w-[260px]"
                style={{
                    transformOrigin: "top left",
                    animation: "vine-drop 2s ease both",
                    opacity: focused ? 0.3 : 1,
                    transition: "opacity 0.5s ease",
                }}
                viewBox="0 0 260 520"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M10 0 C 20 80, -10 160, 30 220 C 60 270, 10 330, 40 400 C 60 440, 20 480, 35 520"
                    stroke="#2d6a2d" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
                <path d="M40 0 C 55 60, 20 130, 60 190 C 90 240, 45 300, 70 370"
                    stroke="#1e4620" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
                {[60, 130, 200, 280, 360].map((y, i) => (
                    <ellipse key={i}
                        cx={18 + (i % 2) * 28} cy={y}
                        rx={14 - i} ry={7}
                        fill="#2d6a2d" opacity={0.55 - i * 0.05}
                        transform={`rotate(${-25 + i * 12} ${18 + (i % 2) * 28} ${y})`}
                    />
                ))}
            </svg>

            {/* ── SVG Vines — top right ── */}
            <svg
                className="pointer-events-none absolute top-0 right-0 h-[520px] w-[260px]"
                style={{
                    transformOrigin: "top right",
                    animation: "vine-drop 2s 0.4s ease both",
                    opacity: focused ? 0.3 : 1,
                    transition: "opacity 0.5s ease",
                }}
                viewBox="0 0 260 520"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M250 0 C 240 80, 270 160, 230 220 C 200 270, 250 330, 220 400 C 200 440, 240 480, 225 520"
                    stroke="#2d6a2d" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
                <path d="M220 0 C 205 60, 240 130, 200 190 C 170 240, 215 300, 190 370"
                    stroke="#1e4620" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
                {[60, 130, 200, 280, 360].map((y, i) => (
                    <ellipse key={i}
                        cx={242 - (i % 2) * 28} cy={y}
                        rx={14 - i} ry={7}
                        fill="#2d6a2d" opacity={0.55 - i * 0.05}
                        transform={`rotate(${25 - i * 12} ${242 - (i % 2) * 28} ${y})`}
                    />
                ))}
            </svg>

            {/* ── Radial glow behind title ── */}
            <div
                className="pointer-events-none absolute transition-opacity duration-500"
                style={{
                    width: 600,
                    height: 300,
                    top: focused ? "20px" : "calc(50% - 200px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: `radial-gradient(ellipse, var(--glow-color) 0%, transparent 70%)`,
                    filter: "blur(40px)",
                    opacity: focused ? 0.5 : 1,
                    transition: "all 0.7s ease",
                }}
            />

            {/* ── Hero Content ── */}
            <div
                className="relative z-10 flex w-full max-w-3xl flex-col items-center px-6 text-center transition-all duration-700 ease-out"
            >
                {/* Eyebrow — fade out when focused */}
                <p
                    className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] transition-all duration-500"
                    style={{
                        color: "var(--accent-dim)",
                        letterSpacing: "0.25em",
                        opacity: focused ? 0 : 1,
                        maxHeight: focused ? 0 : 30,
                        overflow: "hidden",
                    }}
                >
                    University of North Texas
                </p>

                {/* Main title — shrink when focused */}
                <h1
                    className="mb-3 font-black leading-tight tracking-tight transition-all duration-500"
                    style={{
                        fontSize: focused ? "2rem" : undefined,
                        opacity: focused ? 0.7 : 1,
                    }}
                >
                    <span
                        className={focused ? "" : "jungle-shimmer"}
                        style={focused ? { color: "var(--accent-color)" } : undefined}
                    >
                        {focused ? "Grade Explorer" : "Grade"}
                    </span>
                    {!focused && (
                        <>
                            <br />
                            <span style={{ color: "var(--text-primary)", textShadow: `0 0 40px var(--accent-glow)` }}>
                                Explorer
                            </span>
                        </>
                    )}
                </h1>

                {/* Subtitle — hide when focused */}
                <p
                    className="mb-10 max-w-md text-base sm:text-lg transition-all duration-500"
                    style={{
                        color: "var(--text-secondary)",
                        lineHeight: 1.65,
                        opacity: focused ? 0 : 1,
                        maxHeight: focused ? 0 : 100,
                        overflow: "hidden",
                    }}
                >
                    Search any course or professor — typos, commas, any name order. We will find them.
                </p>

                {/* Search bar */}
                <div ref={searchRef} className="w-full max-w-xl">
                    <SearchBar autoFocus onFocusChange={setFocused} />
                </div>

                {/* Hint row — hide when focused */}
                <div
                    className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs transition-all duration-500"
                    style={{
                        color: "var(--text-dim)",
                        opacity: focused ? 0 : 1,
                        maxHeight: focused ? 0 : 40,
                        overflow: "hidden",
                    }}
                >
                    <span>Try: &ldquo;CS 311&rdquo;</span>
                    <span style={{ opacity: 0.5 }}>|</span>
                    <span>&ldquo;Moor&rdquo; (typo OK)</span>
                    <span style={{ opacity: 0.5 }}>|</span>
                    <span>&ldquo;Moore, John&rdquo;</span>
                    <span style={{ opacity: 0.5 }}>|</span>
                    <span>&ldquo;John Moore&rdquo;</span>
                </div>
            </div>

            {/* ── Bottom gradient strip (replaces leaf silhouette) ── */}
            <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
                style={{
                    background: `linear-gradient(to top, var(--bg-primary) 0%, transparent 100%)`,
                }}
            />
        </div>
    );
}
