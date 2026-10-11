// Star Citizen new-player guide content.
// Written for the LIVE build 4.10.x (checked October 2026). Star Citizen is in alpha and changes
// often, so the text deliberately says "as of 4.x" where details are version-dependent.
// Keybinds listed here are the default keyboard bindings as reported for Alpha 4.10; players can
// rebind anything under Options > Keybindings.

export const guideChapters = [
  // ---------------------------------------------------------------------------
  {
    id: 'before-you-launch',
    title: 'Before You Launch',
    icon: '🧰',
    level: 'Beginner',
    minutes: 6,
    summary: 'Set up your account, install the game, tune your PC and pick a home before your first login.',
    steps: [
      {
        title: 'Create your RSI account',
        body: `<p>Everything starts at <strong>robertsspaceindustries.com</strong> (RSI). Make an account there: it holds your ships, your game package and your forum (Spectrum) identity.</p><p>To play you need a <strong>Game Package</strong>, which includes a starter ship. Free Fly events happen several times a year and let anyone try the game without paying, so watch for those if you just want a taste.</p>`,
        tip: `Turn on two-factor authentication right away. Your account holds real-money purchases.`
      },
      {
        title: 'Use a referral code when you sign up',
        body: `<p>When you create the account you can enter another player's <strong>referral code</strong>. As of the July 2025 referral program overhaul, a new account registered with a code gets a one-time bonus of <strong>50,000 UEC</strong> of in-game money.</p><p>The code must be entered at sign-up (RSI currently allows a short grace period afterwards). Every valid code gives you the same bonus; the code only decides which player gets credit for recruiting you.</p>`,
        warn: `Never give anyone your password to "apply a code". Codes are only typed into the RSI sign-up form.`
      },
      {
        title: 'Install the RSI Launcher',
        body: `<p>Download the <strong>RSI Launcher</strong> from the RSI website. It installs, patches and launches the game. Plan for well over <strong>100 GB</strong> of free space, and more if you also install test builds.</p><ul><li><strong>LIVE</strong> is the normal, stable-ish game. Start here.</li><li><strong>PTU</strong> (Public Test Universe) and <strong>EPTU</strong> are test servers for upcoming patches. Progress there does not carry over and they can be very buggy.</li></ul>`,
        tip: `Pick the LIVE channel in the launcher's game selector before hitting Install.`
      },
      {
        title: 'Check your hardware',
        body: `<p>Star Citizen is demanding. The realistic baseline:</p><ul><li><strong>SSD is a must.</strong> On a hard drive, cities and planets may load slowly or not at all. NVMe is best.</li><li><strong>RAM:</strong> 16 GB is the minimum; <strong>32 GB</strong> is strongly recommended.</li><li><strong>CPU:</strong> must support AVX. Strong single-core speed helps a lot.</li><li><strong>GPU:</strong> a modern card with plenty of VRAM. The game supports DirectX 11 and Vulkan.</li></ul>`,
        tip: `If your RAM is tight, make sure Windows has a decent page file on your SSD.`
      },
      {
        title: 'Graphics settings that matter',
        body: `<p>Start conservative, then raise things once you know how your PC copes in a big city:</p><ul><li>Try both <strong>Vulkan</strong> and <strong>DirectX 11</strong> (Graphics settings). One often runs smoother on a given PC; you need to restart after switching.</li><li>Lower <strong>graphics quality</strong> and <strong>planet detail</strong> first if you stutter.</li><li>Use upscaling (if offered for your GPU) for easy extra frames.</li></ul><p>Cities and busy stations are the heaviest areas, so judge performance there, not in empty space.</p>`
      },
      {
        title: 'Set up your controls',
        body: `<p>Mouse and keyboard is perfectly fine to start. Under <strong>Options &gt; Keybindings</strong> you can see and change every bind; this site's Keybinds list shows the important defaults.</p><p>Joysticks, HOTAS and gamepads are supported, but learn the basics on keyboard first so guides and tutorials match what you see.</p>`,
        tip: `Default bindings change with major patches. If a key from an old video does nothing, check the Keybindings menu.`
      },
      {
        title: 'Choose your home location',
        body: `<p>On first login you create your character and choose a <strong>home location</strong>. This is where your <strong>personal hangar</strong> lives and where you fall back to when you die without another respawn point. As of 4.x the main options are the Stanton cities:</p><ul><li><strong>Lorville</strong> (Hurston) - industrial, easy hangar access.</li><li><strong>Area18</strong> (ArcCorp) - compact, lots of shops.</li><li><strong>New Babbage</strong> (microTech) - clean and modern, snowy planet.</li><li><strong>Orison</strong> (Crusader) - floating platforms in the clouds.</li></ul><p>Since 4.4, Levski in the Nyx system can also be a home, but staying in Stanton is easier at first.</p>`,
        warn: `Treat your home as a long-term choice; it may not be easy (or possible) to change later.`
      },
      {
        title: 'Expect alpha behaviour',
        body: `<p>Star Citizen is an <strong>alpha</strong>. Bugs, server hiccups and the occasional lost ship are part of the experience. Progress can also be reset by a <strong>wipe</strong> (the last full one was in 4.8; 4.9 and 4.10 kept progress).</p><p>Go in curious and relaxed: the fun is in the journey, not in grinding every credit.</p>`,
        tip: `Consider the in-game tutorial on your first login. It walks you through helmets, mobiGlas, transit and calling a ship.`
      }
    ]
  },

  // ---------------------------------------------------------------------------
  {
    id: 'first-ten-minutes',
    title: 'Your First 10 Minutes',
    icon: '🛏️',
    level: 'Beginner',
    minutes: 7,
    summary: 'Wake up, learn the interaction system, open your mobiGlas and inventory, gear up and find your way through the city.',
    steps: [
      {
        title: 'Where you wake up',
        body: `<p>Depending on where you log in, you wake up in a <strong>hab</strong> (a small rented apartment) or, as of 4.3+, directly in your <strong>personal hangar</strong> at your home location. Away from home you usually spawn in a hab or at the last medical bed you set.</p><p>Take a moment: look around with the mouse, walk with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, sprint with <kbd>Left Shift</kbd> and jump with <kbd>Space</kbd>.</p>`
      },
      {
        title: 'Learn the interaction system',
        body: `<p>Almost everything is "physical": doors, buttons, beds, terminals, items.</p><ul><li>Look at something and press <kbd>F</kbd> to use its default action.</li><li><strong>Hold</strong> <kbd>F</kbd> to enter <strong>interaction mode</strong>. A cursor appears and highlights everything you can use; click an option to pick it.</li></ul><p>When something "doesn't work", hold <kbd>F</kbd> and look for a different option.</p>`,
        tip: `Use Left Alt + F for your Personal Inner Thought menu (emotes, helmet and more).`
      },
      {
        title: 'Open your mobiGlas',
        body: `<p>Press <kbd>F1</kbd> to open the <strong>mobiGlas</strong>, the wrist computer that holds your apps:</p><ul><li><strong>Home</strong> - your wallet balance, CrimeStat and vitals.</li><li><strong>Health</strong> - hunger, thirst, injuries and more.</li><li><strong>Contracts</strong> - your missions.</li><li><strong>Maps</strong> - the starmap (also <kbd>F2</kbd>).</li><li><strong>Commlink</strong> - friends, party and ATC (also <kbd>F11</kbd>).</li><li><strong>Reputation</strong>, <strong>Wallet</strong>, <strong>Journal</strong>, <strong>Assets</strong> and vehicle tools.</li></ul>`,
        tip: `The Assets app tells you where your ships and items are stored. Use it whenever you "lose" something.`
      },
      {
        title: 'Watch your hunger and thirst',
        body: `<p>Your character needs <strong>food</strong> and <strong>water</strong>. Check the Health app or the small status icons on your HUD. If you neglect them you'll get warnings and then penalties such as reduced stamina and, eventually, health damage.</p><p>Buy drinks and snacks at vending machines, food stalls or convenience stores, then eat or drink them by holding <kbd>F</kbd> on the item or using it from your inventory.</p>`,
        tip: `Keep a bottle of water and a snack in your backpack or ship at all times.`
      },
      {
        title: 'Open your inventory',
        body: `<p>Tap <kbd>I</kbd> to open your <strong>inventory</strong>. As of 4.7 it uses a two-panel layout: your character on one side, nearby containers (lockers, ship storage, a crate, a body) shown as tabs on the other. Drag items between them to equip or store.</p><p>Items stored at a location stay at that location. Your apartment or hangar storage in Lorville is not the same box as storage in Area18.</p>`,
        warn: `Whatever you carry on your body can be lost when you die. Leave valuables in storage.`
      },
      {
        title: 'Get dressed for the job',
        body: `<p>You start with basic clothes or an undersuit. Before leaving the city:</p><ul><li>Wear an <strong>undersuit</strong> and a <strong>helmet</strong> so you can survive vacuum or a hull breach. Left Alt + H equips your helmet.</li><li>Add <strong>armor</strong> (light is fine at first) for protection.</li><li>A <strong>backpack</strong> adds carrying space.</li><li>Flight suits help with G-forces when flying (since 4.8), while heavy combat armor lowers your tolerance.</li></ul>`
      },
      {
        title: 'Leave your hab or hangar',
        body: `<p>Head to the exit and take the <strong>elevator</strong>. Elevator panels list destinations by name; use <kbd>F</kbd> on the destination you want.</p><p>If you woke up in your personal hangar, its elevator links to the rest of the spaceport and city. If you are in a hab, the elevator takes you to the hab lobby and on toward transit, shops and the spaceport.</p>`
      },
      {
        title: 'Follow the wayfinding signs',
        body: `<p>Cities and stations are big. Look for overhead <strong>signs</strong>: they point to the spaceport, hangars, transit, shops, medical and habs. Many have arrows and small icons.</p><p>The mobiGlas <strong>Maps</strong> app also has local maps for many locations, and you can set waypoints for some destinations.</p>`,
        tip: `Lost? Ask in global chat (F12). Most players are happy to point the way.`
      },
      {
        title: 'Ride trains and trams',
        body: `<p>Some cities are too big to walk:</p><ul><li><strong>Lorville</strong> and <strong>New Babbage</strong> use metro/tram lines between districts and the spaceport.</li><li><strong>Orison</strong> uses sky shuttles between its platforms.</li><li><strong>Area18</strong> is compact and mostly walkable with elevators.</li></ul><p>Check the line map on the platform, board, and watch the stop names. Doors open automatically at each station.</p>`,
        warn: `Stand inside the carriage when it departs. Hanging off the edge can get you left behind or hurt.`
      }
    ]
  },

  // ---------------------------------------------------------------------------
  {
    id: 'getting-your-ship-out',
    title: 'Getting Your Ship Out of the Hangar',
    icon: '🛫',
    level: 'Beginner',
    minutes: 7,
    summary: 'Use an ASOP terminal to retrieve your ship, power it up, get clearance from ATC and fly out safely.',
    steps: [
      {
        title: 'Find an ASOP terminal',
        body: `<p>Ships are managed at <strong>ASOP terminals</strong> (also called fleet manager terminals). You'll find them in the spaceport's hangar area, inside personal hangars, and in station hangar lobbies.</p><p>Walk up and press <kbd>F</kbd> to use it. You'll see your ships, where they are stored and their status.</p>`
      },
      {
        title: 'Retrieve your ship',
        body: `<p>Select the ship and choose <strong>Retrieve</strong>. Only ships stored at your current location can be retrieved there; others show their location (you can pay for delivery in some cases).</p><p>A message tells you which <strong>hangar or pad</strong> the ship has been sent to. At your home location it usually goes to your <strong>personal hangar</strong>. If the ship is too big for it, you get a public hangar instead.</p>`,
        tip: `Write down or screenshot the hangar number; it's easy to forget on the walk.`
      },
      {
        title: 'Go to your hangar',
        body: `<p>Use the hangar elevators near the ASOP terminals. Select the hangar or pad number you were given and ride down.</p><p>If you're already in your personal hangar, the ship appears there; give it a few seconds to load in.</p>`,
        warn: `If the elevator shows no hangar for you, wait a moment and try again, or store and retrieve the ship again.`
      },
      {
        title: 'Board the ship',
        body: `<p>Walk to the ship and look for the entry: a ramp, ladder, elevator or door. Hold <kbd>F</kbd> to see options such as <strong>Open</strong> or <strong>Lower ramp</strong>.</p><p>Inside, find the pilot seat and use <kbd>F</kbd> on it to sit. Press and hold <kbd>Y</kbd> to get up again.</p>`
      },
      {
        title: 'Power on: Flight Ready',
        body: `<p>Once seated, press <kbd>Right Alt</kbd> + <kbd>R</kbd> for <strong>Flight Ready</strong>. The ship powers up its systems and engines; this can take several seconds.</p><p>Look at your <strong>MFDs</strong> (the multi-function displays in the cockpit): they show power, shields, weapons, fuel and more.</p>`,
        tip: `If nothing happens, hold F and look at the cockpit panels: you can also power things manually.`
      },
      {
        title: 'Ask ATC for clearance',
        body: `<p>Hangars and spaceports have <strong>Air Traffic Control (ATC)</strong>. Press <kbd>Left Alt</kbd> + <kbd>N</kbd> to request takeoff. The hangar doors or elevator platform will open once you're cleared.</p><p>You can also call ATC through the Commlink app (<kbd>F11</kbd>) if the keybind doesn't respond.</p>`,
        warn: `Don't try to take off before the doors are fully open. Clipping a door can damage or destroy your ship.`
      },
      {
        title: 'Lift off and raise the gear',
        body: `<p>Add vertical thrust with <kbd>Space</kbd> (strafe up), then move forward gently with <kbd>W</kbd>. Steer with the mouse.</p><p>Once clear of the hangar, press <kbd>N</kbd> to retract your <strong>landing gear</strong>. Fly slowly near structures; other ships are also coming and going.</p>`
      },
      {
        title: 'Leave the armistice zone safely',
        body: `<p>Cities and stations are <strong>armistice zones</strong>: weapons are locked and speed rules apply. Spaceports also have <strong>no-fly areas</strong>; follow the ATC route markers away from buildings.</p><p>Your HUD tells you when you leave the armistice zone. From that point other players can shoot at you, so stay alert.</p>`,
        tip: `Speeding or loitering near landing zones can earn fines. Get out of the way and climb out.`
      }
    ]
  },

  // ---------------------------------------------------------------------------
  {
    id: 'flying-basics',
    title: 'Flying Basics',
    icon: '🌌',
    level: 'Beginner',
    minutes: 9,
    summary: 'Master modes, flight assists, quantum travel, fuel and landing: everything to get from A to B.',
    steps: [
      {
        title: 'Basic flight controls',
        body: `<p>On a keyboard and mouse, the mouse aims the ship (pitch and yaw). Then:</p><ul><li><kbd>W</kbd>/<kbd>S</kbd> - forward/back thrust.</li><li><kbd>A</kbd>/<kbd>D</kbd> - strafe left/right.</li><li><kbd>Space</kbd>/<kbd>Left Ctrl</kbd> - strafe up/down.</li><li><kbd>Q</kbd>/<kbd>E</kbd> - roll.</li><li><kbd>Left Shift</kbd> - boost.</li><li><kbd>X</kbd> - space brake.</li></ul>`,
        tip: `Practise in empty space first. Space has lots of room and nothing to crash into.`
      },
      {
        title: 'Master modes: SCM vs NAV',
        body: `<p>Ships have two <strong>master modes</strong>. Long-press <kbd>B</kbd> to switch.</p><ul><li><strong>SCM</strong> (combat mode): lower top speed, but <strong>shields and weapons</strong> are active. Use it near other ships and for landing.</li><li><strong>NAV</strong> (navigation mode): much faster and enables <strong>quantum travel</strong>, but shields, weapons and countermeasures are offline.</li></ul>`,
        warn: `Never cruise around in NAV where fights happen. You'll be defenceless.`
      },
      {
        title: 'Speed limiter, cruise and decoupled',
        body: `<p>A few flight helpers:</p><ul><li><strong>Speed limiter</strong> - caps your speed. Adjust it with <kbd>Left Alt</kbd> + mouse wheel. Lower it for precise flying near stations.</li><li><strong>Cruise control</strong> - <kbd>Left Alt</kbd> + <kbd>C</kbd> holds your current speed.</li><li><strong>Decoupled mode</strong> - <kbd>C</kbd> lets you drift and turn without changing your direction of travel. Great for experts, confusing for beginners: if your ship "slides", turn it back off.</li></ul>`
      },
      {
        title: 'Leaving atmosphere',
        body: `<p>From a planet, point your nose up and climb. Atmosphere slows you and heats your ship, so a steady climb is best. Once the sky turns black you're in space.</p><p>Switching to NAV lets you reach higher speeds once clear of the city, and you can often quantum travel out of the upper atmosphere.</p>`
      },
      {
        title: 'Quantum travel with the starmap',
        body: `<p>Quantum travel (QT) is how you cross huge distances in seconds:</p><ul><li>Seated in your ship, press <kbd>F2</kbd> to open the map.</li><li>Pick a destination (planet, moon, station or mission marker) and choose <strong>Set Route</strong>.</li><li>Switch to <strong>NAV</strong> (long-press <kbd>B</kbd>). The quantum drive spools automatically.</li><li>Turn toward the <strong>route marker</strong> on your HUD until you're aligned.</li><li><strong>Hold</strong> <kbd>Left Mouse</kbd> to engage.</li></ul>`,
        tip: `Long trips may need a stop. If the map plots several jumps, repeat the process at each stop.`,
        warn: `QT is blocked near cities, stations and other "no quantum" zones. Fly clear first.`
      },
      {
        title: 'Understand your two fuels',
        body: `<p>Ships use two fuels, both shown on your MFDs/HUD:</p><ul><li><strong>Hydrogen</strong> powers your thrusters for normal flight.</li><li><strong>Quantum fuel</strong> powers the quantum drive for QT jumps.</li></ul><p>As of 4.10, hydrogen tanks are smaller across the fleet with lower consumption to compensate, and fuel prices went up. Long trips need planning.</p>`,
        warn: `Running dry far from anywhere is a classic beginner mistake. Check fuel before every long jump.`
      },
      {
        title: 'Refuel, repair and restock',
        body: `<p>Land at a station or spaceport and stay in your landed ship. Open the <strong>Landing Services</strong> (vehicle services) screen in the mobiGlas to <strong>refuel</strong>, <strong>repair</strong> and <strong>restock</strong> ammo. You pay in aUEC.</p><p>Rest stops at Lagrange points are handy refuelling stops between planets.</p>`
      },
      {
        title: 'Request a landing',
        body: `<p>When close to a station or city (within a few kilometres), press <kbd>Left Alt</kbd> + <kbd>N</kbd> to request landing. ATC assigns you a <strong>hangar or pad</strong> and shows a marker.</p><ul><li>Switch to <strong>SCM</strong> and slow down.</li><li>Lower your gear with <kbd>N</kbd>.</li><li>Approach slowly and touch down gently; small ships can usually use the auto-land function once lined up over the pad.</li></ul>`,
        tip: `Lower the speed limiter for landing. Gentle beats fast.`
      },
      {
        title: 'Store your ship',
        body: `<p>Once landed in an assigned hangar or pad, simply walk away: the ship is stored at that location when you leave. You can also store it from an ASOP terminal.</p><p>Remember: the ship is stored where you left it. Next time you want it, you must be at that location to retrieve it (or pay for delivery where available).</p>`,
        warn: `Don't leave a ship on a pad for long. Overstaying can earn fines, and abandoned ships may be impounded.`
      }
    ]
  },

  // ---------------------------------------------------------------------------
  {
    id: 'first-missions-and-money',
    title: 'Your First Missions & Money',
    icon: '💰',
    level: 'Beginner',
    minutes: 8,
    summary: 'Use the Contracts app, pick beginner-friendly jobs, and understand reputation and payouts.',
    steps: [
      {
        title: 'Open the Contracts app',
        body: `<p>Open your mobiGlas (<kbd>F1</kbd>) and go to <strong>Contracts</strong>. You'll see available jobs, those you've accepted, and job history.</p><p>Each offer shows the <strong>payout</strong>, the <strong>contractor</strong>, the <strong>risk</strong> and often a required rank. Lawful and unlawful offers are kept separate; stick to lawful work while you learn.</p>`,
        warn: `Unlawful contracts can give you CrimeStat. Read the description before accepting.`
      },
      {
        title: 'Accept, track and share',
        body: `<p>Click a contract and choose <strong>Accept</strong>. It becomes your tracked objective with a marker in your HUD and starmap. You can track one active contract at a time and switch between them.</p><p>Playing with friends? Form a party and <strong>share</strong> the contract so everyone gets the objectives (and usually a share of the payout).</p>`
      },
      {
        title: 'Starter job: deliveries',
        body: `<p><strong>Delivery</strong> missions (often called "box missions") ask you to pick up small packages and drop them elsewhere. They're perfect first jobs:</p><ul><li>Low risk and no special equipment.</li><li>They teach you quantum travel, landing and finding your way around.</li><li>Any starter ship works.</li></ul>`,
        tip: `Put the box into a cargo grid or your ship's storage so it doesn't fall around.`
      },
      {
        title: 'Starter job: bounty hunting',
        body: `<p>Bounty contracts send you to destroy a wanted NPC ship. They are ranked by danger:</p><ul><li><strong>VLRT</strong> (very low risk) and <strong>LRT</strong> - fine for a starter fighter.</li><li><strong>MRT</strong>, <strong>HRT</strong>, <strong>VHRT</strong> and up - bigger targets and escorts.</li></ul><p>Your bounty rank rises as you complete jobs. Fight in <strong>SCM</strong> mode and keep an eye on your shields.</p>`
      },
      {
        title: 'Starter job: mining and salvage',
        body: `<ul><li><strong>Hand mining</strong> - buy a multi-tool and a mining attachment, then mine small gems in caves or on surfaces. Cheap to start.</li><li><strong>ROC mining</strong> - a small ground vehicle that mines gems. Needs a ship that can carry it, or a rental.</li><li><strong>Salvage</strong> - scrape hull material off wrecks with a salvage ship like the Drake Vulture.</li></ul><p>As of 4.6+ there are also mining and salvage contracts, so you don't need to sell everything on the open market.</p>`
      },
      {
        title: 'Cargo hauling and trading',
        body: `<p>If your ship has cargo space you can:</p><ul><li>Take <strong>hauling contracts</strong>: move cargo for a fixed fee.</li><li><strong>Trade</strong>: buy commodities at a trade terminal, fly them elsewhere and sell for profit.</li></ul><p>Cargo is physical: crates sit in your ship's cargo grid. Depending on location it is loaded by the station's cargo service or appears at your hangar's <strong>freight elevator</strong>, and you move it with a tractor beam.</p>`,
        warn: `Trading puts your own money at risk. Start small, and never haul more than you can afford to lose.`
      },
      {
        title: 'Reputation explained',
        body: `<p>Each contractor and faction tracks your <strong>reputation</strong> (standing). Completing jobs raises it; failing or abandoning jobs lowers it.</p><ul><li>Higher <strong>ranks</strong> unlock better-paying, harder contracts.</li><li>Reputation can decay if you stop working for someone.</li><li>Check progress in the mobiGlas <strong>Reputation</strong> app.</li></ul>`,
        tip: `Pick one or two contractors and stick with them for a while to climb their ranks faster.`
      },
      {
        title: 'Payouts and your wallet',
        body: `<p>When you finish a contract the reward goes straight into your <strong>wallet</strong> in <strong>aUEC</strong>. Check the balance in the mobiGlas Home or Wallet app.</p><p>Some contracts also reward items or, since 4.7, <strong>blueprints</strong> for crafting. Use the Wallet app to send aUEC to friends (a small fee applies).</p>`
      }
    ]
  },

  // ---------------------------------------------------------------------------
  {
    id: 'staying-alive',
    title: 'Staying Alive',
    icon: '🩹',
    level: 'Beginner',
    minutes: 7,
    summary: 'Healing, injuries, incapacitation, respawning, recovering your gear and claiming a lost ship.',
    steps: [
      {
        title: 'Carry MedPens',
        body: `<p>A <strong>MedPen</strong> (filled with Hemozal) heals health and can help with injuries. Buy a few at medical shops or general stores and keep them in your armor's utility slots.</p><p>Equip one and use it on yourself, or <kbd>Right Mouse</kbd> to inject another player. Don't overdo it: medical drugs raise your <strong>BDL</strong> (blood drug level), and too much causes side effects.</p>`,
        tip: `Keep a couple of MedPens in your ship as a backup stash.`
      },
      {
        title: 'Food, water and your environment',
        body: `<p>Starvation and dehydration slowly hurt you. Extreme heat or cold, and missing oxygen, can too. Watch your HUD warnings.</p><p>Wear a helmet and a suit rated for the environment if you're heading to icy moons, hot deserts or anywhere with no breathable air.</p>`
      },
      {
        title: 'Injuries and tiers',
        body: `<p>Taking damage can leave you with <strong>injuries</strong> to specific limbs, such as limping or shaky aim. Injuries come in tiers: <strong>Tier 3</strong> is minor, <strong>Tier 1</strong> is most severe.</p><p>MedPens can stabilise you, but serious injuries need a <strong>medical bed</strong> at a hospital, clinic or in a ship with a med bay.</p>`
      },
      {
        title: 'If you are incapacitated',
        body: `<p>Sometimes you're "downed" instead of killed outright. While incapacitated:</p><ul><li>Hold <kbd>M</kbd> to send a <strong>rescue beacon</strong> so medics or friends can come and revive you.</li><li>Teammates can revive you with a MedPen.</li><li>If nobody can help, you can give up and <strong>regenerate</strong> (respawn), shown on screen as <kbd>Backspace</kbd> by default.</li></ul>`
      },
      {
        title: 'Hospitals, clinics and med beds',
        body: `<p>Every main city has a <strong>hospital</strong>, and many stations have <strong>clinics</strong>. Their med beds fully heal you and treat injuries.</p><p>Some ships also carry med beds (tiered T3 to T1). Since 4.3.1 those beds use <strong>MedGel</strong>, a resource you need to keep topped up, for respawns and treatments.</p>`
      },
      {
        title: 'Set your respawn point',
        body: `<p>When you die you <strong>regenerate</strong> at your active respawn point. To set one, interact with a suitable medical bed (at a hospital, clinic or on a ship) and choose to set it as your regen location.</p><p>If that bed is out of range, broken or out of MedGel, you're sent to your <strong>home location</strong> instead.</p>`,
        tip: `Before a long trip, set your respawn at the nearest station clinic so you don't wake up a whole system away.`
      },
      {
        title: 'Recover your body and loot',
        body: `<p>When you die, your body and the gear on it stay where you died for a while. You can go back and loot your own body to recover weapons and armor, but other players can too.</p><p>Treat anything you carry as "at risk". Keep spare sets of cheap armor and weapons in storage so a death doesn't leave you naked.</p>`,
        warn: `Don't rush back into the same danger. Gear up first, and bring a friend if you can.`
      },
      {
        title: 'Claiming a lost ship',
        body: `<p>If your ship is destroyed, go to any ASOP terminal and file a <strong>Claim</strong>. After a timer, the ship is available again.</p><ul><li>As of 4.8 you choose between the free <strong>manufacturer loadout</strong> (longer wait) or your saved <strong>insured loadout</strong>, which costs aUEC.</li><li>As of 4.10, claim timers scale with the ship's value, and you can pay to <strong>expedite</strong>.</li><li>Cargo and loose items inside are lost.</li></ul>`
      }
    ]
  },

  // ---------------------------------------------------------------------------
  {
    id: 'laws-and-crimestat',
    title: 'Laws & CrimeStat',
    icon: '⚖️',
    level: 'Beginner',
    minutes: 6,
    summary: 'Armistice zones, what makes you a criminal, fines, prison, and why Pyro is different.',
    steps: [
      {
        title: 'Armistice zones',
        body: `<p>Cities, spaceports and most stations are <strong>armistice zones</strong>. Your HUD shows when you enter or leave one. Inside:</p><ul><li>Weapons can't be fired.</li><li>Ship weapons are locked.</li><li>Breaking the rules quickly brings security.</li></ul><p>Outside, everything is possible, so treat leaving armistice as stepping into the wild.</p>`
      },
      {
        title: 'What gives you CrimeStat',
        body: `<p><strong>CrimeStat</strong> is your wanted level (1 to 5). Things that can raise it:</p><ul><li>Attacking or killing lawful players or NPCs.</li><li>Damaging or stealing ships.</li><li>Trespassing in restricted areas.</li><li>Carrying illegal goods past checkpoints.</li><li>Unlawful contracts.</li><li>Parking and flight violations near landing zones.</li></ul>`,
        warn: `Even accidents count. Hitting a friend or flying into someone can still give you CrimeStat.`
      },
      {
        title: 'Fines for small offences',
        body: `<p>Minor offences often give a <strong>fine</strong> rather than a full CrimeStat. Pay them promptly; ignoring them can lead to bigger trouble. Fines show in your mobiGlas, and ASOP terminals may ask you to pay a fine before releasing a ship.</p><p>CrimeStat also drops over time if you stay out of trouble.</p>`
      },
      {
        title: 'What happens when you are wanted',
        body: `<p>With CrimeStat:</p><ul><li>You show as a target to security and to other players.</li><li>Bounty hunters can get contracts on you.</li><li>Landing zones may refuse you landing.</li><li>If you're killed or arrested by security, you can be sent to prison.</li></ul>`
      },
      {
        title: 'Prison: Klescher',
        body: `<p>Prisoners go to <strong>Klescher Rehabilitation Facility</strong>, a prison on the moon Aberdeen. Your sentence counts down while you're logged in.</p><p>You can shorten it by doing prison tasks such as mining, and some players attempt an escape through the surrounding caves. Items you had on you are confiscated and returned when you leave.</p>`
      },
      {
        title: 'Clearing CrimeStat illegally',
        body: `<p>Criminals can try to <strong>hack</strong> security records to wipe their CrimeStat. This involves special tools and dangerous locations, and is itself a crime. Where and how this works has changed several times; check this site's locations pages and current patch notes before trying.</p>`,
        warn: `Not recommended for new players. You'll likely lose your gear on the way.`
      },
      {
        title: 'Pyro and lawless space',
        body: `<p><strong>Pyro</strong> (reached by jump gate since 4.0) is lawless: no UEE police, and gangs control its stations. That means:</p><ul><li>Other players can attack you freely in open space.</li><li>Gangs and factions remember who you've helped or shot, and that <strong>reputation</strong> can change how stations treat you.</li><li>Many stations still have armistice zones inside.</li></ul><p><strong>Nyx</strong> (since 4.4) is also frontier space; be careful there too.</p>`,
        tip: `Learn the ropes in Stanton first. Visit Pyro with friends.`
      },
      {
        title: 'Avoid friendly fire',
        body: `<p>Shooting allies can still count as a crime. To stay safe:</p><ul><li>Form a <strong>party</strong> with friends, so you're marked as allies.</li><li>Check your target before firing.</li><li>Don't spray guns in crowded combat.</li><li>Agree on who goes first at a door.</li></ul>`
      }
    ]
  },

  // ---------------------------------------------------------------------------
  {
    id: 'buying-stuff',
    title: 'Buying Stuff',
    icon: '🛒',
    level: 'Beginner',
    minutes: 6,
    summary: 'Shops, terminals, buying or renting ships with in-game money, and upgrading your loadout.',
    steps: [
      {
        title: 'How shops work',
        body: `<p>Shops are real stores in cities and stations. Walk in, look at items on display, and press <kbd>F</kbd> to <strong>inspect</strong>, <strong>try on</strong> or <strong>buy</strong>. Some shops use a counter terminal instead.</p><p>Bought items normally go into the local storage or straight onto you.</p>`,
        tip: `Use this site's Shops and Locations pages to find who sells what.`
      },
      {
        title: 'Trade and service terminals',
        body: `<p>Not everything is on a shelf:</p><ul><li><strong>Commodity terminals</strong> - buy and sell trade goods, ore and salvage.</li><li><strong>Item terminals</strong> - sell items you've looted.</li><li><strong>Rental terminals</strong> - rent ships and vehicles.</li><li><strong>ASOP terminals</strong> - manage, store and claim ships.</li></ul>`
      },
      {
        title: 'Buy ships with aUEC',
        body: `<p>Many ships can be bought with in-game money (aUEC) at <strong>ship dealerships</strong> in the major cities and some stations. Once bought, the ship appears in your ASOP terminal.</p><p>This is the main way to grow your fleet without spending real money, and a great long-term goal.</p>`,
        warn: `Ships bought with aUEC may be lost in a wipe, like the rest of your in-game progress.`
      },
      {
        title: 'Pledging vs. in-game buying',
        body: `<p>Ships bought on the RSI website (<strong>pledges</strong>) are tied to your account and survive wipes. Ships bought in game with aUEC are part of your in-game progress.</p><p>You <strong>never</strong> need to pledge for more ships to enjoy the game. Many players fly only their starter ship plus in-game purchases.</p>`
      },
      {
        title: 'Rent before you buy',
        body: `<p><strong>Rent</strong> a ship for a day or a few days at a rental terminal. It's the cheapest way to try mining, cargo or combat ships before investing, and to find what you like.</p>`,
        tip: `Rentals expire. Note the end time so you don't lose cargo left inside.`
      },
      {
        title: 'Upgrade your ship loadout',
        body: `<p>You can swap ship <strong>components</strong> (weapons, shields, coolers, quantum drives, power plants) bought from component shops.</p><ul><li>Buy the part, then use the <strong>Vehicle Loadout Manager</strong> in your mobiGlas while your ship is stored or landed at that location.</li><li>Check sizes and types: parts must match the slot.</li></ul><p>As of 4.8, save your loadout at the ASOP terminal so an insurance claim can restore it.</p>`
      },
      {
        title: 'Armor, weapons, ammo and food',
        body: `<p>For personal gear:</p><ul><li><strong>Armor</strong> - clothing and armor shops in cities and stations.</li><li><strong>Weapons and ammo</strong> - weapon stores. Buy spare magazines; ammo is not infinite.</li><li><strong>Food and drink</strong> - restaurants, bars, vending machines and convenience stores.</li><li><strong>Medical</strong> - MedPens and medical supplies at clinics and pharmacies.</li></ul><p>See this site's Shops and Locations pages for exact places.</p>`
      },
      {
        title: 'Crafting your own gear',
        body: `<p>Since 4.7 you can <strong>craft</strong> items at an <strong>Item Fabricator</strong> using <strong>blueprints</strong> and materials.</p><ul><li>You start with a few default blueprints; more come as mission rewards.</li><li>Material quality (for example mined ore quality) affects the result's stats.</li><li>Fabricators can be bought and placed in a hangar or a large enough ship.</li></ul>`
      }
    ]
  },

  // ---------------------------------------------------------------------------
  {
    id: 'playing-with-others',
    title: 'Playing With Others',
    icon: '🤝',
    level: 'Beginner',
    minutes: 5,
    summary: 'Parties, shared missions, beacons, organizations, Spectrum and good etiquette.',
    steps: [
      {
        title: 'Add friends and form a party',
        body: `<p>Open the <strong>Commlink</strong> (<kbd>F11</kbd>) to manage friends, channels and parties. Invite friends to a party so you see each other on the map, can share missions and can enter each other's hangars.</p><p>To play together, everyone needs to be on the same server (shard). The party leader can help others join.</p>`
      },
      {
        title: 'Share missions',
        body: `<p>Accept a contract, then use <strong>Share</strong> in the Contracts app. Party members can accept the shared contract and track the same objectives. Payouts are usually split.</p>`
      },
      {
        title: 'Use beacons',
        body: `<p><strong>Beacons</strong> are public requests for help, for example a rescue, a fuel refill or an escort. Players see them in their Contracts app and can respond for a reward you set.</p><p>When you're incapacitated, hold <kbd>M</kbd> to send a rescue beacon.</p>`,
        warn: `Some players use fake beacons as traps, especially in lawless areas. Be careful.`
      },
      {
        title: 'Join an organization (Org)',
        body: `<p><strong>Organizations</strong> are player groups. Browse them on the RSI website under Community &gt; Organizations. Filter by focus (mining, bounty, exploration...), language, and how casual or hardcore they are.</p><p>Many orgs welcome new players and teach them. You can be in several orgs, with one set as your main.</p>`,
        tip: `Look for orgs with an active Discord and regular events. That's where the learning happens.`
      },
      {
        title: 'Spectrum and community',
        body: `<p><strong>Spectrum</strong> is the official forum and chat on the RSI website. It has help channels, patch notes and announcements. The in-game chat (<kbd>F12</kbd>) connects to it.</p>`
      },
      {
        title: 'Voice and text comms',
        body: `<p>Press <kbd>F12</kbd> to open chat and <kbd>Tab</kbd> to switch channels (Global, party and more). Many groups use Discord for voice. The game also has built-in proximity voice that you can enable in the settings.</p>`
      },
      {
        title: 'Etiquette',
        body: `<ul><li>Don't block elevators, doors or landing pads.</li><li>Clear your landing pad quickly.</li><li>Ask before boarding someone else's ship.</li><li>Be patient with newer players; you were one once.</li><li>Keep global chat friendly and helpful.</li></ul>`
      }
    ]
  },

  // ---------------------------------------------------------------------------
  {
    id: 'next-steps-careers',
    title: 'Next Steps & Careers',
    icon: '🧭',
    level: 'Intermediate',
    minutes: 8,
    summary: 'An overview of the main careers and what you need to get started in each.',
    steps: [
      {
        title: 'Bounty hunting',
        body: `<p>Take bounty contracts to hunt wanted NPCs or players, from very low risk (VLRT) upward.</p><p><strong>To start:</strong> a ship with weapons and shields (most starter ships work), some ammo or missiles, and a willingness to die a few times.</p>`
      },
      {
        title: 'Cargo hauling and trading',
        body: `<p>Move goods for contractors or buy low, sell high.</p><p><strong>To start:</strong> a ship with cargo space (even a small one), some aUEC to invest, and a trade tool site for prices. Learn how freight elevators and tractor beams work.</p>`
      },
      {
        title: 'Mining',
        body: `<p>From hand mining gems to mining ships cracking asteroids.</p><p><strong>To start:</strong> a multi-tool with a mining attachment for hand mining, or rent a ROC or a mining ship. Ore must be refined or sold; quality matters for crafting.</p>`
      },
      {
        title: 'Salvage',
        body: `<p>Scrape hull material and recover components from wrecks.</p><p><strong>To start:</strong> a salvage ship such as the Drake Vulture (buy or rent), or salvage contracts. Sell the material at commodity terminals.</p>`
      },
      {
        title: 'Exploration',
        body: `<p>Visit caves, derelicts, abandoned outposts and remote moons, and look for loot and rare locations.</p><p><strong>To start:</strong> any ship with good range, a scanner (<kbd>V</kbd> for scan mode), good armor, food, water and a flashlight (<kbd>T</kbd>).</p>`
      },
      {
        title: 'Medical and rescue',
        body: `<p>Respond to rescue beacons and keep other players alive.</p><p><strong>To start:</strong> MedPens and a medical tool. Later, a ship with a med bed (stocked with MedGel) lets players respawn at your ship.</p>`
      },
      {
        title: 'Refuelling',
        body: `<p>Sell fuel to stranded ships via beacons and refuelling contracts.</p><p><strong>To start:</strong> this needs a dedicated refuelling ship such as the MISC Starfarer. Fuel economics changed in 4.10, so check current prices.</p>`
      },
      {
        title: 'Piracy',
        body: `<p>Interdict and rob other players or NPCs, often in Pyro.</p><p><strong>To start:</strong> a fighting ship, friends, and acceptance of CrimeStat and lots of risk. Play fair and don't grief new players.</p>`,
        warn: `Piracy in Stanton gives CrimeStat. Expect bounty hunters on your tail.`
      },
      {
        title: 'Racing',
        body: `<p>Race in Arena Commander or on community tracks in the persistent universe.</p><p><strong>To start:</strong> a fast, agile ship and lots of practice. Arena Commander lets you try ships without risk.</p>`
      },
      {
        title: 'Crafting',
        body: `<p>Since 4.7, craft gear and parts using blueprints and materials at an Item Fabricator.</p><p><strong>To start:</strong> a fabricator, blueprints (some default, more from mission rewards) and good-quality materials. Teaming up with miners helps.</p>`
      }
    ]
  }
];

// Default keyboard bindings as reported for Alpha 4.10. All can be changed in Options > Keybindings.
export const keybinds = [
  { key: 'F1', action: 'Open/close mobiGlas', context: 'General' },
  { key: 'F2', action: 'Open/close map (starmap)', context: 'General' },
  { key: 'F11', action: 'Open/close Commlink (friends, party, ATC)', context: 'General' },
  { key: 'F12', action: 'Show/hide chat window', context: 'General' },
  { key: 'F4', action: 'Toggle third-person view', context: 'General' },
  { key: 'Z (hold)', action: 'Free look', context: 'General' },
  { key: 'I', action: 'Open inventory (hold to open loot screen)', context: 'On foot' },
  { key: 'F', action: 'Interact (hold for interaction mode)', context: 'On foot' },
  { key: 'W / A / S / D', action: 'Move', context: 'On foot' },
  { key: 'Left Shift', action: 'Sprint', context: 'On foot' },
  { key: 'Space', action: 'Jump', context: 'On foot' },
  { key: 'C', action: 'Crouch', context: 'On foot' },
  { key: 'Left Ctrl', action: 'Prone', context: 'On foot' },
  { key: 'R', action: 'Reload (hold to holster weapon)', context: 'On foot' },
  { key: 'T', action: 'Toggle flashlight', context: 'On foot' },
  { key: 'Left Alt + X', action: 'Wipe helmet visor', context: 'On foot' },
  { key: 'M (hold)', action: 'Send rescue beacon while incapacitated', context: 'On foot' },
  { key: 'Right Alt + R', action: 'Flight Ready (power up ship)', context: 'Ship' },
  { key: 'Y (hold)', action: 'Exit seat', context: 'Ship' },
  { key: 'B (hold)', action: 'Switch master mode (SCM / NAV)', context: 'Ship' },
  { key: 'Left Mouse (hold)', action: 'Engage quantum drive (in NAV mode with a route set)', context: 'Ship' },
  { key: 'N', action: 'Toggle landing gear', context: 'Ship' },
  { key: 'Left Alt + N', action: 'Request landing / takeoff from ATC', context: 'Ship' },
  { key: 'W / S', action: 'Thrust forward / backward', context: 'Ship' },
  { key: 'A / D', action: 'Strafe left / right', context: 'Ship' },
  { key: 'Space / Left Ctrl', action: 'Strafe up / down', context: 'Ship' },
  { key: 'Q / E', action: 'Roll left / right', context: 'Ship' },
  { key: 'Left Shift', action: 'Boost', context: 'Ship' },
  { key: 'X', action: 'Space brake', context: 'Ship' },
  { key: 'C', action: 'Toggle decoupled mode', context: 'Ship' },
  { key: 'Left Alt + C', action: 'Toggle cruise control', context: 'Ship' },
  { key: 'Left Alt + Mouse Wheel', action: 'Adjust speed limiter', context: 'Ship' },
  { key: 'L', action: 'Toggle headlights', context: 'Ship' },
  { key: 'V', action: 'Toggle scanning mode', context: 'Ship' },
  { key: 'Tab (hold & release)', action: 'Radar ping', context: 'Ship' },
  { key: 'M', action: 'Toggle mining / salvage mode (on equipped ships)', context: 'Ship' },
  { key: 'H', action: 'Launch decoy countermeasures', context: 'Ship' },
  { key: 'W / S', action: 'Accelerate / reverse', context: 'Vehicle' },
  { key: 'X', action: 'Brake', context: 'Vehicle' },
  { key: 'Y (hold)', action: 'Exit seat', context: 'Vehicle' }
];

export const glossary = [
  { term: 'aUEC', def: 'Alpha United Earth Credits: the in-game money you earn and spend while the game is in alpha. Can be reset by a wipe.' },
  { term: 'UEC', def: 'United Earth Credits, the in-universe currency. Bonuses such as the referral reward are given as UEC and show up in game as aUEC.' },
  { term: 'SCU', def: 'Standard Cargo Unit: the measure of cargo volume. Ships list their cargo capacity in SCU.' },
  { term: 'QT', def: 'Quantum Travel: very fast travel between locations using your quantum drive, plotted in the starmap.' },
  { term: 'Quantum fuel', def: 'Fuel used by your quantum drive for QT jumps. Refill it at stations and landing zones.' },
  { term: 'Hydrogen fuel', def: 'Fuel used by your thrusters for normal flight. Tanks were made smaller (with lower consumption) in 4.10.' },
  { term: 'ASOP', def: 'Ship terminals (fleet manager terminals) used to retrieve, store and claim your ships and save insured loadouts.' },
  { term: 'mobiGlas', def: 'Your wrist computer (F1). Contracts, maps, Commlink, health, reputation, wallet and more live here.' },
  { term: 'MFD', def: 'Multi-Function Display: the configurable screens in your cockpit that show power, shields, weapons, fuel and more.' },
  { term: 'HUD', def: 'Heads-Up Display: the information overlay in your helmet visor and ship cockpit.' },
  { term: 'Master modes', def: 'Ship flight modes. SCM is for combat (shields and weapons on); NAV is for fast travel and quantum (shields and weapons off). Long-press B to switch.' },
  { term: 'SCM', def: 'Space Combat Maneuvering mode: lower top speed, shields and weapons active.' },
  { term: 'NAV', def: 'Navigation mode: high speed and quantum travel, but no shields, weapons or countermeasures.' },
  { term: 'Decoupled', def: 'A flight mode where your ship keeps drifting in its current direction while you rotate freely.' },
  { term: 'ATC', def: 'Air Traffic Control. Gives clearance to take off and land, and assigns hangars and pads.' },
  { term: 'CrimeStat', def: 'Your wanted level (1-5). Raised by crimes; makes you a target for security and bounty hunters.' },
  { term: 'Armistice Zone', def: 'A safe area in cities and stations where weapons are disabled.' },
  { term: 'Klescher', def: 'Klescher Rehabilitation Facility, the prison on Aberdeen where arrested criminals serve their sentence.' },
  { term: 'Hab', def: 'A small rented apartment in a city or station where you can spawn, log out and store items.' },
  { term: 'Hangar', def: 'Where your ship parks. Your personal hangar is at your home location and can be decorated; elsewhere you get public hangars.' },
  { term: 'Home location', def: 'The place you picked at character creation. Holds your personal hangar and is your fallback respawn point.' },
  { term: 'Freight elevator', def: 'An elevator in your hangar for moving cargo and items between your hangar and local storage.' },
  { term: 'Tractor beam', def: 'A tool (handheld or on ships) that lifts and moves crates and objects.' },
  { term: 'PU', def: 'Persistent Universe: the main online sandbox world of Star Citizen.' },
  { term: 'Arena Commander', def: 'A separate game mode for dogfighting, racing and practice without risk to your PU ships or money.' },
  { term: 'LIVE / PTU', def: 'LIVE is the normal game build; PTU (Public Test Universe) is a test server for upcoming patches.' },
  { term: 'Pledge', def: 'A purchase on the RSI website that supports development, such as a game package or a ship.' },
  { term: 'Game Package', def: 'The purchase that gives you access to the game, including a starter ship.' },
  { term: 'LTI', def: 'Lifetime Insurance on pledged ships. In-game insurance does not currently expire for anyone, so LTI has no practical effect right now.' },
  { term: 'Insurance claim', def: 'Getting a destroyed ship back via an ASOP terminal after a timer. You can pay to expedite.' },
  { term: 'Wipe', def: 'A reset of in-game progress (aUEC, in-game purchases, items). Pledged ships are not lost. The last full wipe was in 4.8.' },
  { term: 'LTP', def: 'Long Term Persistence: the system that keeps some of your progress through patches.' },
  { term: 'Spectrum', def: 'The official RSI forum and chat platform.' },
  { term: 'Org', def: 'An organization: a player group or guild. Find one on the RSI website.' },
  { term: 'Rep / Standing', def: 'Your reputation with a contractor or faction. Higher standing unlocks better contracts.' },
  { term: 'Contract', def: 'A mission or job taken from the Contracts app in your mobiGlas.' },
  { term: 'Beacon', def: 'A public call for help (rescue, refuel, escort) that other players can accept.' },
  { term: 'Med bed', def: 'A medical bed in a hospital, clinic or ship. Heals injuries and can be set as your respawn point.' },
  { term: 'MedGel', def: 'A medical resource used by med beds (since 4.3.1) to respawn players and treat injuries.' },
  { term: 'MedPen', def: 'A single-use injector (Hemozal) that heals you or a teammate.' },
  { term: 'BDL', def: 'Blood Drug Level: rises when you use medical drugs. Too high causes side effects.' },
  { term: 'Regen', def: 'Regeneration: the in-game term for respawning after death.' },
  { term: 'Incapacitated', def: 'A downed state before death. Others can revive you; hold M to send a rescue beacon.' },
  { term: 'NPE', def: 'New Player Experience: the in-game tutorial for first-time players.' },
  { term: 'Stanton', def: 'The starting system, owned by corporations: Hurston, Crusader, ArcCorp and microTech.' },
  { term: 'Pyro', def: 'A lawless system controlled by gangs, reached via jump gate since 4.0.' },
  { term: 'Nyx', def: 'A frontier system home to Levski, added in 4.4 and connected to Stanton and Pyro.' },
  { term: 'Lagrange point', def: 'Stable points around planets (L1-L5) where rest stops and stations are located.' },
  { term: 'Rest stop', def: 'A small station at a Lagrange point with refuelling, shops and a clinic.' },
  { term: 'Jump point', def: 'A wormhole between star systems. Gates make them safer to travel.' },
  { term: 'Loot', def: 'Items found on bodies and in crates. Hold I or use interaction mode to loot.' },
  { term: 'Blueprint', def: 'A recipe for crafting an item (since 4.7). Some are default; more come from missions.' },
  { term: 'Crafting', def: 'Making items at an Item Fabricator using blueprints and materials. Material quality affects the result.' },
  { term: 'VLRT / LRT / HRT / VHRT', def: 'Bounty risk ratings, from Very Low Risk Target to Very High Risk Target.' },
  { term: 'ROC', def: 'A small ground vehicle used for mining gems on planet surfaces.' },
  { term: 'Server meshing / Shard', def: 'The technology that splits the universe across servers. A shard is one copy of the universe you play in.' }
];

export const faq = [
  {
    q: 'The game is laggy or stuttering. Is it my PC?',
    a: `<p>Maybe, maybe not. Two different things can cause lag:</p><ul><li><strong>Client FPS</strong> (your PC): low framerate everywhere, especially in cities. Check your SSD, RAM (32 GB helps), graphics settings and try Vulkan vs DirectX.</li><li><strong>Server performance</strong>: everything feels rubber-banding, NPCs freeze and doors are slow, even with good FPS. That's the server, not you. Try another server or come back later.</li></ul>`
  },
  {
    q: 'I died. What now?',
    a: `<p>You regenerate at your active respawn point (a medical bed you set), or at your home location if none is available. Your gear stays on your body where you died: you can go back and loot it if you're careful. If your ship was destroyed, file a claim at an ASOP terminal.</p>`
  },
  {
    q: 'Where is my ship?',
    a: `<p>Ships stay where you last stored them. Open the mobiGlas <strong>Assets</strong> app or check any ASOP terminal to see its location. If it was destroyed or lost, file a <strong>Claim</strong> at an ASOP terminal.</p>`
  },
  {
    q: 'How do I make my first money?',
    a: `<p>Start with <strong>delivery</strong> contracts (box missions) or very low risk bounties. Hand mining is cheap to start. Avoid trading with your whole wallet until you know the routes. See the "Your First Missions & Money" chapter.</p>`
  },
  {
    q: 'What ship should I buy in game?',
    a: `<p>Decide what you enjoy first: rent a few ships for a day to try them. Pick a ship that fits that career (cargo, mining, combat) and that you can afford to claim and refuel. Upgrading your starter's components is also a great first step.</p>`
  },
  {
    q: 'Do I need to spend more money (pledge) to enjoy the game?',
    a: `<p>No. A Game Package with a starter ship is all you need. Everything else can be earned in game with aUEC. Extra pledges are optional support for development.</p>`
  },
  {
    q: 'What is a wipe?',
    a: `<p>A wipe resets in-game progress such as aUEC and items bought in game. Pledged ships stay on your account. Wipes don't happen every patch: the last full one was in 4.8, and 4.9 and 4.10 kept progress.</p>`
  },
  {
    q: 'How do I join an org?',
    a: `<p>Go to the RSI website, open <strong>Community &gt; Organizations</strong>, filter by what you like, and apply. Many orgs also have Discord servers where you can chat before joining.</p>`
  },
  {
    q: 'How do I report a bug?',
    a: `<p>Use the <strong>Issue Council</strong> on the RSI website. Search for your bug first and confirm it if someone already reported it, or create a new report with clear steps to reproduce.</p>`
  },
  {
    q: 'How does the referral bonus work?',
    a: `<p>Enter a player's referral code when you create your RSI account (a short grace period exists afterwards). As of the 2025 overhaul, you get 50,000 UEC. All valid codes give the same bonus.</p>`
  },
  {
    q: 'Why can\'t I fire my weapons?',
    a: `<p>You're probably in an <strong>armistice zone</strong> (cities, stations), or your ship is in <strong>NAV</strong> mode. Leave the zone and long-press <kbd>B</kbd> to switch to SCM.</p>`
  },
  {
    q: 'Why won\'t my quantum drive engage?',
    a: `<p>Check that you've set a route in the map (<kbd>F2</kbd>), that you're in NAV mode, that you're aligned with the route marker, that you have quantum fuel, and that you're not inside a "no quantum" zone near a city or station.</p>`
  },
  {
    q: 'My hangar doors won\'t open.',
    a: `<p>Request takeoff with <kbd>Left Alt</kbd> + <kbd>N</kbd> or through the Commlink. If that fails, store and retrieve the ship again at the ASOP terminal, or relog. Hangar bugs do happen in the alpha.</p>`
  },
  {
    q: 'Where do I respawn after logging out?',
    a: `<p>Usually where you logged out: your hab, your hangar or your ship's bed (if it has one). Logging out in a bed is safest.</p>`
  },
  {
    q: 'I am hungry and thirsty. What do I do?',
    a: `<p>Buy food and drink from vending machines, food stalls or shops, then eat or drink them via your inventory or interaction mode. Keep supplies in your ship.</p>`
  },
  {
    q: 'Can I play solo?',
    a: `<p>Yes. Most careers can be done alone. Playing with others is more fun and safer, but not required.</p>`
  }
];
