"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function PropertySearch() {
  const [location, setLocation] = useState("Dubai");
  const [propertyType, setPropertyType] = useState("House");
  const [priceRange, setPriceRange] = useState("$240k-260k");
  const router = useRouter();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location.trim() && location !== "All") params.set("q", location.trim());
    if (propertyType !== "All") params.set("type", propertyType.toLowerCase().replace(" ", "_"));
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row items-end gap-5 w-full max-w-4xl font-sans">
      {/* Location Dropdown */}
      <div className="flex flex-col w-full md:w-auto flex-1">
        <label className="text-white/80 text-[13px] font-medium mb-2 pl-1">Location</label>
        <div className="relative">
          <select 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full appearance-none bg-transparent border border-white/30 text-white text-sm rounded-full px-5 py-3 pr-10 outline-none focus:border-white/60 backdrop-blur-md transition-colors cursor-pointer"
          >
            <option value="Dubai" className="bg-slate-900 text-white">Dubai</option>
            <option value="Los Angeles" className="bg-slate-900 text-white">Los Angeles</option>
            <option value="Mumbai" className="bg-slate-900 text-white">Mumbai</option>
            <option value="Delhi" className="bg-slate-900 text-white">Delhi</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Property Input */}
      <div className="flex flex-col w-full md:w-auto flex-1">
        <label className="text-white/80 text-[13px] font-medium mb-2 pl-1">Property</label>
        <div className="relative">
          <select 
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full appearance-none bg-transparent border border-white/30 text-white text-sm rounded-full px-5 py-3 pr-10 outline-none focus:border-white/60 backdrop-blur-md transition-colors cursor-pointer"
          >
            <option value="House" className="bg-slate-900 text-white">House</option>
            <option value="Apartment" className="bg-slate-900 text-white">Apartment</option>
            <option value="Villa" className="bg-slate-900 text-white">Villa</option>
            <option value="Commercial" className="bg-slate-900 text-white">Commercial</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Price Range */}
      <div className="flex flex-col w-full md:w-auto flex-1">
        <label className="text-white/80 text-[13px] font-medium mb-2 pl-1">Price Range</label>
        <div className="relative">
          <select 
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="w-full appearance-none bg-transparent border border-white/30 text-white text-sm rounded-full px-5 py-3 pr-10 outline-none focus:border-white/60 backdrop-blur-md transition-colors cursor-pointer"
          >
            <option value="$240k-260k" className="bg-slate-900 text-white">$240k-260k</option>
            <option value="< $100k" className="bg-slate-900 text-white">&lt; $100k</option>
            <option value="$100k - 500k" className="bg-slate-900 text-white">$100k - 500k</option>
            <option value="$500k - 1M" className="bg-slate-900 text-white">$500k - 1M</option>
            <option value="> $1M" className="bg-slate-900 text-white">&gt; $1M</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" size={16} />
        </div>
      </div>

      {/* Find Button */}
      <div className="w-full md:w-auto mt-4 md:mt-0 flex-shrink-0">
        <button 
          onClick={handleSearch}
          className="w-full md:w-auto bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold rounded-full px-8 py-3 transition-all outline-none"
        >
          Find Now
        </button>
      </div>
    </div>
  );
}
