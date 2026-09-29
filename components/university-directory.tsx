"use client";

import { ArrowUpRight, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { University } from "@/types/domain";
import { PageHeading } from "@/components/ui/page-heading";

type UniversityDirectoryProps = {
  universities: University[];
};

export function UniversityDirectory({ universities }: UniversityDirectoryProps) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("All destinations");
  const destinations = [...new Set(universities.map((item) => item.country).filter((value): value is string => Boolean(value)))];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredUniversities = universities.filter((university) => {
    const matchesCountry = country === "All destinations" || university.country === country;
    const searchable = [
      university.name,
      university.country,
      university.city,
      ...university.studyAreas.value,
      ...university.programs.map((program) => program.name),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return matchesCountry && searchable.includes(normalizedQuery);
  });

  return (
    <div className="workspace-page university-directory">
      <PageHeading
        eyebrow="UNIVERSITY SEARCH"
        title="Build your shortlist"
        description="Compare study options and keep important admissions details in one place."
        badge="MOCK CATALOG"
      />

      <div className="directory-toolbar">
        <label className="directory-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search universities, programs, or study areas"
            aria-label="Search universities, programs, or study areas"
          />
        </label>
        <label className="select-control">
          <span>Destination</span>
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option>All destinations</option>
            {destinations.map((destination) => (
              <option key={destination}>{destination}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="directory-results-heading">
        <div>
          <strong>{filteredUniversities.length} institutions</strong>
          <span> · illustrative profiles</span>
        </div>
        <span>Program and cost figures are mock data</span>
      </div>

      {filteredUniversities.length > 0 ? (
        <div className="university-list">
          {filteredUniversities.map((university) => (
            <article className="university-card" key={university.slug}>
              <div className="university-card-mark" aria-hidden="true">
                {university.name
                  .split(" ")
                  .filter((word) => word.length > 2)
                  .slice(0, 2)
                  .map((word) => word[0])
                  .join("")}
              </div>
              <div className="university-card-main">
                <div className="university-card-heading">
                  <div>
                    <span className="university-kind">{university.institutionType}</span>
                    <h2>{university.name}</h2>
                  </div>
                  <span className="record-status">{university.source.verificationStatus.replaceAll("-", " ").toUpperCase()}</span>
                </div>
                <p>{university.overview.value}</p>
                <div className="university-card-meta">
                  <span><MapPin size={14} aria-hidden="true" /> {university.city ? `${university.city}, ` : "Location not provided"}{university.country ? ` · ${university.country}` : ""}</span>
                  <span>{university.programs.length} sample programs</span>
                </div>
                <div className="study-area-list" aria-label="Study areas">
                  {university.studyAreas.value.map((area) => <span key={area}>{area}</span>)}
                </div>
              </div>
              <Link
                className="university-card-link"
                href={`/universities/${university.slug}`}
                aria-label={`View ${university.name} profile`}
              >
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No institutions match those filters</strong>
          <span>Try a different search term or destination.</span>
        </div>
      )}

      <p className="data-disclaimer">
        Sample institutions and all profile details are illustrative only. Confirm requirements, dates, costs, and contacts with official sources before making decisions.
      </p>
    </div>
  );
}