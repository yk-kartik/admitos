"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

const universities = [
  {
    name: "Northbridge University",
    country: "Canada",
    programs: [["Computer Science", "BSc · 4 yrs"], ["Business Analytics", "MSc · 1 yr"], ["Psychology", "BA · 4 yrs"], ["Data Science", "MSc · 2 yrs"]],
    feedback: [["Campus is huge but the people are chill.", "Aisha, CS '25"], ["Admin replies fast. Shocking, I know.", "Marco, MSc"], ["Winters are a personality test.", "Priya, BA"]],
  },
  {
    name: "Lakeshore Institute",
    country: "Germany",
    programs: [["Mechanical Engineering", "BEng · 3.5 yrs"], ["Robotics", "MSc · 2 yrs"], ["Architecture", "BA · 3 yrs"]],
    feedback: [["Cheap tuition, big brain energy.", "Jonas, MEng"], ["German paperwork builds character.", "Leila, MSc"], ["Labs are genuinely elite.", "Sam, BEng"]],
  },
  {
    name: "Harbourview College",
    country: "UK",
    programs: [["Economics", "BSc · 3 yrs"], ["International Relations", "BA · 3 yrs"], ["Law", "LLB · 3 yrs"], ["Film Studies", "BA · 3 yrs"]],
    feedback: [["Seminars are small, nowhere to hide.", "Tom, Econ"], ["Society fair is chaos. Love it.", "Zara, IR"], ["Rent is not a joke tho.", "Chen, Law"]],
  },
  {
    name: "Summit State University",
    country: "USA",
    programs: [["Biology", "BS · 4 yrs"], ["Public Health", "MPH · 2 yrs"], ["Design", "BFA · 4 yrs"]],
    feedback: [["Sports games are an entire religion.", "Riley, Bio"], ["Great scholarships if you apply early.", "Nadia, MPH"], ["Dorm food: it's trying its best.", "Ben, Design"]],
  },
] as const;

type Tab = "programs" | "feedback";

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [universityIndex, setUniversityIndex] = useState(0);
  const [tab, setTab] = useState<Tab>("programs");
  const [submitted, setSubmitted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const university = universities[universityIndex];

  useEffect(() => {
    function closeDropdown(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("click", closeDropdown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeDropdown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
  }

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-wrap">
          <nav className="landing-nav" aria-label="Main">
            <Link className="landing-logo" href="#top"><i>Admit</i>OS</Link>
            <div className={`landing-dropdown${menuOpen ? " open" : ""}`} ref={dropdownRef}>
              <button className="landing-nav-link" type="button" aria-expanded={menuOpen} aria-controls="landing-menu" onClick={(event) => { event.stopPropagation(); setMenuOpen((open) => !open); }}>
                Universities ▾
              </button>
              <div className="landing-menu" id="landing-menu">
                <a href="#universities" onClick={() => { setTab("programs"); setMenuOpen(false); }}>Programs<small>Find your next chapter</small></a>
                <a href="#universities" onClick={() => { setTab("feedback"); setMenuOpen(false); }}>Feedback<small>Students spilling the tea</small></a>
                <a href="#request" onClick={() => setMenuOpen(false)}>Can&apos;t find yours?<small>Ask us to add it</small></a>
              </div>
            </div>
            <a className="landing-nav-link landing-nav-optional" href="#partners">Partners</a>
            <a className="landing-nav-link landing-nav-optional" href="#about">About us</a>
            <Link className="landing-login" href="/sign-in" aria-label="Log in or sign up" title="Log in / Sign up">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>
            </Link>
          </nav>
        </div>
      </header>

      <main id="top">
        <div className="landing-wrap landing-hero">
          <div>
            <h1>Your <span className="landing-underlined">uni era</span> starts here.</h1>
            <p className="landing-lede">Applying abroad is a lot. Deadlines, documents, requirements written like riddles. AdmitOS keeps it all in one place so you can stop screaming into your notes app.</p>
            <div className="landing-ctas">
              <Link className="landing-btn landing-btn-main" href="/sign-in">Get started, no cap</Link>
              <a className="landing-btn" href="#universities">Browse universities</a>
            </div>
            <p className="landing-note">You decide everything. We just do the boring organising.</p>
          </div>
          <div className="landing-board" aria-hidden="true">
            <div className="landing-pin landing-p1">Deadline in 12 days<small>lowkey fine. (it is not fine)</small></div>
            <div className="landing-pin landing-p2">SOP: draft 4<small>draft 1 was a cry for help</small></div>
            <div className="landing-pin landing-p3">Transcript uploaded<small>main character behaviour</small></div>
            <div className="landing-pin landing-p4">Requirements: decoded<small>it&apos;s giving clarity</small></div>
            <div className="landing-pin landing-p5">Application: 80% done<small>go sit down, you earned it</small></div>
          </div>
        </div>

        <section id="universities">
          <div className="landing-wrap">
            <h2>Pick your campus</h2>
            <p className="landing-sub">Tap a university to see its programs, or read what students actually said about it.</p>
            <div className="landing-explore">
              <div className="landing-unis" role="group" aria-label="Universities">
                {universities.map((item, index) => (
                  <button className="landing-uni" key={item.name} type="button" aria-pressed={index === universityIndex} onClick={() => setUniversityIndex(index)}>
                    {item.name}<small>{item.country}</small>
                  </button>
                ))}
              </div>
              <div className="landing-panel" aria-live="polite">
                <h3>{university.name}</h3><span className="landing-muted">{university.country}</span>
                <div className="landing-tabs" role="tablist">
                  <button className="landing-tab" type="button" role="tab" aria-selected={tab === "programs"} onClick={() => setTab("programs")}>Programs</button>
                  <button className="landing-tab" type="button" role="tab" aria-selected={tab === "feedback"} onClick={() => setTab("feedback")}>Feedback</button>
                </div>
                {tab === "programs" ? (
                  <ul className="landing-programs">{university.programs.map(([name, details]) => <li key={name}>{name}<small>{details}</small></li>)}</ul>
                ) : (
                  <>{university.feedback.map(([quote, author]) => <div className="landing-feedback" key={author}><p>{quote}</p><cite>{author}</cite></div>)}<span className="landing-tag">Sample feedback</span></>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-ask" id="request">
          <div className="landing-wrap">
            <div><h2>Your uni not here? Say less.</h2><p className="landing-sub landing-sub-tight">Tell us where you&apos;re aiming and we&apos;ll add it. The more specific, the faster it happens.</p></div>
            <form className="landing-card" onSubmit={submitRequest}>
              <label htmlFor="landing-university">University name</label>
              <input id="landing-university" required placeholder="e.g. University of Somewhere" />
              <label htmlFor="landing-country">Country</label>
              <input id="landing-country" required placeholder="e.g. Germany" />
              <label htmlFor="landing-email">Your email (so we can tell you when it&apos;s live)</label>
              <input id="landing-email" type="email" required placeholder="you@email.com" />
              <button className="landing-btn landing-btn-main" type="submit">Request this uni</button>
              {submitted && <p className="landing-ok" role="status">Got it. We&apos;ll add it and ping you. Go hydrate meanwhile.</p>}
            </form>
          </div>
        </section>

        <section id="partners"><div className="landing-wrap"><h2>Partners</h2><p className="landing-sub">Universities, counsellors and student groups who keep the info real.</p><div className="landing-chips"><div>Partner one</div><div>Partner two</div><div>Partner three</div><div>Want to be here?</div></div></div></section>
        <section className="landing-about-section" id="about"><div className="landing-wrap landing-about"><div><h2>About us</h2></div><div><p>AdmitOS is built for students applying to universities abroad. We keep your profile, requirements and deadlines in one place, and we back what we tell you with real evidence instead of vibes.</p><p>AI helps with the wording. You make the calls, always. We never submit anything for you.</p></div></div></section>
      </main>
      <footer className="landing-footer"><div className="landing-wrap">AdmitOS · made with caffeine and mild panic.</div></footer>
    </div>
  );
}
