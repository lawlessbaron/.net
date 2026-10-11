// Star Citizen's recurring yearly events and sales.
// CIG doesn't publish a calendar in advance. "window" is when the event has usually run
// in past years ([month, day], 1-based). "dates" holds a specific year's dates once announced
// or reported; "status" says how sure we are. Update this file when RSI announces new dates.

export const events = [
  {
    id: 'red-festival', name: 'Red Festival', kind: ['In-game event', 'Sale', 'Free Fly'],
    window: [[1, 25], [2, 20]],
    summary: 'Lunar New Year celebration with red envelope rewards, themed items and ship sales. Often paired with a Free Fly.',
    dates: { 2026: { start: '2026-02-12', end: '2026-02-23', status: 'Took place', source: 'https://www.starcitizen-freefly.de/en/' } },
  },
  {
    id: 'coramor', name: 'Coramor', kind: ['In-game event', 'Sale'],
    window: [[2, 7], [2, 21]],
    summary: "The 'verse's Valentine's festival: romance-themed missions, decorations and gifting items.",
  },
  {
    id: 'stella-fortuna', name: 'Stella Fortuna', kind: ['In-game event', 'Sale'],
    window: [[3, 10], [3, 24]],
    summary: 'A luck-themed spring festival with green cosmetics and limited items.',
  },
  {
    id: 'invictus', name: 'Invictus Launch Week', kind: ['Free Fly', 'Sale', 'In-game event'],
    window: [[5, 20], [6, 4]],
    summary: 'The UEE Navy recruitment fleet week. Military ships are on display in game, many can be test-flown for free, and military-themed ships go on sale.',
  },
  {
    id: 'day-of-the-vara', name: 'Day of the Vara', kind: ['In-game event', 'Sale'],
    window: [[10, 24], [11, 3]],
    summary: 'Halloween in the \'verse: spooky event missions, masks and themed cosmetics, plus a sale on "villainous" ships.',
  },
  {
    id: 'citizencon', name: 'CitizenCon', kind: ['Convention'],
    window: [[10, 10], [10, 20]],
    summary: "CIG's yearly showcase of what's coming next for Star Citizen and Squadron 42, usually with a sale on newly revealed ships.",
    dates: { 2026: { start: '2026-10-28', end: '2026-10-30', status: 'Reported', note: 'Fan calendars report a Squadron 42 creator event instead of a full CitizenCon this year.', source: 'https://sc-calendar.de/' } },
  },
  {
    id: 'iae', name: 'Intergalactic Aerospace Expo (IAE)', kind: ['Free Fly', 'Sale', 'In-game event'],
    window: [[11, 14], [11, 28]],
    summary: 'The biggest ship show of the year. Every manufacturer gets a showroom, almost every flyable ship can be tried for free, and most ships, including limited ones, return to the pledge store.',
    dates: { 2026: { start: '2026-11-15', end: '2026-11-25', status: 'Expected', source: 'https://sc-calendar.de/' } },
  },
  {
    id: 'luminalia', name: 'Luminalia', kind: ['In-game event', 'Sale'],
    window: [[12, 15], [1, 5]],
    summary: 'Winter festival: gifting, festive decorations and holiday cosmetics.',
  },
];

export const tips = [
  'Free Fly events let anyone play without buying a game package. They usually happen during Invictus Launch Week and IAE.',
  'Want a limited ship? IAE is when most of them come back to the pledge store.',
  'Warbond listings are cheaper but must be paid with new money (no store credit).',
  'You never have to buy ships with real money. Everything sold in game can be earned with aUEC.',
];
