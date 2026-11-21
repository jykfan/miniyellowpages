/* Static content: suggestion lists, emergency guides, sample data.
   Edit this file to tailor the guides to your area. */

const SKILL_SUGGESTIONS = [
  "Doctor", "Nurse", "EMT / Paramedic", "CPR / First aid", "Mental health",
  "Veterinary", "Electrician", "Plumber", "Carpenter / Handyperson",
  "Gas / HVAC", "Ham radio operator", "CERT trained", "Search & rescue",
  "Firefighter", "Law enforcement", "Childcare", "Elder care", "Cooking for groups",
  "Spanish", "Mandarin", "Cantonese", "Vietnamese", "Tagalog", "ASL",
  "Tree work / Chainsaw", "Mechanic", "IT / Networking",
];

const RESOURCE_SUGGESTIONS = [
  "Generator", "Solar charger / power bank", "Chainsaw", "Ladder",
  "Extra first-aid kit", "AED", "Stored water", "Two-way radios",
  "Truck / trailer", "Wheelchair", "Fire extinguisher", "Tent / tarps",
  "Camp stove", "Shut-off wrench", "Pool / large water source",
];

const NEEDS_HINT =
  "Optional. e.g. uses oxygen, limited mobility, lives alone, infant at home, needs medication refrigeration";

const DEFAULT_NUMBERS = [
  { label: "Emergency (police / fire / medical)", number: "911" },
  { label: "Poison Control", number: "1-800-222-1222" },
  { label: "988 Suicide & Crisis Lifeline", number: "988" },
  { label: "Police non-emergency", number: "" },
  { label: "Gas utility (leaks)", number: "" },
  { label: "Electric utility (outages)", number: "" },
  { label: "Water utility", number: "" },
];

/* Emergency kits, from the City of Berkeley's "Build a Disaster Go Bag and Stay Kit" page.
   Items marked src: "ready.gov" come from Ready.gov (FEMA) recommendations that Berkeley's list doesn't cover.
   Each item: "text", or { text, note, src }. */
const KITS = [
  {
    id: "gobag",
    title: "Go bag",
    span: "24 hours",
    intro: "For emergencies where you may have to evacuate quickly, from earthquakes to wildfires or a gas leak in the neighborhood. Bring only essentials to help your household through the next 24 hours.",
    groups: [
      { group: "Pack ahead", items: [
        "Phone charger",
        "Flashlight/headlamp",
        "Local map with walking paths",
        "Water, snacks",
        "Important documents",
        "First aid kit",
        { text: "Whistle to signal for help", src: "ready.gov" },
        { text: "Dust mask", note: "To help filter contaminated air", src: "ready.gov" },
      ]},
      { group: "Add on your way out", items: [
        "Wallet",
        "Cell phone",
        "Keys",
        "Medications",
        "Backup glasses",
      ]},
    ],
  },
  {
    id: "staykit",
    title: "Stay kit",
    span: "3 days (72 hours)",
    intro: "Supplies for staying home, based on your household's needs. Keep daily needs and equipment in separate groups so you can find things quickly in an emergency.",
    groups: [
      { group: "Daily needs", items: [
        { text: "Water", note: "One gallon per person, per day. Store enough for 3 days and build up from there. Buy bottled water and refresh it every couple of years, or refill food-grade containers." },
        { text: "Prescriptions and medical equipment", note: "A 3-day dose of any medicine you take regularly." },
        { text: "Personal hygiene and sanitation items", note: "Including moist towelettes, garbage bags and plastic ties, feminine supplies, and hand sanitizer (ready.gov)." },
        { text: "First aid kit", note: "Plus a first aid book or other emergency reference material (ready.gov)." },
        { text: "Personal documents", note: "Photocopy your driver's license, passport, leases, titles and contact list, and upload copies to the cloud or keep them on two backup drives. Keep paper copies, insurance policies and bank records in a waterproof container (ready.gov)." },
        { text: "Non-perishable food", note: "At least 3 days per person. Choose foods your family will eat that need no refrigeration, cooking, water or special preparation, and remember special diets." },
        { text: "Manual can opener and eating utensils", src: "ready.gov" },
        { text: "Pet items", note: "Food, medications, extra water." },
        { text: "Infant formula and diapers", src: "ready.gov" },
        { text: "Sleeping bag or warm blanket for each person", src: "ready.gov" },
        { text: "Complete change of clothing", note: "Long-sleeved shirt, long pants and sturdy shoes.", src: "ready.gov" },
        { text: "Cash and change", src: "ready.gov" },
        { text: "Paper cups, plates, disposable utensils and paper towels", src: "ready.gov" },
        { text: "Books, games, puzzles or other activities for children", src: "ready.gov" },
      ]},
      { group: "Equipment", items: [
        "Flashlight and extra batteries",
        { text: "Basic toolkit", note: "Including utility wrenches (non-sparking) to turn off gas." },
        { text: "Cell phone and charger", note: "A battery-operated phone charger, or one that plugs into your car, helps you stay informed, take photos and communicate." },
        { text: "Backup power", note: "Portable battery packs, solar chargers or generators to keep phones, radios and medical equipment running during outages." },
        { text: "Radio (battery-operated or hand crank)", note: "Ideally one that receives NOAA Weather Radio tone alerts (ready.gov). Berkeley stations: KCBS 740 AM, KQED 88.5 FM, KSOL 98.9 FM (Spanish)." },
        { text: "Fire extinguisher (ABC-rated)", note: "To quickly control small fires. Get it serviced annually, or at least every couple of years." },
        { text: "Whistle to signal for help", src: "ready.gov" },
        { text: "Dust mask, plastic sheeting and duct tape", note: "To filter contaminated air and shelter in place.", src: "ready.gov" },
        { text: "Matches in a waterproof container", src: "ready.gov" },
        { text: "Paper and pencil", src: "ready.gov" },
      ]},
    ],
    outro: "As your capacity and budget allow, add to your stay kit. Work together with your neighbors to store collective supplies.",
  },
];
const KITS_SOURCE = "Based on City of Berkeley guidance, with additions from Ready.gov (FEMA).";

/* Each guide: id, title, summary, and sections of {heading, steps|text, warn}. */
const GUIDES = [
  {
    id: "gas",
    title: "Shutting off the gas",
    summary: "Only shut off gas if you smell it, hear it hissing, or see damage to the line.",
    sections: [
      { heading: "When to shut it off", steps: [
        "You smell gas (rotten-egg odor), hear a blowing or hissing sound, or see a broken gas line.",
        "Do NOT shut off gas just because there was an earthquake or outage. If there's no sign of a leak, leave it on.",
      ]},
      { heading: "If you suspect a leak", steps: [
        "Get everyone out of the house right away. Leave the door open behind you.",
        "Do not flip light switches, use phones, light matches, or start cars near the leak. Sparks can ignite gas.",
        "From a safe distance, call 911 and your gas utility.",
      ]},
      { heading: "How to shut it off at the meter", steps: [
        "Find your gas meter. It's usually on the side of the house or in a basement or garage. Know where it is before an emergency.",
        "Find the shutoff valve on the pipe coming out of the ground into the meter.",
        "Use a 12–15\" adjustable wrench or a gas shutoff tool. Turn the valve a quarter turn so the tab (tang) is crosswise to the pipe. Parallel = on, crosswise = off.",
        "Keep the wrench next to the meter, tied on with wire, so it's there when you need it.",
      ]},
      { heading: "Afterward", warn: true, text:
        "Never turn the gas back on yourself. Only the utility or a licensed professional should turn it back on and relight pilot lights. It can take days after a major event, so only shut it off if you need to." },
    ],
  },
  {
    id: "water",
    title: "Shutting off the water",
    summary: "Shut off the water to stop flooding from broken pipes and to keep contaminated city water out of your pipes.",
    sections: [
      { heading: "Find your main valve now", steps: [
        "Most homes have a main shutoff where the water line enters the house. Look in the garage, basement, crawl space, or by the water heater.",
        "There's often a second valve at the street meter box. Opening it may require a meter key.",
        "Turn the valve clockwise (righty-tighty) to close it. For a lever valve, turn it a quarter turn so the lever is crosswise to the pipe.",
      ]},
      { heading: "Save the water you already have", steps: [
        "Your water heater holds 30 to 80 gallons of drinkable water. If there are reports of contamination, shut off the main valve first so bad water can't get in.",
        "Turn off power or gas to the water heater before draining from the valve at the bottom.",
        "Toilet tanks (not bowls) also hold usable water if they don't contain cleaning tablets.",
      ]},
      { heading: "Boil-water notices", text:
        "If officials issue a boil-water notice, bring water to a rolling boil for 1 minute (3 minutes at high elevation) before drinking, or use stored or bottled water." },
    ],
  },
  {
    id: "power",
    title: "Electricity and generators",
    summary: "Turn off power when there's flooding, sparking, or you need to evacuate. Run generators outdoors only.",
    sections: [
      { heading: "Shutting off power at the panel", steps: [
        "Find your main electrical panel (garage, basement, utility closet, or outside wall).",
        "Switch off the individual circuit breakers first, then the main breaker.",
        "To restore power, turn on the main breaker first, then the individual breakers one at a time.",
      ]},
      { heading: "Stay safe", warn: true, steps: [
        "Never touch the panel while standing in water. If it's wet, call the utility.",
        "Stay at least 35 feet from downed power lines and assume they are live. Report them to the utility.",
      ]},
      { heading: "Generators", warn: true, steps: [
        "Only run generators outdoors, at least 20 feet from doors, windows, and vents. Carbon monoxide kills quickly and has no smell.",
        "Never plug a generator into a wall outlet (backfeeding). It can electrocute utility workers. Use heavy-duty extension cords or a professionally installed transfer switch.",
        "Install battery-powered CO alarms inside.",
      ]},
    ],
  },
  {
    id: "food",
    title: "Food when the power is out",
    summary: "Power outages can last several days. Stock food that needs no refrigeration, cooking, water or special preparation. (From Ready.gov)",
    sections: [
      { heading: "Good foods to keep on hand", steps: [
        "Ready-to-eat canned meats, fruits and vegetables, plus a manual can opener",
        "Protein or fruit bars, dry cereal or granola, peanut butter, dried fruit",
        "Canned juices and non-perishable pasteurized milk",
        "High-energy foods, food for infants, and comfort/stress foods",
        "Choose foods your family will eat, and remember any special dietary needs.",
      ]},
      { heading: "Keeping food safe without power", steps: [
        "Keep the refrigerator and freezer doors closed as much as possible.",
        "An unopened refrigerator keeps food cold for about 4 hours. Food should stay at 40°F or below; use a refrigerator thermometer to check.",
        "Thawed food can usually be eaten if it's still \"refrigerator cold,\" and re-frozen if it still has ice crystals.",
        "Keep food in covered containers and keep cooking and eating utensils clean.",
        "Don't let garbage build up inside, for fire and sanitation reasons.",
      ]},
      { heading: "When in doubt, throw it out", warn: true, steps: [
        "Perishable food (meat, poultry, fish, eggs, leftovers) that has been above 40°F for 2 hours or more.",
        "Any food that has been at room temperature for 2 hours or more.",
        "Any food that touched flood water, or has an unusual odor, color or texture.",
        "Cans that are swollen, dented or corroded, even if the food looks safe.",
        "For babies, use ready-to-feed formula. If you must mix formula, use bottled water, or boiled water as a last resort.",
      ]},
      { heading: "Cooking", steps: [
        "Commercially canned food can be eaten straight from the can.",
        "Indoors, you can use candle warmers, chafing dishes, fondue pots or a fireplace. Charcoal grills and camp stoves are for outdoor use only.",
        "To heat food in its can: remove the label, wash and disinfect the can (1 part bleach to 10 parts water), and open it before heating.",
      ]},
    ],
  },
  {
    id: "earthquake",
    title: "Earthquakes",
    summary: "Drop, cover, and hold on. Then check yourself, your home, and your pod.",
    sections: [
      { heading: "During the shaking", steps: [
        "DROP to your hands and knees.",
        "COVER your head and neck under a sturdy table or desk. If there's none, get next to an interior wall away from windows.",
        "HOLD ON until the shaking stops. Do not run outside during the shaking.",
      ]},
      { heading: "Right after", steps: [
        "Check yourself and others for injuries. Put on shoes, since there may be broken glass.",
        "Check for gas leaks, water leaks, and electrical damage. See the shutoff guides.",
        "Expect aftershocks.",
        "Post your OK / HELP sign and start your pod check-in.",
      ]},
    ],
  },
  {
    id: "fire",
    title: "Wildfire and evacuation",
    summary: "Ready, Set, Go! Leave early. Don't wait for an evacuation order if you feel unsafe.",
    sections: [
      { heading: "Ready (before fire season)", steps: [
        "Keep a go bag packed for every household member and pet.",
        "Clear dead vegetation and debris within 5 feet of the house.",
        "Know two ways out of the neighborhood.",
        "Sign up for your county's emergency alerts.",
      ]},
      { heading: "Set (when there's a fire nearby)", steps: [
        "Put go bags, pets, and important papers in the car. Park facing out.",
        "Close all windows and doors. Leave them unlocked for firefighters.",
        "Tell your pod your plans and check on neighbors who may need a ride.",
      ]},
      { heading: "Go", steps: [
        "Leave as soon as you're told to, or sooner if you feel threatened.",
        "Follow the routes officials give you, not shortcuts from your GPS app.",
        "Check in with your out-of-area contact once you're safe.",
      ]},
    ],
  },
  {
    id: "checkin",
    title: "Pod check-in protocol",
    summary: "After any major event, every household checks on the others in its pod.",
    sections: [
      { heading: "Within the first hour", steps: [
        "Take care of your own household first: injuries, hazards, utilities.",
        "Put a sign in your front window or on your door: OK (green) or HELP (red). Print the signs from the Print page.",
        "Go to or call every household in your pod. Start with anyone listed with special needs.",
        "Write down who you've reached, who needs help, and who isn't home.",
      ]},
      { heading: "Report", steps: [
        "Pod captains report their pod's status to the neighborhood organizer at the meeting point.",
        "Report life-threatening emergencies to 911 right away. Don't wait for the pod check.",
        "Share skills and resources. The directory lists who has a generator, medical training, tools, and more.",
      ]},
      { heading: "If phones are down", text:
        "Text messages often get through when calls fail. If nothing works, go to the neighborhood meeting point at the agreed time (see Settings). Ham radio operators in the directory may be able to relay messages." },
    ],
  },
  {
    id: "plan",
    title: "Household emergency plan",
    summary: "Talk through this with everyone in your household, then write it down.",
    sections: [
      { heading: "Decide together", steps: [
        "An out-of-area contact everyone will call or text to check in. Long-distance calls often work when local ones don't.",
        "A meeting place right outside your home, and one outside the neighborhood.",
        "Who picks up the kids if schools close, and who checks on pets.",
        "Where your utility shutoffs are, and who knows how to use them.",
      ]},
      { heading: "Write down and share", steps: [
        "Phone numbers on paper. Don't rely only on your phone's contacts.",
        "Medical needs, medications, and allergies for each person.",
        "Your pod members' names and addresses (from this directory).",
      ]},
    ],
  },
];

/* Made-up neighbors for trying the app ("Load sample neighbors"). Each household lists its people. */
const sampleAdult = (first, last, phone, occupation, skills = [], extra = {}) => ({ kind: "adult", first, last, phone, occupation, skills, ...extra });
const sampleChild = (first, age, needs = "") => ({ kind: "child", first, age, needs });
const SAMPLE_HOUSEHOLDS = [
  { names: "Maria & Tom Alvarez", address: "112 Oak St", resources: ["Generator", "Ladder"], pets: "1 dog", people: [
    sampleAdult("Maria", "Alvarez", "555-0101", "ER nurse", ["Nurse", "CPR / First aid", "Spanish"], { email: "maria.a@example.com" }),
    sampleAdult("Tom", "Alvarez", "555-0119", "Contractor", ["Carpenter / Handyperson"]),
    sampleChild("Sofia", 6), sampleChild("Leo", 9, "Severe peanut allergy (EpiPen in kitchen)"),
  ] },
  { names: "Dev Patel", address: "118 Oak St", resources: ["Two-way radios", "Solar charger / power bank"], people: [
    sampleAdult("Dev", "Patel", "555-0102", "Software engineer", ["IT / Networking", "Ham radio operator"]),
  ] },
  { names: "The Nguyen family", address: "124 Oak St", resources: ["Camp stove", "Stored water"], people: [
    sampleAdult("Linh", "Nguyen", "555-0103", "Restaurant owner", ["Cooking for groups", "Vietnamese"], { email: "nguyenfam@example.com" }),
    sampleAdult("Bao", "Nguyen", "555-0113", "Chef", ["Cooking for groups"]),
    sampleChild("", 0, "Infant (8 months)"),
  ] },
  { names: "Ruth Goldberg", address: "130 Oak St", people: [
    sampleAdult("Ruth", "Goldberg", "555-0104", "Retired teacher", ["Childcare"], { needs: "Lives alone; uses a walker" }),
  ] },
  { names: "Sam & Jordan Lee", address: "136 Oak St", resources: ["Truck / trailer", "Shut-off wrench"], people: [
    sampleAdult("Sam", "Lee", "555-0105", "Electrician", ["Electrician"], { email: "leehouse@example.com" }),
    sampleAdult("Jordan", "Lee", "555-0115", "Vet tech", ["Veterinary"]),
  ] },
  { names: "Aisha Bello", address: "142 Oak St", resources: ["Extra first-aid kit", "AED"], people: [
    sampleAdult("Aisha", "Bello", "555-0106", "Paramedic", ["EMT / Paramedic", "CERT trained"]),
    sampleChild("Zara", 12),
  ] },
  { names: "Chris Ward", address: "15 Elm Ave", resources: ["Chainsaw", "Ladder"], people: [
    sampleAdult("Chris", "Ward", "555-0107", "Arborist", ["Tree work / Chainsaw"]),
  ] },
  { names: "Linda & Paul Okafor", address: "21 Elm Ave", resources: ["Generator"], people: [
    sampleAdult("Linda", "Okafor", "555-0108", "Physician", ["Doctor"], { email: "okafors@example.com" }),
    sampleAdult("Paul", "Okafor", "", "Accountant", [], { needs: "Uses oxygen (needs power)" }),
  ] },
  { names: "Hannah Kim", address: "27 Elm Ave", people: [
    sampleAdult("Hannah", "Kim", "555-0109", "Social worker", ["Mental health", "Elder care"]),
  ] },
  { names: "Jamal & Keisha Carter", address: "33 Elm Ave", resources: ["Shut-off wrench", "Tent / tarps"], people: [
    sampleAdult("Jamal", "Carter", "555-0110", "Plumber", ["Plumber", "Gas / HVAC"]),
    sampleAdult("Keisha", "Carter", "555-0120", "Teacher", ["Childcare"]),
    sampleChild("", 3), sampleChild("", 5), sampleChild("", 10),
  ] },
  { names: "The Russo family", address: "39 Elm Ave", resources: ["Fire extinguisher", "Pool / large water source"], pets: "2 dogs", people: [
    sampleAdult("Marco", "Russo", "555-0111", "Firefighter", ["Firefighter", "Search & rescue"]),
    sampleAdult("Gina", "Russo", "555-0121", "Dental hygienist"),
    sampleChild("", 14), sampleChild("", 16),
  ] },
  { names: "Mei Chen", address: "45 Elm Ave", household: "Mei's parents live with her", people: [
    sampleAdult("Mei", "Chen", "555-0112", "Pharmacist", ["Mandarin", "Cantonese"]),
    sampleAdult("Wei", "Chen", "", "Retired", [], { needs: "Speaks Cantonese only" }),
    sampleAdult("Lan", "Chen", "", "Retired", [], { needs: "Uses a wheelchair" }),
  ] },
];
