"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Mic, ChevronDown } from "lucide-react";
import Link from "next/link";

const tabs = [
    { label: "Apartment", id: "buy" },
    { label: "Villa", id: "rent" },
    { label: "House", id: "new-launch", dot: true },
    { label: "Plot", id: "commercial" },
    { label: "Commercial", id: "plots-land" },
];

const propertyTypes = [
    "All Residential",
    "Apartment",
    "Independent House",
    "Villa",
    "Plot",
    "Commercial",
];

export function PropertySearch() {
    const [activeTab, setActiveTab] = useState("buy");
    const [query, setQuery] = useState("");
    const [propertyType, setPropertyType] = useState("All Residential");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const router = useRouter();

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (propertyType !== "All Residential") params.set("type", propertyType.toLowerCase().replace(" ", "_"));
        router.push(`/search?${params.toString()}`);
    };

    return (
        <div className="w-full max-w-[860px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] overflow-visible font-sans">
            {/* ── Tab Row ── */}
            <div className="flex items-center px-2 border-b border-gray-200 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={[
                            "relative flex items-center gap-1 px-4 py-3.5 text-sm whitespace-nowrap border-0 bg-transparent cursor-pointer transition-colors",
                            activeTab === tab.id
                                ? "text-[#003b6f] font-bold"
                                : "text-gray-500 font-medium hover:text-[#003b6f]",
                        ].join(" ")}
                        style={
                            activeTab === tab.id
                                ? {
                                    boxShadow: "inset 0 -3px 0 0 #003b6f",
                                }
                                : {}
                        }
                    >
                        {tab.label}
                        {tab.dot && (
                            <span className="absolute top-2.5 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>
                ))}

                {/* Spacer + divider + Post Property */}
                <div className="ml-auto flex items-center flex-shrink-0">
                    <div className="w-px h-5 bg-gray-200 mx-2" />
                    <Link href={"/properties/new"} >
                        <button className="flex items-center gap-1.5 px-3 py-2 text-[13.5px] font-semibold text-[#003b6f] bg-transparent border-0 cursor-pointer whitespace-nowrap">
                            Post Property
                        </button>
                    </Link>
                </div>
            </div>

            {/* ── Search Row ── */}
            <div className="flex items-center gap-2 px-3 py-2.5 relative">


                {/* Vertical divider */}
                <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

                {/* Search icon */}
                <Search size={18} className="text-gray-400 flex-shrink-0 ml-1" />

                {/* Search input */}
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search for locality, landmark, project, or builder"
                    className="flex-1 border-0 outline-none text-sm text-gray-800 bg-transparent px-1 py-1.5 placeholder:text-gray-400 min-w-0"
                />

                {/* Mic button */}
                <button
                    aria-label="Voice search"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-0 cursor-pointer text-blue-500 hover:bg-blue-50 transition-colors flex-shrink-0"
                >
                    <Mic size={18} />
                </button>

                {/* Search button */}
                <button
                    onClick={handleSearch}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg border-0 cursor-pointer transition-colors flex-shrink-0"
                >
                    Search
                </button>
            </div>
        </div>
    );
}
