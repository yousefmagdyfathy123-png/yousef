// Public-safe metadata verified against menus.ts/source menu labels and title-data.json.
// Literal route membership avoids guessing a standard for unknown routes.
// No private catalog, source rows or runtime title-data imports.
const groups: [string[], string][] = [
  [["Psiz1"], "Pipe Minimum Finder"],
  [["Ptem1"], "ASME B16.5 - 2009 Group 1.1"],
  [["Comp1"], "B16.5 / B16.47 Series A ASME Composite"],
  [["Gpas1", "Gpas2", "Gpas3", "Gpas4"], "Pipe Spacing"],
  [["Srre1"], "Bath Tub Type Strainer"],
  [["Srrd1"], "Top Hat Type Strainer"],
  [["Srrc1"], "Witch Hat Type Strainer"],
  [["Srrb1", "Srrb2"], "Basket Type Strainers"],
  [["Srra1", "Srra2", "Srra3", "Srra4"], "Y Type Strainers"],
  [["Nuts1", "Nuts2"], "Nuts"],
  [["Wbpi1", "Wbpi2", "Wbpi3", "Wbpi4", "Wbpi5", "Wbpi6", "Wbpi7", "Wbpi8", "Wbpi9", "Wbpi10", "Wbpi11", "Wbpi12"], "ASME Unadopted Pipet"],
  [["Wbol1", "Wbol2", "Wbol3", "Wbol4", "Wbol5", "Wbol6", "Wbol7", "Wbol8", "Wbol9", "Wbol10", "Wbol11", "Wbol12", "Wbol13"], "ASME Unadopted Welded Branch"],
  [["Vlsw1", "Vlsw2", "Vlsw3", "Vlsw4", "Vlsw5"], "ASME Unadopted Socketwelded Valves"],
  [["Vlsc1", "Vlsc2", "Vlsc3", "Vlsc4", "Vlsc5"], "ASME Unadopted Threaded Valves"],
  [["Vlbw1", "Vlbw2", "Vlbw3", "Vlbw4"], "ASME B16.10 Buttwelded Valves · ASME B16.10-2017"],
  [["Blnu1", "Blnu2", "Blnu3", "Blnu4"], "ASME B16.48 Line Blanks · ASME B16.48-2020"],
  [["Grtj1", "Grtj2", "Grtj3"], "ASME B16.20 Gaskets · ASME B16.20-2016"],
  [["Gspr1", "Gspr2", "Gspr3"], "ASME B16.20 Gaskets · ASME B16.20-2016"],
  [["Gflt1", "Gflt2", "Gflt3"], "ASME B16.21 Gaskets · ASME B16.21-2016"],
  [["Flan1", "Flan2", "Flan3", "Flan4", "Flan5", "Flan6", "Flan7"], "Flanges · ASME B16.5-2020"],
  [["Flbs1"], "Flanges · BS 10:2009"],
  [["Flaa1", "Flaa2"], "Flanges · ASME B16.47-2017 · Series A"],
  [["Flap1", "Flap2"], "Flanges · ASME B16.47-2017 · Series B"],
  [["Orif1", "Orif2", "Orif3"], "ASME B16.36 Orifice Flanges · ASME B16.36-2020"],
  [["Flco1", "Flco2", "Flco3"], "Compact flanges · ASME"],
  [["Fl6b1", "Fl6b2"], "Flanges · API 6A-2004 · Type 6B"],
  [["Flbx1", "Flbx2"], "Flanges · API 6A-2004 · Type BX"],
  [["Flre1", "Flre2"], "Flanges · ASME B16.5-2020 · Reducing"],
  [["Fldi1", "Fldi2", "Fldi3", "Fldi4", "Fldi5"], "Flanges · EN 1092-1:2018"],
  [["Flhb1"], "ASME Unadopted"],
  [["Ftbw1", "Ftbw2", "Ftbw3", "Ftbw4", "Ftbw5", "Ftbw6", "Ftbw7", "Ftbw8", "Ftbw9", "Ftbw10", "Ftbw11"], "ASME B16.9 BW Fittings · ASME B16.9-2018"],
  [["Ftsc1", "Ftsc2", "Ftsc3", "Ftsc4", "Ftsc5", "Ftsc6", "Ftsc7", "Ftsc8", "Ftsc9", "Ftsc10", "Ftsc11", "Ftsc12", "Ftsc13", "Ftsc14", "Ftsc15", "Ftsc16", "Ftsc17", "Ftsc18", "Ftsc19", "Ftsc20", "Ftsc21", "Ftsc22", "Ftsc23", "Ftsc24", "Ftsc25"], "ASME B16.11 Threaded Fittings · ASME B16.11-2016"],
  [["Ftsw1", "Ftsw2", "Ftsw3", "Ftsw4", "Ftsw5", "Ftsw6", "Ftsw7", "Ftsw8", "Ftsw9", "Ftsw10", "Ftsw11", "Ftsw12", "Ftsw13", "Ftsw14"], "ASME B16.11 SW Fittings · ASME B16.11-2016"],
  [["Fswa1", "Fswa2", "Fswa3"], "MSS-SP-95 Swage and Pipe Nipples · MSS-SP-95-2018"],
  [["Vlfl1", "Vlfl2", "Vlfl3", "Vlfl4", "Vlfl5", "Vlfl6", "Vlfl7", "Vlfl8"], "ASME B16.10 Flanged Valves · ASME B16.10-2017"],
  [["Pipe1"], "ASME B36.10M/19M Pipe · ASME B36.10M/19M-2022"],
  [["Piwt1"], "ASME B36.10M/19M Pipe · ASME B36.10M/19M-2018"],
];
const contexts = new Map(groups.flatMap(([routes, context]) => routes.map(route => [route, context] as const)));

export function searchContext(routeId: string): string {
  return contexts.get(routeId) ?? `Component ${routeId}`;
}
