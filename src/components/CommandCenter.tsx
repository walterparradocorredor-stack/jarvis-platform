"use client";

import React from "react";
import OrbBirthdayCard from "@/components/command-center/OrbBirthdayCard";
import WompiSalesCard from "@/components/command-center/WompiSalesCard";
import NextAppointmentCard from "@/components/command-center/NextAppointmentCard";
import SearchConsoleCard from "@/components/command-center/SearchConsoleCard";
import MetaAdsCard from "@/components/command-center/MetaAdsCard";
import RagMemoryCard from "@/components/command-center/RagMemoryCard";

export default function CommandCenter() {
  return (
    <div className="h-full overflow-y-auto p-3 md:p-4">
      <div className="mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Centro de Comando</h2>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <OrbBirthdayCard />
        <WompiSalesCard />
        <NextAppointmentCard />
        <SearchConsoleCard />
        <MetaAdsCard />
        <RagMemoryCard />
      </div>
    </div>
  );
}
